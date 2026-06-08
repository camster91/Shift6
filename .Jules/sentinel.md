## 2026-06-08 - Hardening API sync and input validation
**Vulnerability:** API base URL hijacking via localStorage and missing input length validation.
**Learning:** Allowing localStorage overrides for critical configuration like API endpoints in production creates a persistent hijacking vector if an XSS vulnerability is ever discovered. Lack of client-side length limits increases the risk of backend storage abuse or DoS.
**Prevention:** Restrict configuration overrides to development mode only and always enforce sensible input length limits on the frontend as a first line of defense.
