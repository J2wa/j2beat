import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { GEMINI_KEY_HEADER } from '../shared/geminiKey.ts';
import { DEFAULT_MODEL, GEMINI_NEON_MODEL, NEMOTRON_MODEL } from '../shared/models.ts';
import { modelAccess } from '../server/modelAccess.ts';
import { checkPaidGeminiKey, paidGeminiHeaders, setPaidGeminiKey } from '../src/services/paidGemini.ts';

const key = 'test-personal-key-12345';
let errorStatus = 0;
let listStatus = 0;
let checks = 0;
(globalThis as any).MockGemini = class {
  constructor(options: {apiKey: string}) {
    assert.equal(options.apiKey, key);
  }
  models = {
    get: async ({ model }: {model: string}) => {
      assert.equal(model, GEMINI_NEON_MODEL);
      checks++;
      if (errorStatus) throw Object.assign(new Error(key), {status:errorStatus});
      return { supportedActions:['generateContent'] };
    },
    list: async () => {
      if (listStatus) throw Object.assign(new Error(key), {status:listStatus});
      return [];
    },
  };
};
const url = new URL('../api/status.ts', import.meta.url);
const source = readFileSync(url,'utf8')
  .replace("import { GoogleGenAI } from '@google/genai';", 'const GoogleGenAI = globalThis.MockGemini;')
  .replace("import { requireSession } from '../server/auth.js';", "const requireSession = (req, res) => req.signedIn || (res.status(401).json({error:'Sign in.'}), false);")
  .replace(/from '(\.\.\/[^']+)\.js'/g, (_, path) => 'from ' + JSON.stringify(new URL(path + '.ts',url).href));
const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {default: status} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
function reply() {
  return {
    code: 200, data: {}, setHeader() {},
    status(code: number) { this.code = code; return this; },
    json(data: object) { this.data = data; return this; },
  };
}
assert.equal((await status({ method:'POST', headers:{[GEMINI_KEY_HEADER]:key} },reply()))?.code, undefined);
assert.equal(checks,0);

globalThis.fetch = async (input, options) => {
  assert.equal(input,'/api/status');
  assert.equal(options?.method,'POST');
  const result = reply();
  await status({signedIn:true, method:options?.method, headers:options?.headers},result);
  assert.ok(!JSON.stringify(result.data).includes(key));
  return Response.json(result.data, {status:result.code});
};

const signal = new AbortController().signal;
assert.deepEqual(await checkPaidGeminiKey(key,signal),{neon:true});
errorStatus = 404;
assert.deepEqual(await checkPaidGeminiKey(key,signal),{neon:false});
errorStatus = 403;
listStatus = 403;
await assert.rejects(checkPaidGeminiKey(key,signal), /Google rejected/);
await assert.rejects(checkPaidGeminiKey('bad',signal), /valid Gemini API key/);
setPaidGeminiKey(key);
assert.deepEqual(paidGeminiHeaders(GEMINI_NEON_MODEL),{[GEMINI_KEY_HEADER]:key});
assert.deepEqual(paidGeminiHeaders(NEMOTRON_MODEL),{});
assert.deepEqual(paidGeminiHeaders(DEFAULT_MODEL),{});
process.env.GEMINI_API_KEY = 'server-key';
const withKey = {headers: {[GEMINI_KEY_HEADER]:key}};
assert.deepEqual(modelAccess(withKey,reply(),DEFAULT_MODEL),{});
assert.deepEqual(modelAccess(withKey,reply(),GEMINI_NEON_MODEL),{geminiKey:key});
const missingKey = reply();
assert.equal(modelAccess({headers:{}},missingKey,GEMINI_NEON_MODEL),undefined);
assert.equal(missingKey.code,403);
setPaidGeminiKey();
assert.deepEqual(paidGeminiHeaders(GEMINI_NEON_MODEL),{});
console.log('Passed key validation, Neon capability lookup, session requirement, and credential clearing.');
