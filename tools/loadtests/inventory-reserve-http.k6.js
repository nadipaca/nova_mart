import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
// k6 `open()` resolves relative to the script file location, so keep this path local to this folder by default.
const payloadPath = __ENV.PAYLOAD_PATH || './inventory-order-placed.json';
const payload = open(payloadPath);

// MODE:
// - "vus" (default): ramp VUs.
// - "rps": ramp arrival-rate (RPS).
// - "constant": constant arrival-rate (fixed RPS).
const mode = (__ENV.MODE || 'vus').toLowerCase();
const noReuse = (__ENV.NO_REUSE || '0') === '1';

// SLO thresholds
const errorRate = Number(__ENV.ERROR_RATE || 0.01);
const p95Ms = Number(__ENV.P95_MS || 1000);

// Think time (VU mode defaults to 1s, arrival-rate defaults to 0)
const thinkTimeSeconds =
  __ENV.THINK_SECONDS !== undefined
    ? Number(__ENV.THINK_SECONDS)
    : mode === 'vus'
      ? 1
      : 0;

// VU-mode settings
const maxVus = Number(__ENV.VUS || 150);
const duration = __ENV.DURATION || '6m';

// Ramping RPS settings
const startRps = Number(__ENV.START_RPS || 50);
const midRps = Number(__ENV.MID_RPS || 150);
const maxRps = Number(__ENV.MAX_RPS || 500);
const ramp1 = __ENV.RAMP1 || '1m';
const ramp2 = __ENV.RAMP2 || '2m';
const hold = __ENV.HOLD || '3m';
const rampDown = __ENV.RAMPDOWN || '1m';
const preAllocatedVUs = Number(__ENV.PRE_ALLOCATED_VUS || 50);
const maxVUsRps = Number(__ENV.MAX_VUS || 2000);

// Constant RPS mode settings
const rps = Number(__ENV.RPS || 200);
const preAlloc = Number(__ENV.PREALLOC || 200);
const maxVUsConstant = Number(__ENV.MAXVUS || 4000);

const transportErrors = new Counter('transport_errors');

// Treat 409 (conflict/out-of-stock) as an expected response so it doesn't count towards http_req_failed.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 409));

export const options =
  mode === 'rps'
    ? {
        noConnectionReuse: noReuse,
        noVUConnectionReuse: noReuse,
        scenarios: {
          inventory_http_rps: {
            executor: 'ramping-arrival-rate',
            timeUnit: '1s',
            startRate: startRps,
            preAllocatedVUs,
            maxVUs: maxVUsRps,
            stages: [
              { duration: ramp1, target: midRps },
              { duration: ramp2, target: maxRps },
              { duration: hold, target: maxRps },
              { duration: rampDown, target: 0 },
            ],
            gracefulStop: '30s',
          },
        },
        thresholds: {
          http_req_failed: [`rate<${errorRate}`],
          http_req_duration: [`p(95)<${p95Ms}`],
        },
      }
    : mode === 'constant'
      ? {
          noConnectionReuse: noReuse,
          noVUConnectionReuse: noReuse,
          scenarios: {
            inventory_http_constant: {
              executor: 'constant-arrival-rate',
              rate: rps,
              timeUnit: '1s',
              duration: duration,
              preAllocatedVUs: preAlloc,
              maxVUs: maxVUsConstant,
              gracefulStop: '30s',
            },
          },
          thresholds: {
            http_req_failed: [`rate<${errorRate}`],
            http_req_duration: [`p(95)<${p95Ms}`],
          },
        }
      : {
          noConnectionReuse: noReuse,
          noVUConnectionReuse: noReuse,
          stages: [
            { duration: '1m', target: Math.ceil(maxVus * 0.2) },
            { duration: '3m', target: Math.ceil(maxVus * 0.5) },
            { duration: duration, target: maxVus },
            { duration: '1m', target: 0 },
          ],
          thresholds: {
            http_req_failed: [`rate<${errorRate}`],
            http_req_duration: [`p(95)<${p95Ms}`],
          },
        };

export default function () {
  const res = http.post(`${baseUrl}/inventory/reserve`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
    tags: { name: 'POST /inventory/reserve' },
  });

  const ok = check(res, {
    'no transport error': (r) => r.status !== 0,
    'status is 200/409': (r) => r.status === 200 || r.status === 409,
  });

  if (!ok && res.status === 0) {
    transportErrors.add(1, {
      error_code: String(res.error_code ?? 'unknown'),
      error: String(res.error ?? 'unknown'),
    });
  }

  if (thinkTimeSeconds > 0) {
    sleep(thinkTimeSeconds);
  }
}
