# SHIFT6 account deletion contract

Updated: 2026-09-16
Status: **mobile boundary implemented; production server and provider behaviour not yet verified**

This document defines the minimum contract behind the in-app **Delete account** action. It does not
claim that a production backend, auth provider, external deletion page, or provider-token revocation
is live.

## Mobile behaviour

The mobile client uses the provider-neutral `BackendClient.deleteAccount()` boundary.

Required sequence:

1. user must be authenticated and explicitly confirm the destructive action;
2. mobile sends authenticated `DELETE /v1/account` with no user-entered payload;
3. local data and local auth state remain untouched unless the server confirms account deletion;
4. after remote confirmation, a SecureStore recovery marker records that local cleanup is pending;
5. local user-owned data is deleted transactionally;
6. recovery state advances to sign-out;
7. local auth session is removed;
8. recovery marker is removed;
9. identity is re-resolved as guest.

If the app exits after step 4, Profile reloads the recovery marker and offers **Finish account
cleanup** without repeating the remote delete request.

If remote deletion is not confirmed, the client fails closed: it keeps local data and the auth
session unchanged.

## Mobile transport response

Accepted success responses:

- HTTP `204 No Content`; or
- a successful JSON response containing exactly the required confirmation signal
  `{ "deleted": true }` (additional future fields may be ignored only after protocol review).

A 2xx response that does not confirm `deleted: true` is a protocol error. Non-2xx responses and
network failures are treated as unavailable deletion, not as successful deletion.

## Production server requirements

The production implementation behind `DELETE /v1/account` must not return success until the
required deletion transaction/queue has been accepted according to the documented retention model.
At minimum it must:

- authenticate the requesting user and derive account ownership from the token rather than a client
  supplied user ID;
- reject attempts to delete another account;
- delete or irreversibly schedule deletion of SHIFT6-owned account/profile/training data that is not
  subject to a legitimate disclosed retention requirement;
- delete or schedule deletion at integrated service providers where SHIFT6 controls that data;
- invalidate active sessions/refresh tokens according to the selected auth architecture;
- revoke provider authorization where required by the identity provider and store policy;
- when Sign in with Apple is supported, perform the required Apple token/authorization revocation as
  part of the account-deletion implementation;
- ensure later sync requests cannot recreate a deleted account from an old mobile outbox;
- define behaviour for deletion requests already completed or currently processing;
- produce privacy-safe operational audit evidence without logging sensitive workout/health payloads;
- document any data retained after deletion, its legal/business basis, retention period and user
  disclosure.

## Idempotency and retry

The mobile app persists recovery state so it should not intentionally send a second remote delete
after receiving confirmation. The server should nevertheless make deletion retries safe where the
auth architecture permits them.

Do not require a client-generated account ID or destructive idempotency token in order to identify
which account to delete; ownership comes from authenticated server context.

## Sign in with Apple

If Apple account creation ships, deletion is not complete merely because SHIFT6 database rows were
removed. The server/provider implementation must support Apple's current account-deletion and token
revocation requirements.

Official reference:

- https://developer.apple.com/support/offering-account-deletion-in-your-app

The current `SecureAuthProvider` only clears the local secure session envelope. It does not itself
revoke Apple or Google authorization; that remains a provider/server responsibility.

## Google Play external deletion resource

If account creation ships on Google Play, the release package must include a functional external web
resource where a user can request account deletion without reinstalling the app. That resource is
not implemented in this repository today.

Official reference:

- https://support.google.com/googleplay/android-developer/answer/13327111

Required release evidence:

- public deletion URL;
- account-identification and verification flow appropriate to the selected auth provider;
- confirmation of what data will be deleted or retained;
- deletion execution against production-like data;
- reconciliation with the Play Data safety form and privacy policy.

## Test matrix before public account creation

### Mobile / API

- authenticated successful deletion;
- no token / expired token;
- server 4xx/5xx;
- network loss before server confirmation;
- malformed successful response;
- app kill immediately after remote confirmation;
- app kill after local deletion but before sign-out;
- local SQLite cleanup failure;
- SecureStore sign-out failure;
- stale/recovered cleanup marker;
- sync outbox cannot restore a deleted account.

### Provider/server

- email account deletion;
- Google account deletion/revocation behaviour;
- Sign in with Apple deletion/revocation behaviour;
- server-side cascade/service-provider deletion;
- legitimate retention exception, if any;
- deletion while sync/Coach requests are in flight;
- repeated deletion request behaviour;
- old access/refresh token rejection after deletion.

### Store/privacy

- in-app deletion path visible and understandable;
- external Google deletion URL live if accounts ship;
- privacy policy accurately explains deletion and retention;
- Apple App Privacy and Google Data safety declarations match production behaviour;
- reviewer notes include the exact deletion path and test account where required.

## Current blockers

The following remain unresolved and must not be reported as complete:

- production auth provider selection/configuration;
- deployed `DELETE /v1/account` server endpoint;
- server-side deletion/cascade implementation;
- Apple/Google provider revocation implementation and evidence;
- remote retention policy;
- public Google account-deletion web resource;
- native end-to-end deletion QA;
- final privacy policy/store declaration reconciliation.
