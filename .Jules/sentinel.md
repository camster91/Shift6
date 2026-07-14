# Sentinel's Journal - Critical Security Learnings

## 2025-05-15 - Security Hardening and Configuration Management
**Vulnerability:** Hardcoded credentials and placeholders in build configurations (Android signing passwords).
**Learning:** Hardcoding even placeholders or redacted values in sensitive areas like `build.gradle` can lead to accidental exposure of credentials or brittle configurations. Using environment variables ensures better security and flexibility across different environments.
**Prevention:** Always use environment variables for any sensitive data or environment-specific identifiers. Document these requirements in a `.env.example` file.

## 2025-05-16 - Information Leakage in Error Boundaries
**Vulnerability:** Raw error messages and component stack traces were displayed to users in production via React ErrorBoundaries.
**Learning:** Default error handling UI often prioritizes developer experience (DX) by showing debug info, which can leak internal application structure or sensitive data in production.
**Prevention:** Always gate detailed error reporting and stack traces behind environment checks (e.g., `import.meta.env.DEV`) in UI components to ensure users only see generic, safe error messages.
