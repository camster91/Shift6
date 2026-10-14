"""Read-only foreground preflight for the approved synthetic Android QA surfaces."""
import re

ALLOWED = frozenset({
    'com.shift6.app', 'com.shift6.qa.receiver', 'com.android.intentresolver',
    'com.android.settings', 'com.google.android.permissioncontroller',
    'com.android.permissioncontroller', 'com.google.android.documentsui',
    'com.android.documentsui', 'android', 'com.android.systemui',
})

def foreground_package(activity_dump):
    matches = re.findall(r'^\s*topResumedActivity=ActivityRecord\{[^\n]*?\bu\d+\s+([^\s/]+)/', activity_dump, re.MULTILINE)
    if len(matches) != 1:
        raise RuntimeError('One authoritative foreground activity is required for Android QA.')
    return matches[0]

def require_surface(adb, expected=None):
    package = foreground_package(adb('shell', 'dumpsys', 'activity', 'activities').decode(errors='replace'))
    if package not in ALLOWED or (expected is not None and package != expected):
        raise RuntimeError('Android QA foreground outside the requested surface: ' + package)
    return package

def require_snapshot_scope(snapshot):
    packages = {n.get('package') for n in snapshot.get('activeWindowNodes', []) if n.get('package')}
    if not packages or not packages.issubset(ALLOWED):
        raise RuntimeError('Native snapshot active tree is outside synthetic SHIFT6 QA scope.')
