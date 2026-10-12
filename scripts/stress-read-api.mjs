const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const resultElectionId = process.env.RESULTS_ELECTION_ID ?? '2';
const turnoutConstituencyId = process.env.TURNOUT_CONSTITUENCY_ID ?? '1';
const turnoutElectionId = process.env.TURNOUT_ELECTION_ID ?? '1';
const totalRequests = 5000;
const concurrency = 50;
const timeoutMs = 15000;

const endpoints = [
  { name: 'elections', path: '/api/elections' },
  { name: 'candidates', path: '/api/candidates' },
  { name: 'results', path: `/api/elections/${resultElectionId}/results` },
  {
    name: 'turnout',
    path: `/api/turnout/${turnoutConstituencyId}?electionId=${turnoutElectionId}`,
  },
];

const target = new URL(baseUrl);
if (!['http:', 'https:'].includes(target.protocol)) {
  throw new Error('BASE_URL must use http or https');
}

const samples = [];
let nextRequest = 0;
const startedAt = performance.now();

async function worker() {
  while (true) {
    const index = nextRequest++;
    if (index >= totalRequests) return;

    const endpoint = endpoints[index % endpoints.length];
    const requestStartedAt = performance.now();

    try {
      const response = await fetch(new URL(endpoint.path, target), {
        signal: AbortSignal.timeout(timeoutMs),
      });
      await response.arrayBuffer();
      samples.push({
        endpoint: endpoint.name,
        status: response.status,
        durationMs: performance.now() - requestStartedAt,
      });
    } catch (error) {
      samples.push({
        endpoint: endpoint.name,
        status: 0,
        durationMs: performance.now() - requestStartedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const elapsedMs = performance.now() - startedAt;
const sortedDurations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
const percentile = (values, fraction) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
};

function summarize(rows) {
  const statuses = {};
  for (const { status } of rows) statuses[status] = (statuses[status] ?? 0) + 1;

  const durations = rows.map((row) => row.durationMs);
  return {
    requests: rows.length,
    statuses,
    latencyMs: {
      p50: +percentile(durations, 0.5).toFixed(1),
      p95: +percentile(durations, 0.95).toFixed(1),
      max: +Math.max(0, ...durations).toFixed(1),
    },
  };
}

const failures = samples.filter((sample) => sample.status < 200 || sample.status >= 300);
const report = {
  target: target.origin,
  requests: samples.length,
  concurrency,
  durationSeconds: +(elapsedMs / 1000).toFixed(2),
  requestsPerSecond: +(samples.length / (elapsedMs / 1000)).toFixed(2),
  statusCounts: summarize(samples).statuses,
  failures: failures.length,
  latencyMs: {
    p50: +percentile(sortedDurations, 0.5).toFixed(1),
    p95: +percentile(sortedDurations, 0.95).toFixed(1),
    max: +Math.max(0, ...sortedDurations).toFixed(1),
  },
  byEndpoint: Object.fromEntries(
    endpoints.map(({ name, path }) => [
      `${name} (${path})`,
      summarize(samples.filter((sample) => sample.endpoint === name)),
    ])
  ),
};

console.log(JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(
    'Failure samples:',
    JSON.stringify(
      failures.slice(0, 10).map(({ endpoint, status, error }) => ({
        endpoint,
        status,
        error,
      })),
      null,
      2
    )
  );
  process.exitCode = 1;
}
