# SHIFT6 private speech fork

Upstream: [jamsch/expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition).
Published npm artifact `expo-speech-recognition@57.1.1`, downloaded 2026-10-13;
registry SHA512 integrity verified before extraction:
`sha512-e1RalFEvc7yui9Jnf1NiEYHT0jSPeH4hbMTafj1yjvcKN7HhZ7VrQigGUhBDB9AnDNjtPugbyPuCIjwHBBOCyw==`.
Upstream source inspected at commit `8b31e399b1bbc7b89cd82acdad595a14dc57daff`.
The original MIT LICENSE is retained. This is not an upstream release.

Private changes:

- iOS rejects a requested locale that does not support on-device recognition before
  preparing the audio request; it cannot silently omit the local-only requirement.
- iOS exposes a per-locale on-device capability probe, including availability.
- Android removes the three raw recognition-result payload log calls.
- Package version is `57.1.1-shift6.1`. Removed upstream development dependencies and
  prepare/prepublish lifecycle scripts; the published JavaScript build is retained.

The app adapter uses only the native module, refuses Android below API33, checks
installed language availability, explicitly requires on-device recognition, and
never supplies an audio file, persistence option, cloud fallback or contextual
user data. Upstream web/cloud/recording APIs remain in the dependency but are not
exposed by the SHIFT6 adapter. App TypeScript validation excludes dependency source,
as it does for installed dependencies. Native compilation and physical-device
recognition still require independent validation.

`vendor/manifest.json` inventories retained files and their SHA256 hashes. Replacing
this fork requires retaining both privacy fixes or a verified equivalent upstream
implementation. Permission prompts are configured by the retained upstream plugin;
permissions are requested at runtime only after the user chooses voice entry.
