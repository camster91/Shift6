# SHIFT6 sync server contract

Updated: 2026-09-16

This document defines the contract expected by the mobile sync client. It does not claim that a
production sync server, authentication provider, database, or row-level authorization policy has
been deployed.

## Mobile boundary

When `EXPO_PUBLIC_API_BASE_URL` is configured, the app sends sync requests only to the authenticated
SHIFT6 API boundary:

```text
POST /v1/sync
Authorization: Bearer <access token>
Content-Type: application/json
X-Shift6-Protocol-Version: 1
```

The mobile app does not receive database credentials and must not talk directly to a privileged
server database connection.

### Mobile/API protocol compatibility

The current mobile API protocol is version `1`. Authenticated sync, account-deletion and Coach
requests advertise `X-Shift6-Protocol-Version: 1`.

A server may return `X-Shift6-Min-Protocol-Version: <positive integer>`. When that minimum is newer
than the protocol supported by the installed mobile build, the client fails closed before applying
response data or continuing account/Coach handling. Invalid minimum-protocol headers are also
protocol errors.

For staged rollout, the production server must continue accepting every still-supported mobile
protocol until the corresponding older app versions have aged out of the supported window. Raising
the minimum protocol is a deliberate compatibility event and must not be used as an accidental
kill switch for active users. Offline workout logging must remain local-first even when sync is
temporarily incompatible.


The request body is:

```json
{
  "mutations": [
    {
      "id": "stable mutation id",
      "idempotencyKey": "stable retry key",
      "entityType": "typed entity name",
      "entityId": "stable entity id",
      "payload": {},
      "createdAt": "ISO timestamp"
    }
  ]
}
```

The local SQLite outbox already enforces unique mutation IDs and unique idempotency keys. The HTTP
adapter also rejects duplicate identities before making a network request.

## Response contract

A successful HTTP response has this logical shape:

```json
{
  "acknowledgedMutationIds": ["mutation-1"],
  "rejectedMutationIds": ["mutation-2"],
  "conflicts": [
    {
      "mutationId": "mutation-3",
      "code": "version-conflict"
    }
  ],
  "serverVersion": 42
}
```

`conflicts` and `serverVersion` are optional. `acknowledgedMutationIds` and `rejectedMutationIds` are
required arrays.

The mobile transport fails closed when the response is malformed. In particular:

- every returned mutation ID must belong to the batch that was just sent;
- a mutation cannot be acknowledged and rejected in the same response;
- a mutation cannot be acknowledged/rejected and also returned as a conflict;
- duplicate conflict statuses for the same mutation are invalid;
- mutation IDs in result arrays/conflicts cannot be empty;
- `serverVersion`, when present, must be a non-negative integer;
- invalid JSON is a protocol error, not a successful sync.

A response may intentionally resolve only part of a batch. Partial results are valid. The local
outbox leaves every unresolved mutation queued and records an error so it can be retried rather than
silently dropping local workout data.

## Server acknowledgement rule

A mutation ID may appear in `acknowledgedMutationIds` only after the server has durably applied that
mutation, or has proven through its idempotency record that the same mutation was already durably
applied.

An acknowledgement must never mean merely “request received.” If durable application is still
pending, omit the mutation from the acknowledgement list and let the client retry.

## Idempotency

The server must treat `idempotencyKey` as a user-scoped idempotency boundary.

For a given authenticated user:

1. The first successful application of a key records the resulting durable outcome.
2. A retry with the same key and semantically identical mutation returns the prior successful
   outcome without applying the operation twice.
3. Reuse of the same key with materially different mutation content is a protocol/security error and
   must not overwrite the original operation.
4. Idempotency records must survive normal transient retries long enough to cover offline/mobile
   retry behaviour.
5. Idempotency keys from different authenticated users must never collide into shared ownership.

The mutation `id` is the client operation identity; the `idempotencyKey` is the retry/deduplication
identity. Neither should be rewritten by the server.

## Conflict semantics

Supported conflict codes are:

- `version-conflict` — the client mutation targets an entity/version that has moved since the client
  snapshot;
- `ownership-conflict` — the authenticated user is not permitted to mutate the target ownership
  scope;
- `validation-conflict` — the mutation is structurally valid enough to parse but violates a current
  server/domain constraint.

A conflicted mutation remains in the local outbox. The client does not delete it merely because the
same response also tries to acknowledge it; contradictory HTTP responses are rejected before they
reach the outbox.

Conflict resolution must preserve user intent and historical completed-workout data. Do not resolve
version conflicts by silently overwriting newer history.

## Rejection semantics

`rejectedMutationIds` is for explicit server rejection that is not represented by a structured
conflict. Rejected mutations also remain queued locally with an error so the failure is visible and
recoverable.

The production API should eventually expose structured rejection reasons if product UX needs a
specific recovery action. Until then, the client intentionally prefers retaining the mutation over
silently discarding data.

## Authorization and ownership

Authentication alone is not authorization. Every sync mutation must be authorized against the
server-side owner of the affected data.

The production backend must prove at minimum:

- the access token is validated server-side and mapped to one stable SHIFT6 user identity;
- a user can read/write only records they own or records intentionally shared with them;
- client-supplied `userId`, owner IDs, entity IDs, or payload fields cannot override the authenticated
  identity;
- workout sessions, completed sets, personal programs, preferences, body metrics, Coach proposal
  state, health-derived records, and sync metadata are isolated by owner;
- privileged/service credentials are never exposed to the mobile bundle;
- row-level/database authorization rules are exercised with cross-user negative tests, not only
  happy-path same-user tests.

If a managed database uses row-level security, those policies must still be tested from the actual
server role/authentication path used in production. Merely enabling an RLS feature is not evidence
that the policy is correct.

## Required authorization test matrix

Before release, create at least two independent test accounts and prove:

1. User A can sync User A data.
2. User B can sync User B data.
3. User A cannot acknowledge, read, update, delete, or conflict-resolve User B entities by guessing an
   ID.
4. User A cannot submit a payload claiming `userId: B` and have the server honour it.
5. Replaying User A's idempotency key under User B does not expose or mutate User A's outcome.
6. Expired/revoked/invalid tokens are rejected without applying mutations.
7. A signed-out client cannot sync.
8. Account deletion prevents old tokens or delayed outbox retries from recreating deleted ownership.

Record the actual API/database test evidence before calling this gate complete.

## Multi-device and retry behaviour

The production server must be tested with two devices/accounts states that exercise:

- the same mutation retried after a network timeout;
- response lost after the server commits, followed by retry with the same idempotency key;
- overlapping mutations to the same entity/version;
- stale version update after another device advances the entity;
- partial batch success;
- one permanent invalid mutation among otherwise valid mutations;
- process death after local commit but before sync acknowledgement;
- long offline periods followed by a large ordered outbox;
- repeated retry after server 5xx/timeout;
- server response containing no resolution for one or more sent mutations.

No test should require deleting unresolved local mutations to “recover.”

## Ordering and history

The client sends pending mutations oldest first. The server should not assume wall-clock timestamps
are globally trustworthy or use them as the sole conflict rule.

Completed workout history is append/history-oriented data. A later sync or program edit must not
rewrite historical completed sets merely because the current template/version changed.

Program revisions, Coach-approved plan changes, and other versioned configuration should preserve
explicit version lineage so a historical workout can still resolve what was prescribed at the time.

## Logging and privacy

Server logging must avoid turning the sync API into a second analytics pipeline. Do not log raw
private workout notes, health samples, Coach free text, credentials, bearer tokens, or unnecessary
full mutation payloads by default.

Operational logs should prefer request IDs, mutation counts, coarse entity categories, status codes,
latency, conflict/rejection counts, and privacy-safe error codes.

## Production evidence required

Before #272/#280 or the release epic can treat cloud sync as production-ready, record:

- selected auth provider and token-validation design;
- deployed `/v1/sync` implementation;
- deployed database/storage model;
- authorization/RLS policy definitions and cross-user negative-test evidence;
- idempotency persistence/retention design;
- conflict-resolution behaviour and multi-device tests;
- retry/timeout/partial-response tests;
- monitoring/alerting and privacy-safe logging policy;
- signed native-build sync/offline/restart tests;
- account-deletion interaction with sync/idempotency state;
- `npm run verify`/CI on the exact integrated client commit.

Repository client tests prove only the mobile contract and fail-closed behaviour. They do not prove a
real server exists or is correctly authorized.
