import path from 'node:path';
import { validateVendorDirectory } from './vendor-inventory.mjs';
const root = path.resolve('vendor');
const count = await validateVendorDirectory(root);
console.log(`Verified ${count} vendored source and license files.`);
