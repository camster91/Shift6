import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repositoryRoot = process.cwd();

async function readJson(relativePath) {
  const filePath = path.join(repositoryRoot, relativePath);
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function validate() {
  const appConfig = await readJson('app.json');
  const easConfig = await readJson('eas.json');
  const envExample = await readFile(path.join(repositoryRoot, '.env.example'), 'utf8');
  const expo = appConfig.expo;

  assert(expo?.name === 'SHIFT6', 'app.json must use the SHIFT6 display name.');
  assert(expo?.slug === 'shift6', 'app.json must use the stable shift6 slug.');
  assert(expo?.scheme === 'shift6', 'app.json must define the shift6 deep-link scheme.');
  assert(expo?.ios?.bundleIdentifier === 'com.shift6.app', 'iOS bundle ID is missing or changed.');
  assert(expo?.android?.package === 'com.shift6.app', 'Android package is missing or changed.');
  assert(expo?.web?.output === 'static', 'The web preview must use static output.');

  const plugins = (expo?.plugins ?? []).map((plugin) =>
    Array.isArray(plugin) ? plugin[0] : plugin,
  );
  for (const requiredPlugin of [
    'expo-router',
    'expo-sqlite',
    'expo-secure-store',
    'expo-notifications',
    'expo-system-ui',
    '@kingstinct/react-native-healthkit',
    'react-native-health-connect',
  ]) {
    assert(plugins.includes(requiredPlugin), `app.json is missing the ${requiredPlugin} plugin.`);
  }

  for (const profile of ['development', 'preview', 'production']) {
    assert(easConfig.build?.[profile], `eas.json is missing the ${profile} build profile.`);
  }
  assert(easConfig.cli?.appVersionSource === 'remote', 'eas.json must use remote app versioning.');
  assert(
    /(?:^|\n)EXPO_PUBLIC_ENVIRONMENT=/.test(envExample),
    '.env.example must document the environment.',
  );
  assert(
    /(?:^|\n)EXPO_PUBLIC_API_BASE_URL=/.test(envExample),
    '.env.example must document the API base URL.',
  );
  assert(
    !/(?:SECRET|PRIVATE_KEY|PASSWORD|ACCESS_TOKEN)=\S+/.test(envExample),
    '.env.example must not contain secret values.',
  );

  console.log(
    'Validated Expo identifiers, native plugins, web output, EAS profiles, and public environment keys.',
  );
}

validate().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
