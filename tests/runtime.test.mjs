import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

// Compile without a bundler or tsx resolver, as the deployed Node function runs.
const root = mkdtempSync(new URL('../.runtime-test-', import.meta.url).pathname);
try {
  const files = ['src/constants.ts', 'src/knowledgeBase.ts',
    ...['api', 'server', 'shared'].flatMap(dir => readdirSync(new URL('../'+dir, import.meta.url))
      .filter(file => file.endsWith('.ts')).map(file => dir+'/'+file))];
  for (const file of files) {
    const output = join(root, file.replace(/\.ts$/, '.js'));
    mkdirSync(join(output, '..'), { recursive: true });
    writeFileSync(output, ts.transpileModule(readFileSync(new URL('../'+file, import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  }
  const check = spawnSync(process.execPath, ['--input-type=module', '-e',
    "const {default: handler} = await import("+JSON.stringify(join(root, 'api/annotate.js'))+"); if(typeof handler !== 'function') throw Error('Missing API handler');"],
    { encoding: 'utf8', env: {...process.env, NODE_OPTIONS:''} });
  assert.equal(check.status, 0, check.stderr);
  console.log('Passed compiled API import under native Node ESM.');
} finally { rmSync(root, { recursive: true, force: true }); }
