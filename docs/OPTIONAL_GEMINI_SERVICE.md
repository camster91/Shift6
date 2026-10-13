# Optional Gemini Coach service preparation (#334)

13 October 2026. Server-only engineering preparation. Nothing was deployed,
paired with a phone, enabled in a mobile build, or evaluated against real Gemini.
No credentials, paid requests, accounts or billing changes were made. Guest-only
profiles, API URL, sync, local training and provider privacy preferences remain
unchanged. This batch does not complete issue #334 or the Coach memory/tool epics.

## Implemented boundary

`server/gemini` is a dependency-free Node service using the existing protocol-v1
message shape. A build step strips types from the authoritative mobile contracts,
safety classifier, parser and protocol modules; it does not duplicate their safety
rules. Node 22.23.2's type-strip API is experimental. The Dockerfile pins that
runtime and uses an allowlisted build context so local `.env` files cannot enter
the image. Container execution has not been verified.

The only provider route is `POST /v1/coach/message`; allowed tasks are
`explain-workout`, `weekly-review` and `cycle-review`. Proposal, sync, enrollment,
deletion, model tools, free-form questions, substitution and plan-generation
routes are absent. No server response writes mobile records. Later mutation
capabilities must continue through existing client preview, validation, explicit
confirmation, execution and saved-record readback; this service cannot authorize
or bypass them.

Requests require the current protocol header and an unexpired operator-paired
bearer token. Tokens must be random device-specific secrets of at least 256 bits;
the service accepts 43–256 base64url characters and stores only SHA-256 hashes
plus expiration dates. No public pairing endpoint or default password exists.
The operator must provision a distinct token over a trusted channel and revoke
it by removing its hash. Tokens must later live in client secure storage, never
exports, URLs, logs or ordinary local database tables. Client pairing UI/storage
and operator issuance/revocation workflows are still unimplemented.

Both `SHIFT6_GEMINI_ENABLED=true` and complete server configuration are required
to activate upstream calls. Omission defaults to disabled; invalid enabled
configuration rejects startup. `GEMINI_API_KEY` is sent only in Google's request
header. `GEMINI_MODEL` is required and restricted to a model identifier at the
fixed Google API host; there is no guessed model default or client-supplied URL.

Context is at most 8 KiB with strict known fields: unit preference, goal enums,
experience enum, current week/status and bounded training summary facts. Local
owner/cycle/version IDs, notes, journals, free-text prompts, health samples,
media, tokens and unknown keys are rejected. Workout titles are limited to 120
characters; they remain private text and require exact disclosure/consent before
any future transmission. The current mobile transport omits other private fields,
but a future opt-in must preview the actual outgoing packet per request.

Output requires completed, bounded structured JSON with exactly message kind,
text and `factsUsed`. Unknown actions/fields, tool calls, duplicate facts,
invented fact references, truncation and blocked output are rejected. Facts must
name supplied structured fact keys; those keys are **not verified local record
citations**. This binding does not prove that every sentence is factually correct
or medically safe. Existing deterministic safety classification also runs on
response text. Real-provider factual/safety evaluation remains a release gate.

Upstream requests have a 10-second timeout, no automatic retries, 768 output
tokens and a 32 KiB response limit. Default service limits are 3 requests per
device/minute, 20/device/UTC day, 100 total/UTC day and two concurrent requests.
Counters are bounded in-memory and reset on restart: they are a private single
instance safeguard, **not a durable spending cap**. Public rollout requires
durable shared quotas/revocation, selected-project limits, billing safeguards and
abuse evaluation. Provider and transport failures expose generic errors so the
existing mobile fallback can explain local records. The service has no request,
response, token or health logging; reverse-proxy/body/header logging must also be
disabled or appropriately redacted before deployment.

## Verification and local commands

Run from the repository root on Node 22.23.2 or newer:

```powershell
Push-Location server/gemini
node build.mjs
node --test service.test.mjs
node server.mjs
Pop-Location
```

With no activation variables, the last command starts a **disabled** local
service on port 8080. `GET /healthz` reports that state without a model request.
The tests use synthetic tokens and mocked fetch exclusively, with localhost HTTP
for service boundaries. Do not put a real key/token into test fixtures.

All **16 Node tests passed** on CAM-DESKTOP, Node 22.23.2. Checks cover strict
context, supplied-key evidence binding, arbitrary action rejection, shared safety
routing, blocked/truncated/oversized output, missing/unavailable workout evidence,
mocked missed-week/limited-readiness context, changed equipment rejection,
timeouts, generic failures, pairing/expiry/protocol, size limits, concurrency and
minute/day/global quotas. These synthetic checks are not live model evaluation.

For a future reviewed Coolify deployment, use repository root as build context
and `server/gemini/Dockerfile` as Dockerfile, port 8080 behind HTTPS. The existing
Coolify VPS was chosen by the user, but deployment/credential entry has not been
performed. Required secret settings are `GEMINI_API_KEY`, `GEMINI_MODEL`,
`SHIFT6_GEMINI_ENABLED` and `SHIFT6_COACH_TOKEN_HASHES`. The last is JSON of
`[{"sha256":"<64 lowercase hex characters>","expiresAt":"<ISO timestamp>"}]`.
There are no usable secrets in this example. Secret creation must happen through
the approved secure operator workflow, with no raw token copied into issue text.

## Official sources and activation gates

Checked 13 October 2026:

- [Google API key security](https://ai.google.dev/gemini-api/docs/api-key): keys
  belong on a server or secret store; mobile bundles cannot protect them.
- [Structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output):
  the current REST example uses `generationConfig.responseFormat.text` with JSON
  MIME type and schema. Local validation remains necessary.
- [Project/model rate limits](https://ai.google.dev/gemini-api/docs/rate-limits):
  actual quotas depend on the project, model and tier. Service limits do not
  replace provider limits.
- [Gemini terms and data handling](https://ai.google.dev/gemini-api/terms): unpaid
  services can use input/output for product improvement and human review; their
  terms warn against sensitive personal information. Paid-project handling
  differs, including limited abuse-monitoring retention. Do not promise zero
  provider retention or transmit personal training context under an unreviewed
  policy.
- [Model availability](https://ai.google.dev/gemini-api/docs/models) and
  [pricing](https://ai.google.dev/gemini-api/docs/pricing) must be refreshed for the
  actual project/model/region before activation. No cost, availability or paid
  tier has been verified for Cameron's project.

Remaining gates: approve the exact optional mobile capability without enabling
sync/accounts; implement secure pairing and per-request context preview/consent;
confirm provider/project/model terms, quota and costs; provision secrets; review
Coolify HTTPS/logging/egress and durable limits; deploy only with explicit approval;
run real-provider evaluation for pain, missed weeks, inadequate evidence, changed
equipment and unsafe requests; test offline fallback/revocation on native iOS and
Android. No health or meal/photo capability is included.
