const http = require('http');
const https = require('https');

const FRONTEND = process.env.FRONTEND_URL || 'https://modliq.vercel.app';
const BACKEND = process.env.BACKEND_URL || 'https://modliq-1.onrender.com';
const ML = process.env.ML_URL || 'https://modliq.onrender.com';

function request(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function requestPost(url, payload) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const body = JSON.stringify(payload);
    const options = {
      hostname: new URL(url).hostname,
      path: new URL(url).pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  const results = [];

  try {
    const r = await request(`${FRONTEND}/`);
    results.push({ name: 'frontend_root', status: r.status, ok: r.status === 200 });
  } catch (e) {
    results.push({ name: 'frontend_root', status: 0, ok: false });
  }

  try {
    const r = await request(`${BACKEND}/health`);
    const ok = r.status === 200 && r.body.includes('ok');
    results.push({ name: 'backend_health', status: r.status, ok });
  } catch (e) {
    results.push({ name: 'backend_health', status: 0, ok: false });
  }

  try {
    const r = await request(`${BACKEND}/warmup`);
    results.push({ name: 'backend_warmup', status: r.status, ok: r.status === 200 });
  } catch (e) {
    results.push({ name: 'backend_warmup', status: 0, ok: false });
  }

  try {
    const r = await request(`${ML}/`);
    results.push({ name: 'ml_root', status: r.status, ok: r.status === 200 });
  } catch (e) {
    results.push({ name: 'ml_root', status: 0, ok: false });
  }

  try {
    const r = await request(`${ML}/health`);
    results.push({ name: 'ml_health', status: r.status, ok: r.status === 200 });
  } catch (e) {
    results.push({ name: 'ml_health', status: 0, ok: false });
  }

  try {
    const r = await request(`${ML}/warmup`);
    results.push({ name: 'ml_warmup', status: r.status, ok: r.status === 200 });
  } catch (e) {
    results.push({ name: 'ml_warmup', status: 0, ok: false });
  }

  try {
    const r = await requestPost(`${ML}/parse-goal`, {
      goal_text: 'maximize yield',
      columns: ['yield', 'temperature'],
    });
    const ok = r.status === 401;
    results.push({ name: 'ml_auth_401', status: r.status, ok });
  } catch (e) {
    results.push({ name: 'ml_auth_401', status: 0, ok: false });
  }

  try {
    const r = await request(`${BACKEND}/api/v1/datasets/some-id/preview`);
    const ok = r.status === 401;
    results.push({ name: 'backend_auth_401', status: r.status, ok });
  } catch (e) {
    results.push({ name: 'backend_auth_401', status: 0, ok: false });
  }

  console.log(JSON.stringify(results, null, 2));
  const allOk = results.every((r) => r.ok);
  process.exit(allOk ? 0 : 1);
}

run();
