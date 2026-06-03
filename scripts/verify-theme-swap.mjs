import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tmp = path.join(root, '.tmp-verify');
if (!fs.existsSync(tmp)) { console.error('run npm run verify first'); process.exit(1); }

function run(cmd) { console.log(`$ ${cmd}`); execSync(cmd, { cwd: tmp, stdio: 'inherit' }); }

// 清空種子
fs.writeFileSync(path.join(tmp, 'public/assets/data/events.json'), '[]\n');
fs.writeFileSync(path.join(tmp, 'public/assets/data/timeline.json'), '[]\n');

// agent 風格：非互動產生器
run('npx ng generate @raybird/historical-map-schematics:add-period --id=ming --label=明朝 ' +
    '--start-year=1368 --end-year=1644 --color=#C8102E --description=明朝 --interactive=false');
run('npx ng generate @raybird/historical-map-schematics:add-event --id=ming-001 --title=靖難之役 ' +
    '--description=test --start=1399 --end=1402 --period=明朝 --period-id=ming ' +
    '--location-name=南京 --lat=32.06 --lng=118.8 --categories=軍事 --keywords=朱棣 --interactive=false');

run('npm run test:data');
run('npm run build');
console.log('✓ verify-theme-swap passed (SC-2)');
