# Tracked dependency remediations

These private local forks are installed through explicit npm overrides. They are
not upstream releases. Retained upstream licenses and source remain in each folder.
Replacement with official fixes is required when compatible published fixes exist.

| Fork | Upstream | Change | Advisory |
| --- | --- | --- | --- |
| braces | 3.0.3 | Reject parser depth over 128; iterative validation bounds recursive AST visitors and rejects cycles. | GHSA-vfj7-8cjw-p6xm |
| node-forge | 1.4.0 | Reject unconsumed nested DigestAlgorithm elements, matching the proposed fix in digitalbazaar/forge PR 1152 at ceba34402e329f0365134f23fe19898756527d65. The PR was open on 2026-10-12. | GHSA-86w9-cpqp-85rv |
| decode-uri-component | 0.5.0 | Preserve the patched upstream decoder algorithm; adapt export to CommonJS and retain the old plus-to-space API expected by legacy consumers. | GHSA-vcc3-ghjq-m6fr |
| sprintf-js | 1.0.3 | Bound floating precision to ECMAScript's permitted range: 0–100 for e/f, 1–100 for g. | GHSA-hp3w-g68c-fv3c |

UUID is upgraded to the official CommonJS-compatible 11.1.1 release instead of
forked. Buffer bounds and Xcode's v4 usage have regression coverage.

`npm run test:security` tests the dependencies resolved from their real consuming
packages, not global Node modules. It covers deep parser/AST input, malformed RSA
DigestInfo with and without NULL parameters, valid signature acceptance, bounded
malformed URL decoding, query-string compatibility, floating precision, and UUID
buffer bounds. `scripts/validate-vendor.mjs` verifies the committed file inventory.
`npm audit --omit=dev` remains enabled with no advisory allowlist.

These checks address the listed cases; they are not a general security audit or
independent cryptographic review of the complete libraries.
