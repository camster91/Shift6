# Sentinel's Journal - Critical Security Learnings

## 2025-05-15 - Security Hardening and Configuration Management
**Vulnerability:** Hardcoded credentials and placeholders in build configurations (Android signing passwords).
**Learning:** Hardcoding even placeholders or redacted values in sensitive areas like `build.gradle` can lead to accidental exposure of credentials or brittle configurations. Using environment variables ensures better security and flexibility across different environments.
**Prevention:** Always use environment variables for any sensitive data or environment-specific identifiers. Document these requirements in a `.env.example` file.

## 2026-07-06 - Defense-in-Depth Input Validation and CI Hardening
**Vulnerability:** Information leakage via stack traces in Error Boundaries and potential DoS via oversized input strings. CI failures due to invalid Docker tags.
**Learning:** Hardening UI error boundaries by removing stack traces prevents exposing internal logic. Defense-in-depth for inputs requires both UI-level `maxLength` and state-level truncation (e.g., in Context or Reducers) to protect against bypassed client validation. Docker registry names must be strictly lowercase.
**Prevention:** Use generic error messages in production UI. Enforce string length limits at both the input component and the state management layer. Ensure CI workflows explicitly lowercase repository names for Docker tagging.
