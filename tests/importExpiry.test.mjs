import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { IMPORT_LIFETIME_MS, importedAudioExpiresAt } from '../shared/importExpiry.ts';

const now = Date.now();
const path = n => `music/${String(n).padStart(36, '0')}.mp3`;
const deleted = [];
const listed = [];
const mockBlob = {
  list: async options => {
    listed.push(options);
    return options.cursor
      ? { blobs: [{ pathname: path(4), uploadedAt: new Date(now - IMPORT_LIFETIME_MS - 1000) }], hasMore: false }
      : {
        blobs: [
          { pathname: path(1), uploadedAt: new Date(now - IMPORT_LIFETIME_MS) },
          { pathname: path(2), uploadedAt: new Date(now - IMPORT_LIFETIME_MS + 60_000) },
          { pathname: 'music/keep.mp3', uploadedAt: new Date(0) },
          { pathname: 'audio/other.mp3', uploadedAt: new Date(0) },
        ],
        cursor: 'next-page',
        hasMore: true,
      };
  },
  del: async paths => { deleted.push(...paths); },
};
globalThis.expiryTestBlob = mockBlob;

const source = (await readFile(new URL('../api/expire-imports.ts', import.meta.url), 'utf8'))
  .replace("import { del, list } from '@vercel/blob';", 'const { del, list } = globalThis.expiryTestBlob;')
  .replace('../shared/importExpiry.js', new URL('../shared/importExpiry.ts', import.meta.url).href);
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { default: cleanup } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

function response() {
  return {
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

process.env.CRON_SECRET = 'test-cleanup-secret';
assert.equal(importedAudioExpiresAt(new Date(now)), now + IMPORT_LIFETIME_MS);
const denied = await cleanup({ method: 'GET', headers: {} }, response());
assert.equal(denied.code, 401);
assert.equal(listed.length, 0);

const accepted = await cleanup({ method: 'GET', headers: { authorization: 'Bearer test-cleanup-secret' } }, response());
assert.equal(accepted.code, 200);
assert.deepEqual(accepted.body, { deleted: 2 });
assert.deepEqual(deleted, [path(1), path(4)]);
assert.equal(listed[0].prefix, 'music/');
assert.equal(listed[1].cursor, 'next-page');

let canceled = false;
mockBlob.get = async () => ({
  statusCode: 200,
  blob: { uploadedAt: new Date(now - IMPORT_LIFETIME_MS) },
  stream: { cancel: async () => { canceled = true; } },
});
const audioSource = (await readFile(new URL('../api/audio.ts', import.meta.url), 'utf8'))
  .replace("import { requireSession } from '../server/auth.js';", 'const requireSession = () => true;')
  .replace("import { get, del } from '@vercel/blob';", 'const { get, del } = globalThis.expiryTestBlob;')
  .replace('../shared/importExpiry.js', new URL('../shared/importExpiry.ts', import.meta.url).href);
const audioJs = ts.transpileModule(audioSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { default: serveAudio } = await import('data:text/javascript;base64,' + Buffer.from(audioJs).toString('base64'));
const expired = await serveAudio({ method: 'GET', query: { path: path(1) } }, response());
assert.equal(expired.code, 410);
assert.equal(canceled, true);
