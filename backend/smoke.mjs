import http from 'http';

const BASE = process.env.BASE_URL || 'http://localhost:3001';

function request(path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    http.get(url.toString(), (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const results: Record<string, { status: number; ok: boolean }> = {};

  try {
    const health = await request('/health');
    results.health = { status: health.status, ok: health.status === 200 && health.body.status === 'ok' };
  } catch (e: any) {
    results.health = { status: 0, ok: false };
  }

  try {
    const warmup = await request('/warmup');
    results.warmup = { status: warmup.status, ok: warmup.status === 200 };
  } catch (e: any) {
    results.warmup = { status: 0, ok: false };
  }

  console.log(JSON.stringify(results, null, 2));
  const allOk = Object.values(results).every((r) => r.ok);
  process.exit(allOk ? 0 : 1);
}

run();
