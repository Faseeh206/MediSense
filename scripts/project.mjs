import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');
const windows = process.platform === 'win32';
const python = join(backend, '.venv', windows ? 'Scripts/python.exe' : 'bin/python');
const vite = join(frontend, 'node_modules/vite/bin/vite.js');
const action = process.argv[2];

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) throw new Error(`Could not start ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Command did not complete successfully (${result.status ?? result.signal}).`);
}

function npm(args, cwd = frontend) {
  // npm supplies this path on Windows, macOS and Linux, including paths with spaces.
  const cli = process.env.npm_execpath;
  if (!cli || !existsSync(cli)) throw new Error('Run this helper through npm, for example: npm run setup');
  run(process.execPath, [cli, ...args], cwd);
}

function supportedPython(command, prefix = []) {
  const result = spawnSync(command, [...prefix, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], { encoding: 'utf8' });
  if (result.status !== 0) return false;
  const [major, minor] = result.stdout.trim().split('.').map(Number);
  return major === 3 && minor >= 11;
}

function requireInstall() {
  if (!existsSync(python) || !existsSync(vite)) throw new Error('Dependencies are missing. Run npm run setup first.');
  if (!existsSync(join(backend, '.env'))) throw new Error('Missing backend/.env. Run npm run setup or copy backend/.env.example.');
}

function setup() {
  if (!existsSync(python)) {
    const args = process.argv.slice(3);
    if (args.length && (args.length !== 2 || args[0] !== '--python')) throw new Error('Usage: npm run setup -- --python /path/to/python');
    const candidates = args.length ? [[args[1], []]] : windows ? [['py', ['-3']], ['python', []], ['python3', []]] : [['python3', []], ['python', []]];
    const selected = candidates.find(([command, prefix]) => supportedPython(command, prefix));
    if (!selected) throw new Error('Python 3.11+ with pip and venv is required. Install it, reopen the terminal and rerun setup.');
    run(selected[0], [...selected[1], '-m', 'venv', join(backend, '.venv')]);
  }
  if (!supportedPython(python)) throw new Error('backend/.venv needs Python 3.11+. Recreate only that environment and rerun setup.');
  run(python, ['-m', 'pip', 'install', '-r', join(backend, 'requirements.txt')]);
  npm(['ci', '--no-audit', '--no-fund']);
  if (!existsSync(join(backend, '.env'))) {
    copyFileSync(join(backend, '.env.example'), join(backend, '.env'));
    console.log('Created backend/.env. Add your API key privately to enable real document analysis.');
  } else {
    console.log('Kept your existing backend/.env.');
  }
  console.log('Setup complete. Run npm start, then open http://127.0.0.1:8000');
}

function freePort(port) {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`Port ${port} is unavailable. Stop the existing server, then try again.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(resolvePort));
  });
}

function serve(development, apiPort = 8000) {
  const children = new Set();
  let stopping = false;
  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    for (const child of children) {
      if (!child.pid || child.exitCode !== null) continue;
      if (windows) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      else {
        try { process.kill(-child.pid, 'SIGTERM'); }
        catch { child.kill('SIGTERM'); }
      }
    }
  };
  const launch = (command, args, cwd) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env, detached: !windows });
    children.add(child);
    child.once('error', error => { console.error(error.message); stop(1); });
    child.once('exit', code => {
      children.delete(child);
      if (!stopping) stop(code ?? 1);
    });
  };
  process.once('SIGINT', () => stop(0));
  process.once('SIGTERM', () => stop(0));
  const apiArgs = ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(apiPort)];
  if (development) apiArgs.push('--reload');
  launch(python, apiArgs, backend);
  if (development) launch(process.execPath, [vite, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], frontend);
  console.log(`MediSense: http://127.0.0.1:${development ? 5173 : apiPort} (Ctrl+C to stop)`);
}

try {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) throw new Error('Node.js 22.12+ is required. Node.js 24 LTS is recommended.');
  if (action === 'setup') setup();
  else if (action === 'start' || action === 'dev') {
    const args = process.argv.slice(3);
    let port = 8000;
    if (args.length) {
      if (action !== 'start' || args.length !== 2 || args[0] !== '--port' || !/^\d+$/.test(args[1])) throw new Error('To select a port, use npm start -- --port 8001');
      port = Number(args[1]);
      if (port < 1 || port > 65535) throw new Error('The port must be between 1 and 65535.');
    }
    requireInstall();
    await freePort(port);
    if (action === 'dev') await freePort(5173);
    else npm(['run', 'build']);
    serve(action === 'dev', port);
  } else throw new Error('Use npm run setup, npm start, or npm run dev.');
} catch (error) {
  console.error(`MediSense: ${error.message}`);
  process.exitCode = 1;
}
