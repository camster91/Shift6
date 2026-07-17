# Sentinel's Journal - Critical Security Learnings

## 2025-05-15 - Security Hardening and Configuration Management
**Vulnerability:** Hardcoded credentials and placeholders in build configurations (Android signing passwords).
**Learning:** Hardcoding even placeholders or redacted values in sensitive areas like `build.gradle` can lead to accidental exposure of credentials or brittle configurations. Using environment variables ensures better security and flexibility across different environments.
**Prevention:** Always use environment variables for any sensitive data or environment-specific identifiers. Document these requirements in a `.env.example` file.

## 2026-06-08 - Loose Client-side Inputs and Usability-Security Balance in Login Flows
**Vulnerability:** Lack of client-side validation and sanitization on inputs such as `displayName` (permitting potential rendering issues or HTML injection) and authentication flows.
**Learning:** Sanitizing user-provided strings like `displayName` (by stripping HTML tags and truncating to a maximum of 50 characters) ensures render safety and data integrity. Crucially, while validation of password complexity and length constraints (e.g. 8+ characters) must be strictly enforced during registration, applying those exact same constraints to the login flow is a dangerous anti-pattern. Doing so can permanently lock out legacy users whose credentials do not satisfy newly updated strength requirements.
**Prevention:** Always sanitize text inputs at the boundaries of data storage/processing. Decouple registration validation from login validation so that login only asserts the presence of a non-empty payload, preventing inadvertent account lockouts.
