## 2025-05-14 - API Redirection Hardening
**Vulnerability:** API hijacking via localStorage override. The `getApiBase` function allowed persistent redirection of sync traffic to a malicious endpoint by setting a `localStorage` key.
**Learning:** Even well-intentioned "developer overrides" in production code can be weaponized if an attacker gains any level of script execution (XSS) or physical access to an unlocked device.
**Prevention:** Always scope developer-only overrides using environment flags like `import.meta.env.DEV` to ensure they are physically absent from production builds.

## 2025-05-14 - Resource Exhaustion & Data Integrity
**Vulnerability:** Unbounded input length for user-controllable fields (`displayName`, `notes`).
**Learning:** Missing input limits can lead to local storage exhaustion (DoS) or UI layout breaking. While local-first, these fields are eventually synced to a cloud database, making them a vector for database bloat or downstream processing issues.
**Prevention:** Enforce `maxLength` on all user-facing `<input>` and `<textarea>` elements as a first line of defense.
