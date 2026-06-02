import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'src/collection.json',
  'src/ng-add/schema.json',
  'src/add-event/schema.json',
  'src/add-period/schema.json',
  'src/add-extension-field/schema.json',
];
let ok = true;
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`MISSING: ${rel}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('templates/schemas present');
