# QA default-flag multiwindow observer — accessibility OFF only

Separate self-targeted package `com.shift6.qa.a11yprobedefault`, instrumentation `com.shift6.qa.a11yprobedefault.Probe`. No launcher/activity, requested permissions, network, accessibility service, node actions, event injection, shell identity adoption, setting writes or Shift6 data access. This new sibling does not modify the frozen service-preserving `a11y-probe` artifact.

This variant calls `getUiAutomation(0)`. Android documents that [default UiAutomation suppresses accessibility services](https://developer.android.com/reference/android/app/UiAutomation#FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES). It is unsuitable for TalkBack-on QA. **Before obtaining UiAutomation**, it reads [AccessibilityManager.isEnabled()](https://developer.android.com/reference/android/view/accessibility/AccessibilityManager#isEnabled()) and `Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES`. It refuses if the manager reports enabled OR the configured-service string is nonempty; unavailable manager or read exceptions also fail. The refusal is `success=false`, sanitized error class, and (when applicable) `refusalReason=accessibility_services_enabled_or_configured`. It makes no service-setting writes. Default UiAutomation can temporarily suppress services if the required Off condition changes. These checks are sequential observations, not a lock against an external actor enabling a service between guard and connection, so they cannot guarantee absence of suppression in that race; root must keep accessibility off during this run.

Build only; installed SDK36/build-tools36.0.0 and JDK21 paths are in `build.ps1`:

```powershell
Set-Location 'C:\Users\camst\Documents\Codex\2026-10-12\let-s-install-https-github-com\shift6-native-qa\a11y-probe-default'
& .\build.ps1
```

The locally signed QA-only APK is `a11y-probe.apk`, identified by the sibling package. The key/password is deliberately QA-only and must never be used for releases. `build-receipt.json` records host, APK/source hashes and unexecuted-device state. Build tool output is available from the worker's tool receipt; no empty file is claimed as compiler evidence.

Root-owned commands, supplied only; the worker has not installed or executed this variant:

```powershell
$qaAdb = 'C:\Users\camst\AppData\Local\Android\Sdk\platform-tools\adb.exe'
$qaSerial = 'emulator-5554' # Replace with the verified current device serial.
& $qaAdb -s $qaSerial install -r .\a11y-probe.apk
& $qaAdb -s $qaSerial shell am instrument -w -r com.shift6.qa.a11yprobedefault/com.shift6.qa.a11yprobedefault.Probe
& $qaAdb -s $qaSerial exec-out run-as com.shift6.qa.a11yprobedefault cat cache/a11y-snapshot.json > .\snapshot.json
```

Optional `-e holdConnectedMs 5000` accepts canonical decimal strings `0`..`5000`, default `0`. Status code `1` reports `observerConnected=true`, `status=observer_connected`, `automationFlags=0` and requested hold only after the guard, connection and the temporary observer's interactive-window/view-ID retrieval flags. The bounded read-only hold precedes traversal; the JSON records requested/actual hold and resets the capture timestamp and 10-second traversal budget after it. Connection status is not final capture success.

The protocol matches the prior observer: fresh active root plus interactive windows, flat native-node trees (package, text/content description, view ID/class, visible/enabled/editable, input/accessibility focus, bounds and available action IDs/labels). It reads available actions without executing them. Active and window trees can duplicate native elements; IDs are global per report and parent `-1` denotes roots. It is sequential live evidence, not an atomic snapshot or human usability proof.

Limits: 5,000 nodes total, 128 depth, 32 windows, 2,048 UTF-16 characters per string, 1,000,000 string characters total and 64 actions per node. Ten-second traversal checks occur between platform reads; IPC itself may take longer. Missing/failed roots or children and every truncation mark `complete=false` with explicit `limitations`. Complete means no detected limit while reading exposed trees, not all content accessible. Missing active root or connection/read/write errors fail explicitly. Use only fresh final `success=true` status/JSON with current capture timestamp: a failed write can leave an older cache file.

Use approved synthetic data only. Node text may be private; keep dumps local and review before sharing. Runtime refusal with accessibility on, successful multiwindow capture with accessibility off and lifecycle behavior are pending root device testing and independent review. No native success is inferred from compilation.
