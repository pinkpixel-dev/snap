import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tauriCliPath = require.resolve('@tauri-apps/cli/tauri.js');

const env = { ...process.env };
if (process.platform === 'linux') {
  env.NO_STRIP = 'YES';
}

const userArgs = process.argv.slice(2);
const args = userArgs[0] === 'build' ? userArgs : ['build', ...userArgs];

const child = spawn(process.execPath, [tauriCliPath, ...args], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
