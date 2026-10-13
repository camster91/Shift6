import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiAdapter, validateRequest, validateOutput, ServiceError } from './adapter.mjs';
import { createCoachServer, readConfiguration, tokenHash } from './server.mjs';

const packet = () => ({
  task: 'explain-workout',
  context: {
    user: { unitSystem: 'imperial', goals: ['consistent-training'], experience: 'beginner' },
    cycle: { currentWeek: 1, status: 'active' },
    structuredFacts: { workoutTitle: 'My private hold', currentWeek: 1, readiness: 'ready' },
  },
});
const answer = () => ({
  kind: 'message',
  text: 'Your saved workout is My private hold in week 1.',
  factsUsed: ['workoutTitle', 'currentWeek'],
});
const envelope = (value = answer(), reason = 'STOP') =>
  new Response(
    JSON.stringify({
      candidates: [{ finishReason: reason, content: { parts: [{ text: JSON.stringify(value) }] } }],
    }),
  );
const provider = (fetcher, extra = {}) =>
  createGeminiAdapter({
    apiKey: 'synthetic-server-key',
    model: 'gemini-test-model',
    fetcher,
    ...extra,
  });

test('strict context excludes IDs, notes, health, prompt and arbitrary action tasks', () => {
  assert.deepEqual(validateRequest(packet()), packet());
  for (const mutate of [
    (p) => {
      p.prompt = 'raw note';
    },
    (p) => {
      p.task = 'shorten-workout';
    },
    (p) => {
      p.task = 'freeform';
    },
    (p) => {
      p.context.user.id = 'owner';
    },
    (p) => {
      p.context.structuredFacts.healthSamples = [];
    },
    (p) => {
      p.context.structuredFacts.notes = 'private note';
    },
    (p) => {
      p.context.structuredFacts.workoutTitle = 'x'.repeat(121);
    },
    (p) => {
      p.context.structuredFacts.currentWeek = 2;
    },
    (p) => {
      p.context.structuredFacts.completionRate = 2;
    },
    (p) => {
      p.context.structuredFacts.completedWorkoutCount = 9;
      p.context.structuredFacts.plannedWorkoutCount = 3;
    },
  ]) {
    const p = packet();
    mutate(p);
    assert.throws(() => validateRequest(p), /invalid-context/);
  }
});

test('model fetch is fixed-host and structured; key is a header and no actions/tools are sent', async () => {
  let captured;
  const result = await provider(async (url, options) => {
    captured = { url, options };
    return envelope();
  })(packet());
  assert.deepEqual(result, answer());
  assert.equal(
    captured.url,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent',
  );
  assert.equal(captured.options.headers['x-goog-api-key'], 'synthetic-server-key');
  assert.ok(captured.options.signal instanceof AbortSignal);
  const body = JSON.parse(captured.options.body);
  assert.equal(body.generationConfig.responseFormat.text.mimeType, 'application/json');
  assert.deepEqual(
    body.generationConfig.responseFormat.text.schema.properties.factsUsed.items.enum,
    Object.keys(packet().context.structuredFacts),
  );
  assert.equal(body.tools, undefined);
  assert.equal(body.contents[0].parts[0].text, JSON.stringify(packet()));
  assert.ok(!captured.options.body.includes('synthetic-server-key'));
});

test('invented fact IDs, duplicate evidence, arbitrary changes and empty response fail closed', async () => {
  for (const invalid of [
    { ...answer(), factsUsed: ['nonexistent-record-id'] },
    { ...answer(), factsUsed: ['currentWeek', 'currentWeek'] },
    { ...answer(), changes: [{ type: 'target-change' }] },
    { ...answer(), text: '' },
    { ...answer(), kind: 'unavailable' },
  ])
    await assert.rejects(
      provider(async () => envelope(invalid))(packet()),
      /provider-invalid-response/,
    );
});

test('existing deterministic safety classifier routes dangerous generated advice', async () => {
  const result = await provider(async () =>
    envelope({ ...answer(), text: 'Keep training through chest pain.' }),
  )(packet());
  assert.equal(result.kind, 'safety-route');
  assert.match(result.text, /Stop exercising/);
  assert.deepEqual(result.factsUsed, ['deterministic safety classifier']);
});

test('blocked, truncated, tool-bearing and oversized provider responses are rejected', async () => {
  for (const fetcher of [
    async () => envelope(answer(), 'MAX_TOKENS'),
    async () => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } })),
    async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: 'STOP',
              content: { parts: [{ functionCall: { name: 'deleteData' } }] },
            },
          ],
        }),
      ),
    async () => new Response('x'.repeat(32769)),
  ])
    await assert.rejects(provider(fetcher)(packet()), /provider-invalid-response/);
});

test('empty evidence makes no model call and returns honest unavailable response', async () => {
  const request = packet();
  request.context.structuredFacts = {};
  let calls = 0;
  const result = await provider(async () => {
    calls++;
    return envelope();
  })(request);
  assert.equal(calls, 0);
  assert.equal(result.kind, 'unavailable');
});

test('provider limits, failures and deadlines do not reveal provider secrets', async () => {
  for (const fetcher of [
    async () => new Response('synthetic-server-key raw prompt', { status: 429 }),
    async () => {
      throw new Error('synthetic-server-key raw health token');
    },
  ])
    await assert.rejects(
      provider(fetcher)(packet()),
      (e) => e instanceof ServiceError && !e.message.includes('synthetic'),
    );
  const deadline = provider(
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('deadline')), { once: true });
      }),
    { timeoutMs: 10 },
  );
  // Keep the synthetic test event loop alive while AbortSignal's unref timer runs.
  const keepAlive = setTimeout(() => {}, 100);
  try {
    await assert.rejects(deadline(packet()), /provider-unavailable/);
  } finally {
    clearTimeout(keepAlive);
  }
});

test('disabled default and invalid pairing/model configuration cannot activate the provider', () => {
  assert.deepEqual(readConfiguration({ GEMINI_API_KEY: 'synthetic-key' }), { enabled: false });
  assert.throws(() => readConfiguration({ SHIFT6_GEMINI_ENABLED: 'true' }), /pairing/);
  assert.throws(
    () => createGeminiAdapter({ apiKey: 'synthetic-key', model: 'https://wrong-host' }),
    /configuration/,
  );
});

const testToken = 'a'.repeat(43);
const date = Date.UTC(2026, 9, 13, 12);
const configuration = () => ({
  enabled: true,
  credentials: [
    { sha256: tokenHash(testToken), expiresAt: new Date(date + 86400000).toISOString() },
  ],
});
async function withServer(options, run) {
  const server = createCoachServer({
    configuration: configuration(),
    adapter: async () => answer(),
    now: () => date,
    ...options,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body = packet(), headers = {}, path = '/v1/coach/message') =>
    fetch(base + path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testToken}`,
        'X-Shift6-Protocol-Version': '1',
        'Content-Type': 'application/json',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  try {
    await run(post, base);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('authenticated protocol route works; no auth/proposal/sync enrollment endpoints exist', async () => {
  let calls = 0;
  await withServer(
    {
      adapter: async () => {
        calls++;
        return answer();
      },
    },
    async (post) => {
      const response = await post();
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), answer());
      assert.equal(response.headers.get('X-Shift6-Min-Protocol-Version'), '1');
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      for (const path of ['/v1/coach/proposal', '/v1/sync', '/v1/pair', '/v1/delete'])
        assert.equal((await post(packet(), {}, path)).status, 404);
      assert.equal(calls, 1);
    },
  );
});

test('invalid/expired credential, protocol, health payload and body size never reach provider', async () => {
  let calls = 0;
  await withServer(
    {
      adapter: async () => {
        calls++;
        return answer();
      },
    },
    async (post) => {
      assert.equal((await post(packet(), { Authorization: 'Bearer wrong' })).status, 401);
      assert.equal((await post(packet(), { 'X-Shift6-Protocol-Version': '2' })).status, 409);
      assert.equal((await post({ ...packet(), health: [] })).status, 400);
      assert.equal((await post('x'.repeat(8193))).status, 413);
      assert.equal((await post('{not-json')).status, 400);
      assert.equal(calls, 0);
    },
  );
  const expired = configuration();
  expired.credentials[0].expiresAt = new Date(date - 1).toISOString();
  await withServer({ configuration: expired }, async (post) =>
    assert.equal((await post()).status, 401),
  );
});

test('disabled service and provider failure preserve fallback without leaking raw data', async () => {
  await withServer({ configuration: { enabled: false } }, async (post, base) => {
    assert.equal((await post()).status, 503);
    assert.deepEqual(await (await fetch(base + '/healthz')).json(), {
      status: 'ok',
      providerEnabled: false,
    });
  });
  await withServer(
    {
      adapter: async () => {
        throw new Error('secret key raw prompt health');
      },
    },
    async (post) => {
      const response = await post();
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: 'service-unavailable' });
    },
  );
});

test('per-device quotas, shared daily quota and concurrency block extra provider requests', async () => {
  let calls = 0;
  await withServer(
    {
      perMinute: 1,
      adapter: async () => {
        calls++;
        return answer();
      },
    },
    async (post) => {
      assert.equal((await post()).status, 200);
      assert.equal((await post()).status, 429);
      assert.equal(calls, 1);
    },
  );
  await withServer({ globalPerDay: 1 }, async (post) => {
    assert.equal((await post()).status, 200);
    assert.equal((await post()).status, 429);
  });
  let release, started;
  const waiting = new Promise((resolve) => {
    started = resolve;
  });
  await withServer(
    {
      maxConcurrent: 1,
      adapter: async () => {
        started();
        await new Promise((resolve) => {
          release = resolve;
        });
        return answer();
      },
    },
    async (post) => {
      const first = post();
      await waiting;
      assert.equal((await post()).status, 429);
      release();
      assert.equal((await first).status, 200);
    },
  );
});

test('same validated packet accepts no invented record citations through the shared parser boundary', () => {
  assert.deepEqual(validateOutput(answer(), validateRequest(packet())), answer());
  assert.throws(
    () => validateOutput({ ...answer(), factsUsed: ['session-123'] }, packet()),
    /invalid-response/,
  );
});

test('current mobile conditioning and unavailable-workout facts are handled honestly', async () => {
  const request = packet();
  request.context.structuredFacts.workoutFocus = 'conditioning';
  request.context.structuredFacts.workoutAvailable = false;
  assert.deepEqual(validateRequest(request), request);
  let calls = 0;
  const result = await provider(async () => {
    calls++;
    return envelope();
  })(request);
  assert.equal(calls, 0);
  assert.equal(result.kind, 'unavailable');
});

test('missed-week and limited-readiness packets contain no inferred equipment or target prescriptions', async () => {
  const request = packet();
  request.task = 'weekly-review';
  request.context.structuredFacts.completedWorkoutCount = 0;
  request.context.structuredFacts.plannedWorkoutCount = 3;
  request.context.structuredFacts.completionRate = 0;
  request.context.structuredFacts.readiness = 'limited';
  const expected = {
    kind: 'message',
    text: 'No sessions are recorded. The available summary does not establish why.',
    factsUsed: ['completedWorkoutCount'],
  };
  assert.deepEqual(await provider(async () => envelope(expected))(request), expected);
  request.context.structuredFacts.equipmentIds = ['changed-equipment'];
  assert.throws(() => validateRequest(request), /invalid-context/);
});

test('daily quota persists across minute rollover and resets on the next UTC day', async () => {
  let timestamp = date;
  const config = configuration();
  config.credentials[0].expiresAt = new Date(date + 3 * 86400000).toISOString();
  await withServer({ configuration: config, now: () => timestamp, perDay: 1 }, async (post) => {
    assert.equal((await post()).status, 200);
    timestamp += 60000;
    assert.equal((await post()).status, 429);
    timestamp += 86400000;
    assert.equal((await post()).status, 200);
  });
});
