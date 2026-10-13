import { stripTypeScriptTypes } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Compile only these authoritative, dependency-free contract modules. Never
// duplicate the mobile safety rules or silently bypass their validation.
const modules = ['contracts', 'apiProtocol', 'coachSafety', 'coach'];
await mkdir(new URL('./build/', import.meta.url), { recursive: true });
for (const name of modules) {
  const source = await readFile(new URL(`../../src/services/${name}.ts`, import.meta.url), 'utf8');
  let compiled = stripTypeScriptTypes(source);
  for (const dependency of modules)
    compiled = compiled.replaceAll(`'./${dependency}'`, `'./${dependency}.mjs'`);
  await writeFile(new URL(`./build/${name}.mjs`, import.meta.url), compiled);
}
