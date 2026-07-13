# Sentinel's Journal - Critical Security Learnings

## 2025-05-15 - Security Hardening and Configuration Management
**Vulnerability:** Hardcoded credentials and placeholders in build configurations (Android signing passwords).
**Learning:** Hardcoding even placeholders or redacted values in sensitive areas like `build.gradle` can lead to accidental exposure of credentials or brittle configurations. Using environment variables ensures better security and flexibility across different environments.
**Prevention:** Always use environment variables for any sensitive data or environment-specific identifiers. Document these requirements in a `.env.example` file.

## 2025-05-20 - Information Leakage in Error Boundaries
**Vulnerability:** React Error Boundaries exposing raw error messages and component stacks to end-users in production.
**Learning:** Default error boundary implementations often include "details" or "stacks" for debugging. If not gated by environment checks (like `import.meta.env.DEV`), these leak internal application logic and state to users.
**Prevention:** Always wrap technical error details and stack traces in environment checks to ensure they only appear in development builds.
