$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskSdk = 'C:\Users\camst\AppData\Local\Android\Sdk'
$taskJdk = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot'
$taskTools = Join-Path $taskSdk 'build-tools\36.0.0'
$taskAndroid = Join-Path $taskSdk 'platforms\android-36\android.jar'
$taskBuild = Join-Path $taskRoot 'build'
New-Item -ItemType Directory -Force -Path $taskBuild, (Join-Path $taskBuild 'classes'), (Join-Path $taskBuild 'dex') | Out-Null
function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Build tool failed: $Executable (exit $LASTEXITCODE)" }
}
$taskJava = Join-Path $taskRoot 'src\com\shift6\qa\a11yprobe\Probe.java'
Invoke-Checked (Join-Path $taskJdk 'bin\javac.exe') @('--release', '8', '-classpath', $taskAndroid, '-d', (Join-Path $taskBuild 'classes'), $taskJava)
Invoke-Checked (Join-Path $taskJdk 'bin\jar.exe') @('--create', '--file', (Join-Path $taskBuild 'classes.jar'), '-C', (Join-Path $taskBuild 'classes'), '.')
Invoke-Checked (Join-Path $taskTools 'd8.bat') @('--min-api', '26', '--lib', $taskAndroid, '--output', (Join-Path $taskBuild 'dex'), (Join-Path $taskBuild 'classes.jar'))
Invoke-Checked (Join-Path $taskTools 'aapt2.exe') @('link', '-I', $taskAndroid, '--manifest', (Join-Path $taskRoot 'AndroidManifest.xml'), '-o', (Join-Path $taskBuild 'unsigned.apk'))
Invoke-Checked (Join-Path $taskJdk 'bin\jar.exe') @('--update', '--file', (Join-Path $taskBuild 'unsigned.apk'), '-C', (Join-Path $taskBuild 'dex'), 'classes.dex')
Invoke-Checked (Join-Path $taskTools 'zipalign.exe') @('-f', '4', (Join-Path $taskBuild 'unsigned.apk'), (Join-Path $taskBuild 'aligned.apk'))
$taskKey = Join-Path $taskBuild 'qa-only.p12'
if (!(Test-Path -LiteralPath $taskKey)) {
    Invoke-Checked (Join-Path $taskJdk 'bin\keytool.exe') @('-genkeypair', '-keystore', $taskKey, '-storetype', 'PKCS12', '-storepass', 'qa-only-not-for-release', '-keypass', 'qa-only-not-for-release', '-alias', 'qa', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '3650', '-dname', 'CN=Shift6 Local QA Only')
}
$taskApk = Join-Path $taskRoot 'a11y-probe.apk'
Invoke-Checked (Join-Path $taskTools 'apksigner.bat') @('sign', '--ks', $taskKey, '--ks-pass', 'pass:qa-only-not-for-release', '--key-pass', 'pass:qa-only-not-for-release', '--ks-key-alias', 'qa', '--out', $taskApk, (Join-Path $taskBuild 'aligned.apk'))
Invoke-Checked (Join-Path $taskTools 'apksigner.bat') @('verify', '--verbose', '--print-certs', $taskApk)
Invoke-Checked (Join-Path $taskTools 'aapt2.exe') @('dump', 'badging', $taskApk)
$taskReceipt = [ordered]@{
    builtAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    host = $env:COMPUTERNAME
    sdkPlatform = 36
    buildTools = '36.0.0'
    jdk = $taskJdk
    package = 'com.shift6.qa.a11yprobe'
    deviceInstalled = $false
    deviceExecuted = $false
    apk = $taskApk
    apkSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $taskApk).Hash
    sourceHashes = @('src\com\shift6\qa\a11yprobe\Probe.java', 'AndroidManifest.xml', 'build.ps1') | ForEach-Object {
        @{ path = $_; sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $taskRoot $_)).Hash }
    }
}
$taskReceipt | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 (Join-Path $taskRoot 'build-receipt.json')
