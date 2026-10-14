# Local QA accessibility observer

Separate package `com.shift6.qa.a11yprobe`, self-targeted instrumentation `com.shift6.qa.a11yprobe.Probe`. No activity/launcher, requested permissions, network code, accessibility-service component or app-data access. It does not perform node actions, inject events, launch Shift6 or change accessibility settings. `setServiceInfo` changes only its temporary UiAutomation observer's retrieval/view-ID flags.

Android documents that [FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES](https://developer.android.com/reference/android/app/UiAutomation#FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES) leaves existing accessibility services running. The observer obtains [getUiAutomation(int)](https://developer.android.com/reference/android/app/Instrumentation#getUiAutomation(int)) with that flag. Whether TalkBack actually remains active during/after this APK's execution still requires device verification. Avoid running another UiAutomation/uiautomator session concurrently.

Build only (PowerShell, no device actions):

```powershell
Set-Location 'C:\Users\camst\Documents\Codex\2026-10-12\let-s-install-https-github-com\shift6-native-qa\a11y-probe'
& .\build.ps1
```

Requires the installed Android SDK platform/build tools 36 and JDK 21 paths recorded in `build.ps1`. No dependency downloads. `a11y-probe.apk` is locally signed with a QA-only certificate; its intentionally public local key/password must never be used for a release. `build-receipt.json` records APK/source SHA256 and host. The current `build.log` is empty and is not compiler evidence; independent signature, manifest and hash checks corroborate this artifact. Rebuilds may differ in ZIP timestamps/signature bytes; compare against the current receipt.

Root-owned device commands (provided only; the worker has not installed/run the probe):

```powershell
$qaAdb = 'C:\Users\camst\AppData\Local\Android\Sdk\platform-tools\adb.exe'
$qaSerial = 'emulator-5554' # Replace with the root agent's verified current device serial.
& $qaAdb -s $qaSerial install -r .\a11y-probe.apk
& $qaAdb -s $qaSerial shell am instrument -w -r com.shift6.qa.a11yprobe/com.shift6.qa.a11yprobe.Probe
& $qaAdb -s $qaSerial exec-out run-as com.shift6.qa.a11yprobe cat cache/a11y-snapshot.json > .\snapshot.json
```

Optional connection-observation run, also root-owned:

```powershell
& $qaAdb -s $qaSerial shell am instrument -w -r -e holdConnectedMs 5000 com.shift6.qa.a11yprobe/com.shift6.qa.a11yprobe.Probe
```

`holdConnectedMs` accepts only a decimal string from `0` through `5000` (default `0`; signs, spaces, leading zeros and other types are rejected). After UiAutomation connects with the service-preservation flag and its own retrieval flags are set, status code `1` explicitly reports `observerConnected=true`, `status=observer_connected`, requested hold and automation flags. Root can inspect services concurrently during this bounded read-only hold. The JSON records requested/actual hold and connected flag; its capture timestamp and 10-second traversal budget start after the hold. The connected status is not a successful snapshot; require the final success status/JSON too. TalkBack coexistence still requires root observation during the confirmed connected interval.

The prior B31D APK, exact Probe1C04 source, manifest, build script and receipt are preserved under `versions/b31d2de0/`; their hashes were rechecked before this change.

Navigate to the intended synthetic Shift6 screen with TalkBack active before invoking instrumentation. No launcher means installation does not provide a home-screen icon. Starting instrumentation targets the probe itself, not Shift6. Confirm `success=true` in the fresh instrumentation status and JSON and the current `capturedAtEpochMillis` before using output. A failed execution may leave an older cache file if writing fails; never interpret that file as a fresh successful snapshot. The package can be removed separately by root after QA.

The dump includes fresh active-window root plus interactive window metadata and flat native-node trees with package, text, content description, view ID, class, visibility, bounds, enabled/editable state, input/accessibility focus and available action IDs/labels. Node IDs are globally unique in one dump, parent `-1` identifies each root; active tree and window trees intentionally can contain the same native element. Values are sequential live observations, not an atomic snapshot or evidence that screen-reader traversal/speech is usable.

Bounds: 5,000 nodes globally, 128 levels, 32 windows, 2,048 UTF-16 characters per string, 1,000,000 string characters across the report and 64 actions per node. Traversal checks a 10-second deadline between reads; individual platform IPC calls may take longer. Every limit, missing child/window root or failed active-root refresh appears in `limitations`, with `complete=false`. `complete=true` only means no limitation was detected while reading the exposed trees; it does not prove all app content is accessible. Absent active root or connection/read/write exceptions produce explicit failure status and, where writable, a failure JSON with sanitized exception class.

Node text can contain private information. Run only against approved synthetic QA data, keep the dump local, and do not publish it unreviewed. No actual app records, focus or service settings are changed by the source; this claim is source/build evidence, with runtime behavior still pending independent review and root device execution.
