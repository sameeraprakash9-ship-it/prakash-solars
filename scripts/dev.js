const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const dataPath = path.join(backend, '.local-mongodb-data');
const port = 27018;
const replicaSet = 'sunwise-dev';
const apiUrl = 'http://127.0.0.1:5000/api';
const mongoUri = `mongodb://127.0.0.1:${port}/solar_trading?replicaSet=${replicaSet}`;
const dotenv = require(require.resolve('dotenv', { paths: [backend] }));

dotenv.config({ path: path.join(backend, '.env') });

const children = [];
let shuttingDown = false;
let mongoChild = null;
let MongoClientClass = null;

function ensureLocalEnvironment() {
  const envPath = path.join(backend, '.env');
  dotenv.config({ path: envPath, quiet: true });

  const defaults = {
    PORT: '5000',
    NODE_ENV: 'development',
    MONGO_URI: `mongodb://127.0.0.1:${port}/solar_trading?replicaSet=${replicaSet}`,
    CLIENT_URL: 'http://localhost:5173,http://127.0.0.1:5173'
  };
  const additions = [];
  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
      additions.push(`${key}=${value}`);
    }
  }
  for (const key of ['JWT_SECRET', 'DEMO_PASSWORD']) {
    if (!process.env[key]) {
      process.env[key] = crypto.randomBytes(36).toString('base64url');
      additions.push(`${key}=${process.env[key]}`);
    }
  }
  if (additions.length) {
    fs.mkdirSync(backend, { recursive: true });
    fs.appendFileSync(envPath, `${additions.join('\n')}\n`, 'utf8');
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function findMongoServer() {
  if (process.env.MONGOD_PATH && fs.existsSync(process.env.MONGOD_PATH)) {
    return process.env.MONGOD_PATH;
  }

  const candidates = [];
  if (process.env.ProgramFiles) {
    const versions = path.join(process.env.ProgramFiles, 'MongoDB', 'Server');
    if (fs.existsSync(versions)) {
      for (const version of fs.readdirSync(versions)) {
        candidates.push(path.join(versions, version, 'bin', 'mongod.exe'));
      }
    }
  }
  candidates.push('/usr/bin/mongod', '/usr/local/bin/mongod');

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const lookup = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    ['mongod'],
    { encoding: 'utf8', windowsHide: true }
  );
  const found = lookup.status === 0 ? lookup.stdout.trim().split(/\r?\n/)[0] : '';
  if (found && fs.existsSync(found)) return found;

  throw new Error(
    'MongoDB Server was not found. Install MongoDB Community Server or set MONGOD_PATH to mongod.exe.'
  );
}

function startProcess(command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: 'inherit',
    windowsHide: true
  });
  children.push(child);
  child.once('error', error => {
    console.error(`Could not start ${options.label}: ${error.message}`);
    void shutdown(1);
  });
  child.once('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`${options.label} stopped${signal ? ` (${signal})` : ` (exit ${code})`}.`);
      void shutdown(code || 1);
    }
  });
  return child;
}

async function isPortOpen() {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', error => {
      socket.destroy();
      if (error.code === 'ECONNREFUSED') resolve(false);
      else reject(error);
    });
  });
}

async function prepareReplicaSet() {
  if (await isPortOpen()) {
    throw new Error(
      `Port ${port} is already in use. Stop the other service on that port before starting Sunwise.`
    );
  }

  fs.mkdirSync(dataPath, { recursive: true });
  const mongod = findMongoServer();
  const mongoLog = path.join(dataPath, 'mongod.log');
  console.log(`Starting an isolated local MongoDB replica set at ${dataPath}`);
  const database = startProcess(mongod, [
    '--dbpath', dataPath,
    '--bind_ip', '127.0.0.1',
    '--port', String(port),
    '--replSet', replicaSet,
    '--logpath', mongoLog,
    '--logappend',
    '--quiet'
  ], { cwd: root, env: process.env, label: 'Local MongoDB' });
  mongoChild = database;

  const { MongoClient } = require(require.resolve('mongodb', { paths: [backend] }));
  MongoClientClass = MongoClient;
  const directUri = `mongodb://127.0.0.1:${port}/?directConnection=true`;
  let client;
  let started = false;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (database.exitCode !== null) {
      throw new Error(`The local MongoDB server exited before it was ready. See ${mongoLog}.`);
    }
    try {
      client = new MongoClient(directUri, { serverSelectionTimeoutMS: 1000 });
      await client.connect();
      started = true;
      break;
    } catch {
      if (client) await client.close().catch(() => {});
      client = null;
      await delay(500);
    }
  }

  if (!started) {
    throw new Error(`MongoDB did not start. See ${mongoLog}.`);
  }

  try {
    const admin = client.db('admin');
    const hello = await admin.command({ hello: 1 });
    if (!hello.setName) {
      await admin.command({
        replSetInitiate: {
          _id: replicaSet,
          members: [{ _id: 0, host: `127.0.0.1:${port}` }]
        }
      });
    } else if (hello.setName !== replicaSet) {
      throw new Error(`MongoDB on port ${port} belongs to replica set "${hello.setName}".`);
    }

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const status = await admin.command({ hello: 1 });
      if (status.isWritablePrimary) {
        console.log('Local MongoDB replica set is ready.');
        return;
      }
      await delay(500);
    }
    throw new Error('MongoDB replica set did not elect a primary.');
  } finally {
    await client.close();
  }
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (child !== mongoChild && child.exitCode === null && !child.killed) child.kill();
  }

  if (mongoChild?.exitCode === null && MongoClientClass) {
    const client = new MongoClientClass(
      `mongodb://127.0.0.1:${port}/?directConnection=true`,
      { serverSelectionTimeoutMS: 2000 }
    );
    try {
      await client.connect();
      await client.db('admin').command({ shutdown: 1 });
    } catch (error) {
      if (!['MongoNetworkError', 'MongoServerSelectionError'].includes(error.name) &&
          error.code !== 'ECONNRESET') {
        console.error(`Could not shut down local MongoDB cleanly: ${error.message}`);
      }
    } finally {
      await client.close();
    }
    if (mongoChild.exitCode === null) {
      await Promise.race([
        new Promise(resolve => mongoChild.once('exit', resolve)),
        delay(5000)
      ]);
    }
  }

  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
  process.exit(exitCode);
}

process.once('SIGINT', () => void shutdown(0));
process.once('SIGTERM', () => void shutdown(0));

async function main() {
  ensureLocalEnvironment();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The local development launcher cannot run with NODE_ENV=production.');
  }

  const currentEnv = process.env;
  await prepareReplicaSet();

  const localEnv = {
    ...currentEnv,
    NODE_ENV: 'development',
    MONGO_URI: mongoUri,
    JWT_SECRET: currentEnv.JWT_SECRET,
    DEMO_PASSWORD: currentEnv.DEMO_PASSWORD
  };

  console.log('Preparing demo accounts and platform settings...');
  const seed = spawn(process.execPath, ['scripts/seedDemo.js'], {
    cwd: backend,
    env: localEnv,
    stdio: 'inherit',
    windowsHide: true
  });
  const seedResult = await new Promise((resolve, reject) => {
    seed.once('error', reject);
    seed.once('exit', (code, signal) => resolve({ code, signal }));
  });
  if (seedResult.code !== 0) {
    throw new Error(`Local demo setup failed${seedResult.signal ? ` (${seedResult.signal})` : ''}.`);
  }

  console.log('Starting Sunwise API at http://127.0.0.1:5000');
  startProcess(process.execPath, ['server.js'], {
    cwd: backend,
    env: { ...localEnv, PORT: '5000', CLIENT_URL: 'http://localhost:5173,http://127.0.0.1:5173' },
    label: 'Sunwise API'
  });

  const vite = path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(vite)) {
    throw new Error('Frontend dependencies are not installed. Run npm install in frontend/.');
  }
  console.log('Starting Sunwise client at http://127.0.0.1:5173');
  startProcess(process.execPath, [vite, '--host', '127.0.0.1'], {
    cwd: frontend,
    env: { ...localEnv, VITE_API_URL: apiUrl },
    label: 'Sunwise client'
  });
  console.log('Create an account with your own email at http://127.0.0.1:5173/register');
  console.log('Demo accounts: admin@sunwise.test, consumer@sunwise.test, prosumer@sunwise.test');
  console.log(`Their local-only password is: ${localEnv.DEMO_PASSWORD}`);
}

main().catch(error => {
  console.error(`Unable to start Sunwise: ${error.message}`);
  void shutdown(1);
});
