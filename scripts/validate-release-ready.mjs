import process from 'node:process';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function value(name) {
  return process.env[name]?.trim() ?? '';
}

function flag(name) {
  const raw = value(name).toLowerCase();
  assert(raw === 'true' || raw === 'false', `${name} must be true or false.`);
  return raw === 'true';
}

function publicHttpsUrl(name, rawValue) {
  assert(rawValue.length > 0, `${name} is required.`);
  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }

  assert(parsed.protocol === 'https:', `${name} must use HTTPS.`);
  assert(!parsed.username && !parsed.password, `${name} must not contain credentials.`);

  const host = parsed.hostname.toLowerCase();
  assert(!isPlaceholderOrPrivateHost(host), `${name} must use a real public hostname.`);
  return parsed;
}

function isPlaceholderOrPrivateHost(host) {
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.test') ||
    host.endsWith('.invalid') ||
    host === 'example.com' ||
    host.endsWith('.example.com')
  ) {
    return true;
  }

  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const private172 = /^172\.(\d{1,2})\./.exec(host);
  if (private172) {
    const second = Number(private172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function evidence(name) {
  const raw = value(name);
  assert(raw.length > 0, `${name} is required when its feature is enabled.`);
  assert(!/^(?:todo|tbd|placeholder|none)$/i.test(raw), `${name} must reference real review evidence.`);
  return raw;
}

function validate() {
  assert(
    value('EXPO_PUBLIC_ENVIRONMENT') === 'production',
    'EXPO_PUBLIC_ENVIRONMENT must be production for a release-ready validation.',
  );

  const releaseMode = value('SHIFT6_RELEASE_MODE');
  assert(
    releaseMode === 'guest-only' || releaseMode === 'connected',
    'SHIFT6_RELEASE_MODE must be guest-only or connected.',
  );

  publicHttpsUrl('SHIFT6_PRIVACY_POLICY_URL', value('SHIFT6_PRIVACY_POLICY_URL'));
  publicHttpsUrl('SHIFT6_SUPPORT_URL', value('SHIFT6_SUPPORT_URL'));
  evidence('SHIFT6_NETWORK_AUDIT_REF');

  const accountCreationEnabled = flag('SHIFT6_ACCOUNT_CREATION_ENABLED');
  const remoteCoachEnabled = flag('SHIFT6_REMOTE_COACH_ENABLED');
  const analyticsEnabled = flag('SHIFT6_ANALYTICS_ENABLED');
  const crashReportingEnabled = flag('SHIFT6_CRASH_REPORTING_ENABLED');
  const apiBaseUrl = value('EXPO_PUBLIC_API_BASE_URL');

  if (releaseMode === 'guest-only') {
    assert(!apiBaseUrl, 'Guest-only release must not configure EXPO_PUBLIC_API_BASE_URL.');
    assert(!accountCreationEnabled, 'Guest-only release cannot enable account creation.');
    assert(!remoteCoachEnabled, 'Guest-only release cannot enable provider-backed Coach.');
  } else {
    publicHttpsUrl('EXPO_PUBLIC_API_BASE_URL', apiBaseUrl);
  }

  if (accountCreationEnabled) {
    assert(releaseMode === 'connected', 'Account creation requires connected release mode.');
    publicHttpsUrl('SHIFT6_ACCOUNT_DELETION_URL', value('SHIFT6_ACCOUNT_DELETION_URL'));
  }

  if (remoteCoachEnabled) {
    assert(releaseMode === 'connected', 'Provider-backed Coach requires connected release mode.');
    evidence('SHIFT6_COACH_PROVIDER_REVIEW_REF');
  }
  if (analyticsEnabled) evidence('SHIFT6_ANALYTICS_REVIEW_REF');
  if (crashReportingEnabled) evidence('SHIFT6_CRASH_REPORTING_REVIEW_REF');

  console.log(
    `Release-ready configuration validated for ${releaseMode} mode. External native/store approval gates still apply.`,
  );
}

try {
  validate();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
