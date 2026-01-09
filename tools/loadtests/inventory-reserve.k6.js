import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import crypto from 'k6/crypto';

// Targets:
// - LocalStack via host port: http://localhost:4566
// - LocalStack via docker network: http://novamart-localstack:4566
const baseUrl = __ENV.BASE_URL || 'http://localhost:4566';
const functionName = __ENV.FUNCTION_NAME || 'novamart-inventory-handler';
const awsRegion = __ENV.AWS_REGION || 'us-east-2';
const accessKeyId = __ENV.AWS_ACCESS_KEY_ID || 'test';
const secretAccessKey = __ENV.AWS_SECRET_ACCESS_KEY || 'test';

// k6 `open()` resolves relative to the script location by default.
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
const p95Ms = Number(__ENV.P95_MS || 500);

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

function sha256Hex(data) {
  return crypto.sha256(data, 'hex');
}

function hmacSha256(key, msg, outputEncoding) {
  return crypto.hmac('sha256', msg, key, outputEncoding);
}

function toAmzDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  const second = pad(date.getUTCSeconds());
  return {
    amzDate: `${year}${month}${day}T${hour}${minute}${second}Z`,
    dateStamp: `${year}${month}${day}`,
  };
}

function getHostFromBaseUrl(url) {
  const withoutProto = url.replace(/^https?:\/\//, '');
  return withoutProto.split('/')[0];
}

function signAwsRequest({ method, canonicalUri, host, payloadBody }) {
  const now = new Date();
  const { amzDate, dateStamp } = toAmzDate(now);
  const payloadHash = sha256Hex(payloadBody);

  const canonicalHeaders = `host:${host}\n` + `x-amz-date:${amzDate}\n` + `x-amz-content-sha256:${payloadHash}\n`;
  const signedHeaders = 'host;x-amz-date;x-amz-content-sha256';
  const canonicalRequest =
    `${method}\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${awsRegion}/lambda/aws4_request`;
  const stringToSign =
    `${algorithm}\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp, 'binary');
  const kRegion = hmacSha256(kDate, awsRegion, 'binary');
  const kService = hmacSha256(kRegion, 'lambda', 'binary');
  const kSigning = hmacSha256(kService, 'aws4_request', 'binary');
  const signature = hmacSha256(kSigning, stringToSign, 'hex');

  const authorization =
    `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Content-Type': 'application/json',
    Host: host,
    'X-Amz-Date': amzDate,
    'X-Amz-Content-Sha256': payloadHash,
    Authorization: authorization,
  };
}

export const options =
  mode === 'rps'
    ? {
        noConnectionReuse: noReuse,
        noVUConnectionReuse: noReuse,
        scenarios: {
          inventory_rps: {
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
            inventory_constant: {
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
  const canonicalUri = `/2015-03-31/functions/${functionName}/invocations`;
  const host = getHostFromBaseUrl(baseUrl);
  const url = `${baseUrl}${canonicalUri}`;
  const headers = signAwsRequest({ method: 'POST', canonicalUri, host, payloadBody: payload });

  const res = http.post(url, payload, {
    timeout: '30s',
    headers,
    tags: { name: 'POST lambda invoke (inventory)' },
  });

  const ok = check(res, {
    'no transport error': (r) => r.status !== 0,
    'status is 200': (r) => r.status === 200,
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
