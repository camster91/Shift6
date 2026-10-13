import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ServiceError, createGeminiAdapter, validateRequest } from './adapter.mjs';
import {
  SHIFT6_API_PROTOCOL_HEADER,
  SHIFT6_API_PROTOCOL_VERSION,
  SHIFT6_MIN_API_PROTOCOL_HEADER,
} from './build/apiProtocol.mjs';

export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

export function readConfiguration(env = process.env) {
  const enabled = env.SHIFT6_GEMINI_ENABLED === 'true';
  if (!enabled) return { enabled: false };
  const credentials = JSON.parse(env.SHIFT6_COACH_TOKEN_HASHES ?? '[]');
  if (!Array.isArray(credentials) || !credentials.length || credentials.length > 20)
    throw new Error('invalid-pairing-configuration');
  const hashes = new Set();
  for (const entry of credentials) {
    if (
      !entry ||
      Object.keys(entry).some((key) => !['sha256', 'expiresAt'].includes(key)) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      hashes.has(entry.sha256) ||
      typeof entry.expiresAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.expiresAt) ||
      !Number.isFinite(Date.parse(entry.expiresAt))
    )
      throw new Error('invalid-pairing-configuration');
    hashes.add(entry.sha256);
  }
  if (!env.GEMINI_API_KEY || !/^[a-z0-9][a-z0-9.-]{1,100}$/.test(env.GEMINI_MODEL ?? ''))
    throw new Error('invalid-provider-configuration');
  return { enabled, credentials, apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL };
}

export function createCoachServer({
  configuration,
  adapter,
  now = Date.now,
  perMinute = 3,
  perDay = 20,
  globalPerDay = 100,
  maxConcurrent = 2,
}) {
  if (
    ![perMinute, perDay, globalPerDay, maxConcurrent].every(
      (value) => Number.isInteger(value) && value >= 1 && value <= 1000,
    )
  )
    throw new Error('invalid-service-limits');
  const counts = new Map();
  let busy = 0;
  const send = (response, status, value) => {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      [SHIFT6_MIN_API_PROTOCOL_HEADER]: String(SHIFT6_API_PROTOCOL_VERSION),
    });
    response.end(JSON.stringify(value));
  };
  function quota(hash) {
    const timestamp = now();
    const day = Math.floor(timestamp / 86400000),
      minute = Math.floor(timestamp / 60000);
    for (const [key, entry] of counts) if (entry.day !== day) counts.delete(key);
    const entry = counts.get(hash) ?? { day, minute, dayCount: 0, minuteCount: 0 };
    if (entry.minute !== minute) {
      entry.minute = minute;
      entry.minuteCount = 0;
    }
    const global = counts.get('global') ?? { day, dayCount: 0 };
    if (
      entry.minuteCount >= perMinute ||
      entry.dayCount >= perDay ||
      global.dayCount >= globalPerDay ||
      busy >= maxConcurrent
    )
      throw new ServiceError(429, 'service-quota');
    entry.minuteCount++;
    entry.dayCount++;
    global.dayCount++;
    counts.set(hash, entry);
    counts.set('global', global);
  }
  const server = createServer(async (request, response) => {
    let acquired = false;
    const cancellation = new AbortController();
    response.on('close', () => {
      if (!response.writableEnded) cancellation.abort();
    });
    try {
      if (request.method === 'GET' && request.url === '/healthz')
        return send(response, 200, { status: 'ok', providerEnabled: configuration.enabled });
      if (request.method !== 'POST' || request.url !== '/v1/coach/message')
        throw new ServiceError(404, 'unsupported-route');
      if (!configuration.enabled) return send(response, 503, { error: 'provider-disabled' });
      const authorization = request.headers.authorization ?? '';
      const token = /^Bearer ([A-Za-z0-9_-]{43,256})$/.exec(authorization)?.[1];
      const hash = token ? tokenHash(token) : '0'.repeat(64);
      let paired = false;
      for (const entry of configuration.credentials) {
        const matches = timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(entry.sha256, 'hex'));
        if (token && matches && Date.parse(entry.expiresAt) > now()) paired = true;
      }
      if (!paired) throw new ServiceError(401, 'pairing-required');
      if (
        request.headers[SHIFT6_API_PROTOCOL_HEADER.toLowerCase()] !==
        String(SHIFT6_API_PROTOCOL_VERSION)
      )
        throw new ServiceError(409, 'protocol-mismatch');
      if (request.headers['content-type'] !== 'application/json')
        throw new ServiceError(415, 'json-required');
      if (Number(request.headers['content-length'] ?? 0) > 8192)
        throw new ServiceError(413, 'context-too-large');
      let size = 0;
      const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 8192) throw new ServiceError(413, 'context-too-large');
        chunks.push(chunk);
      }
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        throw new ServiceError(400, 'invalid-json');
      }
      const validated = validateRequest(payload);
      quota(hash);
      busy++;
      acquired = true;
      const result = await adapter(validated, cancellation.signal);
      return send(response, 200, result);
    } catch (error) {
      // Never return/log provider errors, prompts, context, tokens or key values.
      return send(response, error instanceof ServiceError ? error.status : 503, {
        error: error instanceof ServiceError ? error.code : 'service-unavailable',
      });
    } finally {
      if (acquired) busy--;
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 5000;
  server.timeout = 20000;
  server.maxHeadersCount = 30;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const configuration = readConfiguration();
    const adapter = configuration.enabled ? createGeminiAdapter(configuration) : null;
    const server = createCoachServer({ configuration, adapter });
    const port = Number(process.env.PORT ?? 8080);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('invalid-port');
    server.listen(port, '0.0.0.0');
  } catch {
    process.stderr.write('Optional Coach service configuration rejected.\n');
    process.exitCode = 1;
  }
}
