import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';

// MODE:
// - "vus" (default): ramp VUs (classic), best for quick smoke/perf checks.
// - "rps": ramp arrival-rate (requests per second), best for finding saturation and comparing 1 vs N replicas.
// - "constant": constant arrival-rate (fixed RPS), best for step tests (e.g., 600->1000->2000).
const mode = (__ENV.MODE || 'vus').toLowerCase();
const noReuse = (__ENV.NO_REUSE || '0') === '0';

// Request mix
const pageSize = Number(__ENV.PAGE_SIZE || 20);
const maxPage = Number(__ENV.MAX_PAGE || 10);
const detailRatio = Number(__ENV.DETAIL_RATIO || 0); // 0..1 (0 = list-only)

// SLO thresholds
const errorRate = Number(__ENV.ERROR_RATE || 0.01);
const p95Ms = Number(__ENV.P95_MS || 500);

// VU-mode settings
const maxVus = Number(__ENV.VUS || 150);
const duration = __ENV.DURATION || '6m';

// RPS-mode settings (arrival-rate)
const startRps = Number(__ENV.START_RPS || 50);
const midRps = Number(__ENV.MID_RPS || 150);
const maxRps = Number(__ENV.MAX_RPS || 300);
const ramp1 = __ENV.RAMP1 || '1m';
const ramp2 = __ENV.RAMP2 || '2m';
const hold = __ENV.HOLD || '3m';
const rampDown = __ENV.RAMPDOWN || '1m';
const preAllocatedVUs = Number(__ENV.PRE_ALLOCATED_VUS || 50);
const maxVUsRps = Number(__ENV.MAX_VUS || 500);

// Constant RPS mode (step tests)
const rps = Number(__ENV.RPS || 1000);
const preAlloc = Number(__ENV.PREALLOC || 200);
const maxVUsConstant = Number(__ENV.MAXVUS || 2000);

// Think time
const thinkTimeSeconds =
  __ENV.THINK_SECONDS !== undefined
    ? Number(__ENV.THINK_SECONDS)
    : mode === 'vus'
      ? 1
      : 0;

const transportErrors = new Counter('transport_errors');

export const options =
  mode === 'rps'
    ? {
        noConnectionReuse: noReuse,
        noVUConnectionReuse: noReuse,
        scenarios: {
          catalog_rps: {
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
            catalog_constant: {
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

function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArrayItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function setup() {
  if (detailRatio <= 0) {
    return { seedIds: [] };
  }

  const res = http.get(`${baseUrl}/products?page=0&size=50`, {
    timeout: '10s',
    tags: { name: 'GET /products' },
  });

  let ids = [];
  try {
    const content = res.json('content');
    if (Array.isArray(content)) {
      ids = content.map((p) => p?.id).filter((id) => typeof id === 'number');
    }
  } catch (_) {
    ids = [];
  }

  return { seedIds: ids };
}

export default function (data) {
  const page = maxPage > 0 ? randomIntInclusive(0, maxPage) : 0;

  const res = http.get(`${baseUrl}/products?page=${page}&size=${pageSize}`, {
    timeout: '10s',
    tags: { name: 'GET /products' },
  });

  const ok = check(res, {
    'no transport error': (r) => r.status !== 0,
    'status is 200': (r) => r.status === 200,
  });

  if (res.status === 0) {
    transportErrors.add(1, {
      error_code: String(res.error_code ?? 'unknown'),
      error: String(res.error ?? 'unknown'),
    });
  }

  if (ok && res.status === 200) {
    let hasContent = false;
    try {
      hasContent = Array.isArray(res.json('content'));
    } catch (_) {
      hasContent = false;
    }

    check(res, {
      'has page content': () => hasContent,
    });
  }

  if (detailRatio > 0 && Math.random() < detailRatio) {
    let candidateId = null;

    try {
      const items = res.json('content');
      if (Array.isArray(items) && items.length > 0) {
        candidateId = randomArrayItem(items)?.id ?? null;
      }
    } catch (_) {
      candidateId = null;
    }

    const seedIds = data && Array.isArray(data.seedIds) ? data.seedIds : [];
    if (candidateId === null && seedIds.length > 0) {
      candidateId = randomArrayItem(seedIds);
    }

    if (typeof candidateId === 'number') {
      const detailRes = http.get(`${baseUrl}/products/${candidateId}`, {
        timeout: '10s',
        tags: { name: 'GET /products/{id}' },
      });

      check(detailRes, {
        'detail status is 200': (r) => r.status === 200,
      });
    }
  }

  if (thinkTimeSeconds > 0) {
    sleep(thinkTimeSeconds);
  }
}
