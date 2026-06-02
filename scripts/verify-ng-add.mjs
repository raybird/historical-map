import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tmp = path.join(root, '.tmp-verify');
fs.rmSync(tmp, { recursive: true, force: true });
fs.cpSync(path.join(root, 'example-app'), tmp, {
  recursive: true,
  filter: (src) => !src.includes('node_modules') && !src.includes('.angular') && !src.includes(`${path.sep}dist`),
});

function run(cmd, cwd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

run('npm install', tmp);
run(`npm install ${path.join(root, 'schematics')}`, tmp);
run('npx ng add @kevin/historical-map-schematics --skip-confirmation ' +
    '--appTitle="Demo Map" --minYear=-3000 --maxYear=2025 --pixelsPerYear=5 --includeSampleData', tmp);
run('npm run test:data', tmp);
run('npm run build', tmp);
console.log('✓ verify-ng-add passed');
