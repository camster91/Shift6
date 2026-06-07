## 2025-05-15 - API Base URL Redirection via LocalStorage
**Vulnerability:** The application allowed overriding the `DEFAULT_API_BASE` URL via a `localStorage` key (`armor_api_base`) without environment restrictions.
**Learning:** While useful for local development to point the frontend to a local sync API, leaving this active in production allows any malicious script (XSS) or browser extension to redirect all user sync data (including workout history and auth tokens) to a rogue server.
**Prevention:** Use `import.meta.env.DEV` to restrict configuration overrides via client-side storage to development environments only.
