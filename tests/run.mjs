import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('.', import.meta.url));
const suites = readdirSync(directory).filter(name => /\.test\.(?:ts|mjs)$/.test(name)).sort();
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

let failed = false;
for (const [command, args] of [
  ...suites.map(name => [process.execPath, ['--import', 'tsx', join(directory, name)]]),
  [python, ['-B', join(directory, 'spotify_test.py')]],
]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
