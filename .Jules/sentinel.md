# Sentinel's Journal - Critical Security Learnings

## 2025-05-15 - Security Hardening and Configuration Management
**Vulnerability:** Hardcoded credentials and placeholders in build configurations (Android signing passwords).
**Learning:** Hardcoding even placeholders or redacted values in sensitive areas like `build.gradle` can lead to accidental exposure of credentials or brittle configurations. Using environment variables ensures better security and flexibility across different environments.
**Prevention:** Always use environment variables for any sensitive data or environment-specific identifiers. Document these requirements in a `.env.example` file.

## 2025-05-20 - Input Validation and Defense in Depth
**Vulnerability:** Lack of input length limits on user-provided strings (names, emails, workout notes).
**Learning:** Relying solely on frontend `maxLength` is insufficient as state can be manipulated or bypassed via direct context calls or cloud sync. Sanitizing data at the context level (e.g., slicing strings in the state provider) provides a critical second layer of defense.
**Prevention:** Always enforce `maxLength` on UI inputs AND implement context-level sanitization for any user-provided data that persists in the application state.
