# Sentinel's Journal - Critical Security Learnings

## 2025-05-15 - Security Hardening and Configuration Management
**Vulnerability:** Hardcoded credentials and placeholders in build configurations (Android signing passwords).
**Learning:** Hardcoding even placeholders or redacted values in sensitive areas like `build.gradle` can lead to accidental exposure of credentials or brittle configurations. Using environment variables ensures better security and flexibility across different environments.
**Prevention:** Always use environment variables for any sensitive data or environment-specific identifiers. Document these requirements in a `.env.example` file.

## 2026-07-15 - Secure Error Boundary Pattern
**Vulnerability:** Information leakage through raw error messages and component stacks in production UI and console.
**Learning:** Default React ErrorBoundary implementations often log or render the full `error` object, which contains sensitive stack traces and internal logic details.
**Prevention:** Use `import.meta.env.DEV` to gate both `console.error` calls in `componentDidCatch` and technical UI details (like `<details>` or `<pre>` tags) in the `render` method.
