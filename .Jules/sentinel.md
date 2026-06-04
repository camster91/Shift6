## 2025-05-15 - API Base Redirection via localStorage
**Vulnerability:** The sync client allowed overriding the API base URL via a `localStorage` key in all environments. An attacker exploiting an XSS vulnerability could have redirected user sync data to a malicious server.
**Learning:** Development conveniences (like local API testing overrides) often bypass standard security boundaries and can become high-severity exfiltration vectors if left active in production.
**Prevention:** Use environment-specific flags (e.g., `import.meta.env.DEV` in Vite) to strictly scope development-only overrides to local environments.
