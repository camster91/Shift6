## 2025-05-15 - Production API Redirection Vulnerability
**Vulnerability:** The sync client allowed overriding the API base URL via `localStorage`, which could be exploited in production to redirect sensitive user data to a malicious endpoint.
**Learning:** Development-time conveniences (like easy API switching) can become security liabilities if they persist into production without environment checks.
**Prevention:** Always wrap environment-specific configuration overrides (like those from `localStorage` or debug menus) in an environment check (e.g., `import.meta.env.DEV`) to ensure they are disabled in production builds.
