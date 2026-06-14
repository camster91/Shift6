# Sentinel's Journal - Critical Security Learnings

## 2025-05-15 - Security Hardening and Configuration Management
**Vulnerability:** Hardcoded credentials and placeholders in build configurations (Android signing passwords).
**Learning:** Hardcoding even placeholders or redacted values in sensitive areas like `build.gradle` can lead to accidental exposure of credentials or brittle configurations. Using environment variables ensures better security and flexibility across different environments.
**Prevention:** Always use environment variables for any sensitive data or environment-specific identifiers. Document these requirements in a `.env.example` file.

## 2026-06-14 - Input Length Hardening
**Vulnerability:** Missing input length limits on user-controllable text fields (name, email, notes).
**Learning:** Without explicit length constraints, the application was vulnerable to oversized payload attacks that could lead to client-side performance degradation or backend storage exhaustion.
**Prevention:** Enforce 'maxLength' on all UI inputs and implement context-level truncation as a defense-in-depth layer to ensure data remains within expected bounds even if UI checks are bypassed.
