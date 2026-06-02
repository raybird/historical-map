# Historical Map Schematics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一組 Angular Schematics（`ng add` + 三個 `ng generate` 產生器），讓使用者一鍵搭出可立即互動的歷史地圖 app，並讓 AI agent 能依主題批次補充事件/分期 JSON。

**Architecture:** Monorepo 含兩部分：`schematics/`（可發佈的 collection 套件，TypeScript 編譯成 JS）與 `example-app/`（Angular workspace，作為 `ng add`/`ng g` 的即時驗證與回歸靶）。schematics 用 `Tree` + template files 產生 app 骨架，所有可變值來自 `ng add` 提問並寫入集中設定檔 `historical-map.config.ts`。產生器以 JSON 解析（非字串拼接）安全寫入資料檔，並支援非互動旗標供 agent 批次呼叫。

**Tech Stack:** `@angular-devkit/schematics` + `@schematics/angular` utilities、TypeScript、Jasmine（schematics 用 `SchematicTestRunner`）、Angular 20 / NgRx 20 / Leaflet / Fuse.js（產出的 app）。

**來源參考（複製/改寫對象）：** `~/Documents/RCodes/cap-map/webapp/src`（架構基準）、`~/Documents/RCodes/three-kingdoms-map/webapp`。

---

## 約定

- 所有指令預設在 monorepo 根 `~/Documents/RCodes/historical-map/` 執行，除非註明。
- schematics 模板檔案一律以 `.template` 結尾（避免被 TS 編譯器處理），內含 `<%= optionName %>` 替換與 `__name@dasherize__` 檔名替換。
- 「複製並改寫」任務：用 `Read` 讀來源檔，貼到模板路徑，依步驟列出的「精確改寫」調整（主要是把硬編碼常數換成 `<%= %>` 或從 config 讀取），其餘原樣保留。

---

## Phase 0：Monorepo 骨架

### Task 1：建立 workspace 根與目錄結構

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: 初始化 git 與根 package.json**

Run:
```bash
cd ~/Documents/RCodes/historical-map
git init
```

Create `package.json`:
```json
{
  "name": "historical-map-monorepo",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build:schematics": "tsc -p schematics/tsconfig.json && npm run copy:templates",
    "copy:templates": "node schematics/scripts/copy-templates.mjs",
    "test:schematics": "npm run build:schematics && jasmine --config=schematics/jasmine.json",
    "verify": "node scripts/verify-ng-add.mjs"
  }
}
```

- [ ] **Step 2: 建立 .gitignore**

Create `.gitignore`:
```
node_modules/
schematics/src/**/*.js
schematics/src/**/*.d.ts
schematics/src/**/*.js.map
example-app/.angular/
example-app/dist/
*.log
.tmp-verify/
```

- [ ] **Step 3: 建立 README 佔位**

Create `README.md`:
```markdown
# Historical Map Schematics

Angular Schematics 一鍵搭建可互動的歷史地圖 app。詳見 `docs/superpowers/specs/`。

## 開發
- `npm run build:schematics` — 編譯 schematics + 複製模板
- `npm run test:schematics` — 跑 schematics 單元測試
- `npm run verify` — 對 example-app 跑 ng add 並建置驗證
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore README.md docs
git commit -m "chore: init historical-map monorepo with spec and plan"
```

### Task 2：schematics 套件骨架

**Files:**
- Create: `schematics/package.json`
- Create: `schematics/tsconfig.json`
- Create: `schematics/src/collection.json`
- Create: `schematics/jasmine.json`
- Create: `schematics/scripts/copy-templates.mjs`

- [ ] **Step 1: schematics/package.json**

```json
{
  "name": "@kevin/historical-map-schematics",
  "version": "0.0.1",
  "description": "Angular schematics for building interactive historical map apps",
  "schematics": "./src/collection.json",
  "ng-add": { "save": "devDependencies" },
  "dependencies": {
    "@angular-devkit/core": "^20.3.0",
    "@angular-devkit/schematics": "^20.3.0",
    "@schematics/angular": "^20.3.0",
    "jsonc-parser": "^3.3.1"
  },
  "devDependencies": {
    "@types/jasmine": "~5.1.0",
    "@types/node": "^22.0.0",
    "jasmine": "~5.9.0",
    "typescript": "~5.9.2"
  }
}
```

- [ ] **Step 2: schematics/tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["es2022", "dom"],
    "declaration": true,
    "module": "commonjs",
    "moduleResolution": "node",
    "target": "es2022",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "rootDir": "src",
    "outDir": "src",
    "types": ["jasmine", "node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*_spec.ts", "src/**/files/**"]
}
```

- [ ] **Step 3: collection.json（先宣告四個 schematic，index 之後實作）**

Create `schematics/src/collection.json`:
```json
{
  "$schema": "../node_modules/@angular-devkit/schematics/collection-schema.json",
  "schematics": {
    "ng-add": {
      "description": "Scaffold a complete interactive historical map app",
      "factory": "./ng-add/index#ngAdd",
      "schema": "./ng-add/schema.json"
    },
    "add-event": {
      "description": "Add a historical event to events.json",
      "factory": "./add-event/index#addEvent",
      "schema": "./add-event/schema.json"
    },
    "add-period": {
      "description": "Add a timeline period to timeline.json",
      "factory": "./add-period/index#addPeriod",
      "schema": "./add-period/schema.json"
    },
    "add-extension-field": {
      "description": "Add an extension field to the HistoricalEvent interface",
      "factory": "./add-extension-field/index#addExtensionField",
      "schema": "./add-extension-field/schema.json"
    }
  }
}
```

- [ ] **Step 4: jasmine.json**

Create `schematics/jasmine.json`:
```json
{
  "spec_dir": "schematics/src",
  "spec_files": ["**/*_spec.js"],
  "random": false
}
```

- [ ] **Step 5: copy-templates.mjs（tsc 不複製非 .ts 檔，需手動把 files/ 與 *.json 複製到輸出）**

因 `outDir === rootDir === src`，模板檔已就地，無需複製；此腳本改為驗證 `collection.json` 與各 `schema.json` 存在，避免漏檔。

Create `schematics/scripts/copy-templates.mjs`:
```js
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
```

- [ ] **Step 6: 安裝 schematics 相依並編譯空集合**

Run:
```bash
cd ~/Documents/RCodes/historical-map/schematics && npm install
cd ~/Documents/RCodes/historical-map && npm run build:schematics
```
Expected: `templates/schemas present`（此時尚無 schema.json，預期 MISSING + exit 1 — 屬正常，下一階段補齊；可暫時手動建立空 schema 佔位讓編譯通過，見 Task 7/15/16/17）

- [ ] **Step 7: Commit**

```bash
git add schematics
git commit -m "chore: add schematics package skeleton and collection.json"
```

### Task 3：建立 example-app（驗證靶）

**Files:**
- Create: `example-app/`（由 Angular CLI 產生）

- [ ] **Step 1: 產生 Angular workspace**

Run:
```bash
cd ~/Documents/RCodes/historical-map
npx -p @angular/cli@20 ng new example-app --routing=false --style=css --skip-git --skip-tests=false --ssr=false --defaults
```
Expected: 在 `example-app/` 產生標準 Angular 20 專案。

- [ ] **Step 2: 確認可建置**

Run:
```bash
cd ~/Documents/RCodes/historical-map/example-app && npm run build
```
Expected: build 成功。

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/RCodes/historical-map
git add example-app
git commit -m "chore: add example-app angular workspace as schematics test target"
```

---

## Phase 1：測試框架驗證

### Task 4：證明 SchematicTestRunner 可運作

**Files:**
- Create: `schematics/src/utils/testing.ts`
- Test: `schematics/src/utils/testing_spec.ts`

- [ ] **Step 1: 寫共用測試輔助**

Create `schematics/src/utils/testing.ts`:
```ts
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

export function createRunner(): SchematicTestRunner {
  return new SchematicTestRunner(
    '@kevin/historical-map-schematics',
    path.join(__dirname, '..', 'collection.json'),
  );
}
```

- [ ] **Step 2: 寫驗證 collection 載入的測試（先失敗）**

Create `schematics/src/utils/testing_spec.ts`:
```ts
import { createRunner } from './testing';

describe('schematics harness', () => {
  it('loads the collection', () => {
    const runner = createRunner();
    expect(runner.engine.createCollection('@kevin/historical-map-schematics')).toBeTruthy();
  });
});
```

- [ ] **Step 3: 編譯並執行**

Run:
```bash
cd ~/Documents/RCodes/historical-map && npm run test:schematics
```
Expected: 因 collection 內 factory 指向尚未存在的 index 檔，建立 collection 可能成功（只解析 JSON）→ 測試 PASS。若 build 因缺 schema.json 失敗，先在各 schematic 目錄放最小 `schema.json`（`{"$schema":"http://json-schema.org/schema","$id":"X","title":"X","type":"object","properties":{}}`）讓 build 通過。

- [ ] **Step 4: Commit**

```bash
git add schematics/src/utils/testing.ts schematics/src/utils/testing_spec.ts
git commit -m "test: add schematics test harness"
```

---

## Phase 2：共用工具（utils）

### Task 5：JSON 資料檔讀寫工具

**Files:**
- Create: `schematics/src/utils/json-file.ts`
- Test: `schematics/src/utils/json-file_spec.ts`

- [ ] **Step 1: 寫失敗測試**

Create `schematics/src/utils/json-file_spec.ts`:
```ts
import { Tree } from '@angular-devkit/schematics';
import { readJsonArray, writeJsonArray, DATA_PATHS } from './json-file';

describe('json-file utils', () => {
  it('reads an array from the tree', () => {
    const tree = Tree.empty();
    tree.create(DATA_PATHS.events, JSON.stringify([{ id: 'a' }]));
    expect(readJsonArray(tree, DATA_PATHS.events)).toEqual([{ id: 'a' }]);
  });

  it('writes a formatted array back', () => {
    const tree = Tree.empty();
    tree.create(DATA_PATHS.events, '[]');
    writeJsonArray(tree, DATA_PATHS.events, [{ id: 'b' }]);
    const text = tree.read(DATA_PATHS.events)!.toString('utf-8');
    expect(JSON.parse(text)).toEqual([{ id: 'b' }]);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('throws when file missing', () => {
    const tree = Tree.empty();
    expect(() => readJsonArray(tree, DATA_PATHS.events)).toThrowError(/not found/);
  });
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `cd ~/Documents/RCodes/historical-map && npm run test:schematics`
Expected: FAIL（`json-file` 模組不存在）

- [ ] **Step 3: 實作**

Create `schematics/src/utils/json-file.ts`:
```ts
import { Tree } from '@angular-devkit/schematics';

export const DATA_PATHS = {
  events: 'public/assets/data/events.json',
  timeline: 'public/assets/data/timeline.json',
};

export function readJsonArray<T = unknown>(tree: Tree, filePath: string): T[] {
  const buffer = tree.read(filePath);
  if (!buffer) {
    throw new Error(`Data file not found: ${filePath}`);
  }
  const parsed = JSON.parse(buffer.toString('utf-8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array in ${filePath}`);
  }
  return parsed as T[];
}

export function writeJsonArray(tree: Tree, filePath: string, data: unknown[]): void {
  const text = JSON.stringify(data, null, 2) + '\n';
  if (tree.exists(filePath)) {
    tree.overwrite(filePath, text);
  } else {
    tree.create(filePath, text);
  }
}
```

- [ ] **Step 4: 執行確認通過**

Run: `npm run test:schematics`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add schematics/src/utils/json-file.ts schematics/src/utils/json-file_spec.ts
git commit -m "feat: add json-file read/write util for schematics"
```

### Task 6：資料驗證工具

**Files:**
- Create: `schematics/src/utils/validation.ts`
- Test: `schematics/src/utils/validation_spec.ts`

- [ ] **Step 1: 寫失敗測試**

Create `schematics/src/utils/validation_spec.ts`:
```ts
import { validateEvent, validatePeriod, EventInput, PeriodInput } from './validation';

const periods = [{ id: 'p1' }];
const existingIds = new Set(['e1']);

function baseEvent(): EventInput {
  return {
    id: 'e2', title: 't', description: 'd',
    start: '100', end: '100', period: 'P', periodId: 'p1',
    locationName: 'L', lat: 25, lng: 121,
    adminDivisions: [], categories: [], keywords: [], relatedEvents: [],
  };
}

describe('validateEvent', () => {
  it('passes a valid event', () => {
    expect(validateEvent(baseEvent(), periods, existingIds)).toEqual([]);
  });
  it('rejects duplicate id', () => {
    const e = baseEvent(); e.id = 'e1';
    expect(validateEvent(e, periods, existingIds)).toContain('Duplicate event id: e1');
  });
  it('rejects unknown periodId', () => {
    const e = baseEvent(); e.periodId = 'nope';
    expect(validateEvent(e, periods, existingIds)).toContain('Unknown periodId: nope');
  });
  it('rejects out-of-range latitude', () => {
    const e = baseEvent(); e.lat = 200;
    expect(validateEvent(e, periods, existingIds)).toContain('Latitude out of range: 200');
  });
});

describe('validatePeriod', () => {
  it('rejects bad hex color', () => {
    const p: PeriodInput = { id: 'p2', label: 'L', startYear: 1, endYear: 2, color: 'red', description: '' };
    expect(validatePeriod(p, new Set(['p1']))).toContain('Invalid hex color: red');
  });
  it('rejects endYear < startYear', () => {
    const p: PeriodInput = { id: 'p2', label: 'L', startYear: 5, endYear: 2, color: '#fff', description: '' };
    expect(validatePeriod(p, new Set(['p1']))).toContain('endYear (2) must be >= startYear (5)');
  });
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `npm run test:schematics`
Expected: FAIL（`validation` 不存在）

- [ ] **Step 3: 實作**

Create `schematics/src/utils/validation.ts`:
```ts
export interface EventInput {
  id: string; title: string; description: string;
  start: string; end: string; period: string; periodId: string;
  locationName: string; lat: number; lng: number;
  adminDivisions: string[]; categories: string[]; keywords: string[]; relatedEvents: string[];
}

export interface PeriodInput {
  id: string; label: string; startYear: number; endYear: number; color: string; description: string;
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function validateEvent(
  e: EventInput,
  periods: Array<{ id: string }>,
  existingIds: Set<string>,
): string[] {
  const errors: string[] = [];
  if (!e.id) errors.push('Event id is required');
  if (existingIds.has(e.id)) errors.push(`Duplicate event id: ${e.id}`);
  if (!e.title) errors.push('Event title is required');
  if (!periods.some(p => p.id === e.periodId)) errors.push(`Unknown periodId: ${e.periodId}`);
  if (typeof e.lat !== 'number' || e.lat < -90 || e.lat > 90) errors.push(`Latitude out of range: ${e.lat}`);
  if (typeof e.lng !== 'number' || e.lng < -180 || e.lng > 180) errors.push(`Longitude out of range: ${e.lng}`);
  return errors;
}

export function validatePeriod(p: PeriodInput, existingIds: Set<string>): string[] {
  const errors: string[] = [];
  if (!p.id) errors.push('Period id is required');
  if (existingIds.has(p.id)) errors.push(`Duplicate period id: ${p.id}`);
  if (!HEX.test(p.color)) errors.push(`Invalid hex color: ${p.color}`);
  if (p.endYear < p.startYear) errors.push(`endYear (${p.endYear}) must be >= startYear (${p.startYear})`);
  return errors;
}
```

- [ ] **Step 4: 執行確認通過**

Run: `npm run test:schematics`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add schematics/src/utils/validation.ts schematics/src/utils/validation_spec.ts
git commit -m "feat: add event/period validation util"
```

---

## Phase 3：`ng-add`

### Task 7：ng-add schema 與 options

**Files:**
- Create: `schematics/src/ng-add/schema.json`
- Create: `schematics/src/ng-add/schema.ts`

- [ ] **Step 1: schema.json（含 x-prompt，預設 includeSampleData=true）**

Create `schematics/src/ng-add/schema.json`:
```json
{
  "$schema": "http://json-schema.org/schema",
  "$id": "HistoricalMapNgAdd",
  "title": "Historical Map ng-add options",
  "type": "object",
  "properties": {
    "appTitle": {
      "type": "string",
      "description": "Application title shown in the header",
      "default": "Historical Map",
      "x-prompt": "App 標題？"
    },
    "minYear": {
      "type": "number",
      "description": "Earliest year on the timeline (negative = BCE)",
      "default": -5000,
      "x-prompt": "時間軸最早年份（負值為西元前）？"
    },
    "maxYear": {
      "type": "number",
      "description": "Latest year on the timeline",
      "default": 2025,
      "x-prompt": "時間軸最晚年份？"
    },
    "pixelsPerYear": {
      "type": "number",
      "description": "Horizontal pixels per year",
      "default": 5,
      "x-prompt": "時間軸每年像素？"
    },
    "includeSampleData": {
      "type": "boolean",
      "description": "Seed a runnable demo dataset",
      "default": true,
      "x-prompt": "附帶可運作的展示種子資料？"
    },
    "project": {
      "type": "string",
      "description": "Target Angular project name",
      "$default": { "$source": "projectName" }
    }
  },
  "required": []
}
```

- [ ] **Step 2: schema.ts（options 介面）**

Create `schematics/src/ng-add/schema.ts`:
```ts
export interface NgAddOptions {
  appTitle: string;
  minYear: number;
  maxYear: number;
  pixelsPerYear: number;
  includeSampleData: boolean;
  project?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add schematics/src/ng-add/schema.json schematics/src/ng-add/schema.ts
git commit -m "feat: add ng-add schema and options"
```

### Task 8：核心模板 — models 與集中設定檔

**Files:**
- Create: `schematics/src/ng-add/files/src/app/historical-map.config.ts.template`
- Create: `schematics/src/ng-add/files/src/app/models/event.model.ts.template`
- Create: `schematics/src/ng-add/files/src/app/models/timeline.model.ts.template`

- [ ] **Step 1: 集中設定檔模板**

Create `schematics/src/ng-add/files/src/app/historical-map.config.ts.template`:
```ts
export interface HistoricalMapConfig {
  appTitle: string;
  timeline: { minYear: number; maxYear: number; pixelsPerYear: number };
}

export const historicalMapConfig: HistoricalMapConfig = {
  appTitle: '<%= appTitle %>',
  timeline: {
    minYear: <%= minYear %>,
    maxYear: <%= maxYear %>,
    pixelsPerYear: <%= pixelsPerYear %>,
  },
};
```

- [ ] **Step 2: event.model 模板（核心固定 + 交集擴充）**

Create `schematics/src/ng-add/files/src/app/models/event.model.ts.template`:
```ts
export interface EventLocation {
  name: string;
  coordinates: [number, number]; // [lat, lng]
  adminDivisions: string[];
}

export interface EventDate {
  start: string;
  end: string;
  period: string;
  periodId: string;
}

export interface HistoricalEventBase {
  id: string;
  title: string;
  description: string;
  date: EventDate;
  location: EventLocation;
  categories: string[];
  keywords: string[];
  relatedEvents: string[];
}

// 各專案在此擴充主題專屬欄位；`ng generate add-extension-field` 會操作此介面。
export interface HistoricalEvent extends HistoricalEventBase {}
```

- [ ] **Step 3: timeline.model 模板**

Create `schematics/src/ng-add/files/src/app/models/timeline.model.ts.template`:
```ts
export interface TimelinePeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  startYear: number;
  endYear: number;
  color: string;
  description: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add schematics/src/ng-add/files/src/app/historical-map.config.ts.template schematics/src/ng-add/files/src/app/models
git commit -m "feat: add ng-add model and config templates"
```

### Task 9：NgRx store 模板（複製並改寫）

**Files:**
- Create: `schematics/src/ng-add/files/src/app/store/app.state.ts.template`
- Create: `schematics/src/ng-add/files/src/app/store/actions/{event,map,timeline}.actions.ts.template`
- Create: `schematics/src/ng-add/files/src/app/store/reducers/{event,map,timeline}.reducer.ts.template`
- Create: `schematics/src/ng-add/files/src/app/store/selectors/{event,map,timeline}.selectors.ts.template`

- [ ] **Step 1: 複製來源 store 全部檔案到模板路徑**

來源目錄：`~/Documents/RCodes/cap-map/webapp/src/app/store/`。將下列 10 個檔逐一 `Read` 後寫到對應 `.template` 路徑（內容原樣保留，僅檔名加 `.template`）：
- `app.state.ts` → `app.state.ts.template`
- `actions/event.actions.ts`、`actions/map.actions.ts`、`actions/timeline.actions.ts`
- `reducers/event.reducer.ts`、`reducers/map.reducer.ts`、`reducers/timeline.reducer.ts`
- `selectors/event.selectors.ts`、`selectors/map.selectors.ts`、`selectors/timeline.selectors.ts`

**精確改寫：** 各 reducer 中事件陣列型別若為 `any[]`，改為 `import { HistoricalEvent } from '../../models/event.model';` 並使用 `HistoricalEvent[]`；timeline reducer 的 periods 改為 `TimelinePeriod[]`（`import { TimelinePeriod } from '../../models/timeline.model';`）。其餘原樣。

- [ ] **Step 2: 編譯檢查（確保模板本身語法無誤，靠後續整合測試驗證）**

Run: `cd ~/Documents/RCodes/historical-map && npm run build:schematics`
Expected: 通過（模板為 `.template`，不參與 tsc）。

- [ ] **Step 3: Commit**

```bash
git add schematics/src/ng-add/files/src/app/store
git commit -m "feat: add ng-add ngrx store templates"
```

### Task 10：services 模板（複製並改寫）

**Files:**
- Create: `schematics/src/ng-add/files/src/app/services/event.service.ts.template`
- Create: `schematics/src/ng-add/files/src/app/services/timeline.service.ts.template`
- Create: `schematics/src/ng-add/files/src/app/services/quiz.service.ts.template`

- [ ] **Step 1: 複製三個 service**

來源：`~/Documents/RCodes/cap-map/webapp/src/app/services/`。`Read` 後寫到 `.template`。

**精確改寫：** `event.service.ts` 與 `timeline.service.ts` 的資料 URL 維持 `assets/data/events.json` / `assets/data/timeline.json`（Angular 20 `public/` 內容會被服務於根路徑，故 `assets/...` 正確）。其餘原樣。

- [ ] **Step 2: Commit**

```bash
git add schematics/src/ng-add/files/src/app/services
git commit -m "feat: add ng-add service templates"
```

### Task 11：5 個元件模板（複製並改寫，timeline 改讀 config）

**Files:**
- Create: `schematics/src/ng-add/files/src/app/{map-container,timeline,event-sidebar,search-bar,layer-control}/*.{ts,html,css}.template`
- Create: `schematics/src/ng-add/files/src/app/app.component.{ts,html,css}.template`

- [ ] **Step 1: 複製五個元件 + app 元件**

來源：`~/Documents/RCodes/cap-map/webapp/src/app/` 下各元件資料夾的 `.ts/.html/.css`，以及 `app.component.*`。每檔 `Read` 後寫到對應 `.template`。

- [ ] **Step 2: 精確改寫 timeline.component.ts.template — 改用集中設定**

在 `timeline.component.ts.template` 頂部加入 `import { historicalMapConfig } from '../historical-map.config';`，並把硬編碼欄位（來源行：`minYear = -6000;`、`maxYear = 2025;`、`pixelsPerYear = 10;`）改為：
```ts
minYear = historicalMapConfig.timeline.minYear;
maxYear = historicalMapConfig.timeline.maxYear;
pixelsPerYear = historicalMapConfig.timeline.pixelsPerYear;
```
其餘運算（`trackWidth`、`yearToPixel` 等）因引用 `this.minYear` 等，無需改動。

- [ ] **Step 3: 精確改寫 app.component — 標題改讀 config**

在 `app.component.ts.template` 加入 `import { historicalMapConfig } from './historical-map.config';` 與屬性 `appTitle = historicalMapConfig.appTitle;`。在 `app.component.html.template` 將標題文字替換為 `{{ appTitle }}`（找尋既有 `<h1>`/header 標題節點替換）。

- [ ] **Step 4: 確認元件 standalone 設定**

來源元件採 `standalone: false`（NgModule）。本 schematic 目標為 standalone bootstrap（`app.config.ts` + `provideStore`）。**精確改寫：** 每個元件 `@Component` 移除 `standalone: false`（Angular 20 預設 standalone: true），並在各元件 `imports: [CommonModule, ...]` 補上其模板用到的依賴（`map-container` 等若用到 `@angular/material`、`FormsModule` 需列入）。`app.component.ts` 的 `imports` 須包含其餘 5 個元件 class。

> 註：此為本計畫風險最高的改寫；Task 14 整合建置會抓出遺漏的 import。

- [ ] **Step 5: Commit**

```bash
git add schematics/src/ng-add/files/src/app
git commit -m "feat: add ng-add component templates (standalone, config-driven)"
```

### Task 12：種子資料、驗證 script、AGENTS.md 模板

**Files:**
- Create: `schematics/src/ng-add/files/public/assets/data/events.json.template`
- Create: `schematics/src/ng-add/files/public/assets/data/timeline.json.template`
- Create: `schematics/src/ng-add/files/scripts/validate-events.mjs.template`
- Create: `schematics/src/ng-add/files/AGENTS.md.template`

- [ ] **Step 1: 中性展示種子 timeline.json**

Create `schematics/src/ng-add/files/public/assets/data/timeline.json.template`:
```json
[
  { "id": "ancient", "label": "上古", "startDate": "-3000", "endDate": "-500", "startYear": -3000, "endYear": -500, "color": "#8B7355", "description": "上古時期" },
  { "id": "classical", "label": "古典", "startDate": "-500", "endDate": "500", "startYear": -500, "endYear": 500, "color": "#4169E1", "description": "古典時期" },
  { "id": "modern", "label": "近現代", "startDate": "1500", "endDate": "2025", "startYear": 1500, "endYear": 2025, "color": "#2E8B57", "description": "近現代" }
]
```

- [ ] **Step 2: 中性展示種子 events.json（至少 3 筆，分屬不同分期，座標分散，relatedEvents 互連）**

Create `schematics/src/ng-add/files/public/assets/data/events.json.template`:
```json
[
  {
    "id": "demo-001", "title": "範例事件一", "description": "這是展示用事件，請用 ng generate add-event 取代或補充。",
    "date": { "start": "-1200", "end": "-1200", "period": "上古", "periodId": "ancient" },
    "location": { "name": "雅典", "coordinates": [37.98, 23.73], "adminDivisions": [] },
    "categories": ["政治"], "keywords": ["範例", "上古"], "relatedEvents": ["demo-002"]
  },
  {
    "id": "demo-002", "title": "範例事件二", "description": "第二筆展示事件。",
    "date": { "start": "100", "end": "100", "period": "古典", "periodId": "classical" },
    "location": { "name": "羅馬", "coordinates": [41.9, 12.5], "adminDivisions": [] },
    "categories": ["軍事"], "keywords": ["範例", "古典"], "relatedEvents": ["demo-001"]
  },
  {
    "id": "demo-003", "title": "範例事件三", "description": "第三筆展示事件。",
    "date": { "start": "1789", "end": "1789", "period": "近現代", "periodId": "modern" },
    "location": { "name": "巴黎", "coordinates": [48.85, 2.35], "adminDivisions": [] },
    "categories": ["政治"], "keywords": ["範例", "近現代"], "relatedEvents": []
  }
]
```

- [ ] **Step 3: 通用化 validate-events.mjs**

Create `schematics/src/ng-add/files/scripts/validate-events.mjs.template`（讀 config 年代範圍由 import 取得；schematic 以 `<%= minYear %>` 等注入）:
```js
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const events = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/data/events.json'), 'utf8'));
const periods = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/data/timeline.json'), 'utf8'));

const MIN_YEAR = <%= minYear %>;
const MAX_YEAR = <%= maxYear %>;
const periodIds = new Set(periods.map((p) => p.id));
const seen = new Set();
const errors = [];

function parseYear(s) {
  if (typeof s !== 'string' || !s) return null;
  const neg = s.startsWith('-');
  const n = Number.parseInt((neg ? s.slice(1) : s).split('-')[0], 10);
  return Number.isNaN(n) ? null : (neg ? -n : n);
}

for (const e of events) {
  if (!e.id) { errors.push('event without id'); continue; }
  if (seen.has(e.id)) errors.push(`duplicate id: ${e.id}`);
  seen.add(e.id);
  if (!periodIds.has(e.date?.periodId)) errors.push(`${e.id}: unknown periodId ${e.date?.periodId}`);
  const y = parseYear(e.date?.start);
  if (y === null) errors.push(`${e.id}: unparseable start ${e.date?.start}`);
  else if (y < MIN_YEAR || y > MAX_YEAR) errors.push(`${e.id}: year ${y} outside [${MIN_YEAR}, ${MAX_YEAR}]`);
  const c = e.location?.coordinates;
  if (!Array.isArray(c) || c.length !== 2) errors.push(`${e.id}: bad coordinates`);
  else {
    if (c[0] < -90 || c[0] > 90) errors.push(`${e.id}: lat out of range ${c[0]}`);
    if (c[1] < -180 || c[1] > 180) errors.push(`${e.id}: lng out of range ${c[1]}`);
  }
}
for (const e of events) {
  for (const r of e.relatedEvents ?? []) {
    if (!seen.has(r)) errors.push(`${e.id}: orphan relatedEvent ${r}`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} validation error(s):`);
  for (const m of errors) console.error('  - ' + m);
  process.exit(1);
}
console.log(`✓ ${events.length} events, ${periods.length} periods valid`);
```

- [ ] **Step 4: AGENTS.md 模板（含換主題 SOP）**

Create `schematics/src/ng-add/files/AGENTS.md.template`:
```markdown
# AGENTS.md — <%= appTitle %>

本專案由 historical-map-schematics 產生。資料驅動：事件與分期分別存於
`public/assets/data/events.json` 與 `timeline.json`。

## 資料 schema
- **事件**：`id`(唯一), `title`, `description`, `date{start,end,period,periodId}`,
  `location{name,coordinates:[lat,lng],adminDivisions[]}`, `categories[]`,
  `keywords[]`, `relatedEvents[]`，加上專案延伸欄位（見 `src/app/models/event.model.ts`）。
- **分期**：`id`(唯一), `label`, `startDate`, `endDate`, `startYear`, `endYear`,
  `color`(hex), `description`。

## 驗證規則
- event id / period id 不可重複
- `date.periodId` 必須對應存在的分期
- 座標 lat∈[-90,90]、lng∈[-180,180]
- `start` 年份須落在設定的 `[minYear, maxYear]`（見 `src/app/historical-map.config.ts`）
- `relatedEvents` 不可指向不存在的事件

## 用產生器安全寫入（人/agent 共用）
```bash
# 新增分期（非互動，供 agent 批次）
ng generate @kevin/historical-map-schematics:add-period \
  --id=ming --label=明朝 --startYear=1368 --endYear=1644 --color=#C8102E --description="明朝" --interactive=false

# 新增事件（非互動）
ng generate @kevin/historical-map-schematics:add-event \
  --id=ming-001 --title=靖難之役 --description=... --start=1399 --end=1402 \
  --period=明朝 --periodId=ming --locationName=南京 --lat=32.06 --lng=118.80 \
  --categories=軍事,政治 --keywords=朱棣,建文帝 --interactive=false
```

## 換主題 SOP（把展示種子換成指定主題）
1. 調整 `src/app/historical-map.config.ts` 的 `appTitle` 與 `timeline` 年代範圍。
2. 清空種子：把 `events.json` 設為 `[]`、`timeline.json` 設為 `[]`。
3. 用 `add-period` 逐一建立主題分期。
4. 用 `add-event` 逐一（或迴圈批次）灌入事件。
5. 執行 `npm run test:data` 自我檢查，全綠後 `npm start` 驗證互動。
```

- [ ] **Step 5: Commit**

```bash
git add schematics/src/ng-add/files/public schematics/src/ng-add/files/scripts schematics/src/ng-add/files/AGENTS.md.template
git commit -m "feat: add ng-add seed data, validator and AGENTS.md templates"
```

### Task 13：ng-add index.ts（rule chain）+ 單元測試

**Files:**
- Create: `schematics/src/ng-add/index.ts`
- Test: `schematics/src/ng-add/index_spec.ts`

- [ ] **Step 1: 寫失敗測試（用 example-app 之外的最小 host tree）**

Create `schematics/src/ng-add/index_spec.ts`:
```ts
import { Tree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner } from '../utils/testing';

function workspaceTree(): UnitTestTree {
  const tree = new UnitTestTree(Tree.empty());
  tree.create('/package.json', JSON.stringify({ name: 'host', dependencies: {}, devDependencies: {} }));
  tree.create('/angular.json', JSON.stringify({
    version: 1, projects: { host: {
      projectType: 'application', root: '', sourceRoot: 'src',
      architect: {}, prefix: 'app',
    } } }));
  tree.create('/src/app/app.config.ts',
    `import { ApplicationConfig } from '@angular/core';\nexport const appConfig: ApplicationConfig = { providers: [] };\n`);
  return tree;
}

describe('ng-add', () => {
  it('creates core files and seeds data by default', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('ng-add',
      { appTitle: 'Test Map', minYear: -3000, maxYear: 2025, pixelsPerYear: 5, includeSampleData: true, project: 'host' },
      workspaceTree());

    expect(tree.exists('/src/app/historical-map.config.ts')).toBe(true);
    expect(tree.exists('/src/app/models/event.model.ts')).toBe(true);
    expect(tree.exists('/src/app/store/app.state.ts')).toBe(true);
    expect(tree.exists('/public/assets/data/events.json')).toBe(true);
    expect(tree.exists('/AGENTS.md')).toBe(true);

    const cfg = tree.readContent('/src/app/historical-map.config.ts');
    expect(cfg).toContain("appTitle: 'Test Map'");
    expect(cfg).toContain('minYear: -3000');

    const events = JSON.parse(tree.readContent('/public/assets/data/events.json'));
    expect(events.length).toBeGreaterThan(0);
  });

  it('writes empty data arrays when includeSampleData is false', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('ng-add',
      { appTitle: 'Empty', minYear: 0, maxYear: 2025, pixelsPerYear: 5, includeSampleData: false, project: 'host' },
      workspaceTree());
    expect(JSON.parse(tree.readContent('/public/assets/data/events.json'))).toEqual([]);
    expect(JSON.parse(tree.readContent('/public/assets/data/timeline.json'))).toEqual([]);
  });
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `npm run test:schematics`
Expected: FAIL（`ng-add/index` 不存在）

- [ ] **Step 3: 實作 index.ts**

Create `schematics/src/ng-add/index.ts`:
```ts
import {
  apply, applyTemplates, chain, mergeWith, move, Rule, SchematicContext, Tree, url,
  MergeStrategy,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { NgAddOptions } from './schema';

const DEPENDENCIES: Record<string, string> = {
  '@angular/cdk': '^20.2.0',
  '@angular/material': '^20.2.0',
  '@ngrx/store': '^20.1.0',
  '@ngrx/effects': '^20.1.0',
  'fuse.js': '^7.3.0',
  'leaflet': '^1.9.4',
};
const DEV_DEPENDENCIES: Record<string, string> = {
  '@types/leaflet': '^1.9.21',
};

function addDependencies(): Rule {
  return (tree: Tree) => {
    const pkgBuffer = tree.read('/package.json');
    if (!pkgBuffer) throw new Error('package.json not found in workspace root');
    const pkg = JSON.parse(pkgBuffer.toString('utf-8'));
    pkg.dependencies = { ...pkg.dependencies, ...DEPENDENCIES };
    pkg.devDependencies = { ...pkg.devDependencies, ...DEV_DEPENDENCIES };
    pkg.scripts = { ...pkg.scripts, 'test:data': 'node scripts/validate-events.mjs' };
    tree.overwrite('/package.json', JSON.stringify(pkg, null, 2) + '\n');
    return tree;
  };
}

function emptyDataIfNoSample(options: NgAddOptions): Rule {
  return (tree: Tree) => {
    if (!options.includeSampleData) {
      tree.overwrite('/public/assets/data/events.json', '[]\n');
      tree.overwrite('/public/assets/data/timeline.json', '[]\n');
    }
    return tree;
  };
}

function wireAppConfig(): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const path = '/src/app/app.config.ts';
    if (!tree.exists(path)) return tree;
    let content = tree.read(path)!.toString('utf-8');
    if (!content.includes('provideStore')) {
      content =
        `import { provideStore } from '@ngrx/store';\n` +
        `import { provideHttpClient } from '@angular/common/http';\n` +
        `import { appReducer } from './store/app.state';\n` +
        content.replace(/providers:\s*\[/, 'providers: [\n    provideStore(appReducer),\n    provideHttpClient(),');
      tree.overwrite(path, content);
    }
    return tree;
  };
}

export function ngAdd(options: NgAddOptions): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    const templateSource = apply(url('./files'), [
      applyTemplates({
        appTitle: options.appTitle,
        minYear: options.minYear,
        maxYear: options.maxYear,
        pixelsPerYear: options.pixelsPerYear,
      }),
      move('/'),
    ]);

    context.addTask(new NodePackageInstallTask());

    return chain([
      mergeWith(templateSource, MergeStrategy.Overwrite),
      addDependencies(),
      emptyDataIfNoSample(options),
      wireAppConfig(),
    ]);
  };
}
```

- [ ] **Step 4: 執行確認通過**

Run: `npm run test:schematics`
Expected: PASS（兩個 ng-add 測試綠）

- [ ] **Step 5: Commit**

```bash
git add schematics/src/ng-add/index.ts schematics/src/ng-add/index_spec.ts
git commit -m "feat: implement ng-add rule chain with templates, deps and app.config wiring"
```

### Task 14：整合驗證 — 對 example-app 跑 ng add（SC-1）

**Files:**
- Create: `scripts/verify-ng-add.mjs`

- [ ] **Step 1: 寫驗證腳本（複製 example-app → 安裝本機 schematics → ng add → build + test:data）**

Create `scripts/verify-ng-add.mjs`:
```js
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tmp = path.join(root, '.tmp-verify');
fs.rmSync(tmp, { recursive: true, force: true });
fs.cpSync(path.join(root, 'example-app'), tmp, { recursive: true });

function run(cmd, cwd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

run('npm install', tmp);
run(`npm install ${path.join(root, 'schematics')}`, tmp);
run('ng add @kevin/historical-map-schematics --skip-confirmation ' +
    '--appTitle="Demo Map" --minYear=-3000 --maxYear=2025 --pixelsPerYear=5 --includeSampleData=true', tmp);
run('npm run test:data', tmp);
run('npm run build', tmp);
console.log('✓ verify-ng-add passed');
```

- [ ] **Step 2: 編譯 schematics 並執行驗證**

Run:
```bash
cd ~/Documents/RCodes/historical-map && npm run build:schematics && npm run verify
```
Expected: `ng add` 成功產生檔案 → `test:data` 全綠 → `build` 成功 → `✓ verify-ng-add passed`。
若 build 失敗（多半是 Task 11 元件 import 遺漏），依錯誤訊息回 Task 11 補 `imports` 後重跑。

- [ ] **Step 3: 手動互動驗證（SC-1）**

Run:
```bash
cd ~/Documents/RCodes/historical-map/.tmp-verify && npm start
```
開 `http://localhost:4200`，確認：地圖顯示 3 個範例標記、時間軸有 3 段分期、點標記開側欄、搜尋可用。確認後 Ctrl-C。

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/RCodes/historical-map
git add scripts/verify-ng-add.mjs
git commit -m "test: add end-to-end ng-add verification script (SC-1)"
```

---

## Phase 4：產生器

### Task 15：add-event 產生器

**Files:**
- Create: `schematics/src/add-event/schema.json`
- Create: `schematics/src/add-event/schema.ts`
- Create: `schematics/src/add-event/index.ts`
- Test: `schematics/src/add-event/index_spec.ts`

- [ ] **Step 1: schema.json（x-prompt + 全旗標可帶）**

Create `schematics/src/add-event/schema.json`:
```json
{
  "$schema": "http://json-schema.org/schema",
  "$id": "AddEvent",
  "title": "Add Event",
  "type": "object",
  "properties": {
    "id": { "type": "string", "x-prompt": "事件 id（唯一）？" },
    "title": { "type": "string", "x-prompt": "標題？" },
    "description": { "type": "string", "default": "", "x-prompt": "描述？" },
    "start": { "type": "string", "x-prompt": "起始年（字串，負值為西元前）？" },
    "end": { "type": "string", "x-prompt": "結束年？" },
    "period": { "type": "string", "x-prompt": "分期顯示名稱？" },
    "periodId": { "type": "string", "x-prompt": "分期 id（須存在於 timeline.json）？" },
    "locationName": { "type": "string", "x-prompt": "地點名稱？" },
    "lat": { "type": "number", "x-prompt": "緯度 lat？" },
    "lng": { "type": "number", "x-prompt": "經度 lng？" },
    "adminDivisions": { "type": "string", "default": "", "description": "comma-separated" },
    "categories": { "type": "string", "default": "", "description": "comma-separated" },
    "keywords": { "type": "string", "default": "", "description": "comma-separated" },
    "relatedEvents": { "type": "string", "default": "", "description": "comma-separated" }
  },
  "required": ["id", "title", "start", "end", "periodId", "locationName", "lat", "lng"]
}
```

- [ ] **Step 2: schema.ts**

Create `schematics/src/add-event/schema.ts`:
```ts
export interface AddEventOptions {
  id: string; title: string; description: string;
  start: string; end: string; period: string; periodId: string;
  locationName: string; lat: number; lng: number;
  adminDivisions: string; categories: string; keywords: string; relatedEvents: string;
}
```

- [ ] **Step 3: 寫失敗測試**

Create `schematics/src/add-event/index_spec.ts`:
```ts
import { Tree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner } from '../utils/testing';

function dataTree(): UnitTestTree {
  const tree = new UnitTestTree(Tree.empty());
  tree.create('/public/assets/data/timeline.json', JSON.stringify([{ id: 'p1' }]));
  tree.create('/public/assets/data/events.json', JSON.stringify([{ id: 'e1' }]));
  return tree;
}

const valid = {
  id: 'e2', title: 'T', description: 'D', start: '100', end: '100', period: 'P', periodId: 'p1',
  locationName: 'L', lat: 25, lng: 121, adminDivisions: '', categories: 'a,b', keywords: 'k', relatedEvents: '',
};

describe('add-event', () => {
  it('appends a valid event with parsed arrays', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('add-event', valid, dataTree());
    const events = JSON.parse(tree.readContent('/public/assets/data/events.json'));
    expect(events.length).toBe(2);
    const added = events.find((e: any) => e.id === 'e2');
    expect(added.location.coordinates).toEqual([25, 121]);
    expect(added.categories).toEqual(['a', 'b']);
    expect(added.date.periodId).toBe('p1');
  });

  it('rejects duplicate id', async () => {
    const runner = createRunner();
    await expectAsync(runner.runSchematic('add-event', { ...valid, id: 'e1' }, dataTree()))
      .toBeRejectedWithError(/Duplicate event id: e1/);
  });

  it('rejects unknown periodId', async () => {
    const runner = createRunner();
    await expectAsync(runner.runSchematic('add-event', { ...valid, periodId: 'nope' }, dataTree()))
      .toBeRejectedWithError(/Unknown periodId: nope/);
  });
});
```

- [ ] **Step 4: 執行確認失敗**

Run: `npm run test:schematics`
Expected: FAIL（`add-event/index` 不存在）

- [ ] **Step 5: 實作 index.ts**

Create `schematics/src/add-event/index.ts`:
```ts
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { AddEventOptions } from './schema';
import { DATA_PATHS, readJsonArray, writeJsonArray } from '../utils/json-file';
import { validateEvent, EventInput } from '../utils/validation';

function csv(value: string): string[] {
  return (value ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

export function addEvent(options: AddEventOptions): Rule {
  return (tree: Tree) => {
    const periods = readJsonArray<{ id: string }>(tree, DATA_PATHS.timeline);
    const events = readJsonArray<{ id: string }>(tree, DATA_PATHS.events);
    const existingIds = new Set(events.map(e => e.id));

    const input: EventInput = {
      id: options.id, title: options.title, description: options.description,
      start: options.start, end: options.end, period: options.period, periodId: options.periodId,
      locationName: options.locationName, lat: options.lat, lng: options.lng,
      adminDivisions: csv(options.adminDivisions), categories: csv(options.categories),
      keywords: csv(options.keywords), relatedEvents: csv(options.relatedEvents),
    };

    const errors = validateEvent(input, periods, existingIds);
    if (errors.length) throw new SchematicsException(errors.join('; '));

    events.push({
      id: input.id, title: input.title, description: input.description,
      date: { start: input.start, end: input.end, period: input.period, periodId: input.periodId },
      location: { name: input.locationName, coordinates: [input.lat, input.lng], adminDivisions: input.adminDivisions },
      categories: input.categories, keywords: input.keywords, relatedEvents: input.relatedEvents,
    } as any);

    writeJsonArray(tree, DATA_PATHS.events, events);
    return tree;
  };
}
```

- [ ] **Step 6: 執行確認通過**

Run: `npm run test:schematics`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add schematics/src/add-event
git commit -m "feat: add add-event generator with validation"
```

### Task 16：add-period 產生器

**Files:**
- Create: `schematics/src/add-period/schema.json`
- Create: `schematics/src/add-period/schema.ts`
- Create: `schematics/src/add-period/index.ts`
- Test: `schematics/src/add-period/index_spec.ts`

- [ ] **Step 1: schema.json**

Create `schematics/src/add-period/schema.json`:
```json
{
  "$schema": "http://json-schema.org/schema",
  "$id": "AddPeriod",
  "title": "Add Period",
  "type": "object",
  "properties": {
    "id": { "type": "string", "x-prompt": "分期 id（唯一）？" },
    "label": { "type": "string", "x-prompt": "分期名稱？" },
    "startYear": { "type": "number", "x-prompt": "起始年（負值為西元前）？" },
    "endYear": { "type": "number", "x-prompt": "結束年？" },
    "color": { "type": "string", "default": "#4169E1", "x-prompt": "顏色（hex）？" },
    "description": { "type": "string", "default": "", "x-prompt": "描述？" }
  },
  "required": ["id", "label", "startYear", "endYear"]
}
```

- [ ] **Step 2: schema.ts**

Create `schematics/src/add-period/schema.ts`:
```ts
export interface AddPeriodOptions {
  id: string; label: string; startYear: number; endYear: number; color: string; description: string;
}
```

- [ ] **Step 3: 寫失敗測試**

Create `schematics/src/add-period/index_spec.ts`:
```ts
import { Tree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner } from '../utils/testing';

function dataTree(): UnitTestTree {
  const tree = new UnitTestTree(Tree.empty());
  tree.create('/public/assets/data/timeline.json', JSON.stringify([{ id: 'p1' }]));
  return tree;
}

const valid = { id: 'p2', label: '近世', startYear: 1500, endYear: 1800, color: '#2E8B57', description: 'd' };

describe('add-period', () => {
  it('appends a valid period with derived date strings', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('add-period', valid, dataTree());
    const periods = JSON.parse(tree.readContent('/public/assets/data/timeline.json'));
    expect(periods.length).toBe(2);
    const p = periods.find((x: any) => x.id === 'p2');
    expect(p.startDate).toBe('1500');
    expect(p.endDate).toBe('1800');
  });

  it('rejects duplicate id', async () => {
    const runner = createRunner();
    await expectAsync(runner.runSchematic('add-period', { ...valid, id: 'p1' }, dataTree()))
      .toBeRejectedWithError(/Duplicate period id: p1/);
  });

  it('rejects invalid hex color', async () => {
    const runner = createRunner();
    await expectAsync(runner.runSchematic('add-period', { ...valid, color: 'blue' }, dataTree()))
      .toBeRejectedWithError(/Invalid hex color: blue/);
  });
});
```

- [ ] **Step 4: 執行確認失敗**

Run: `npm run test:schematics`
Expected: FAIL

- [ ] **Step 5: 實作 index.ts**

Create `schematics/src/add-period/index.ts`:
```ts
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { AddPeriodOptions } from './schema';
import { DATA_PATHS, readJsonArray, writeJsonArray } from '../utils/json-file';
import { validatePeriod, PeriodInput } from '../utils/validation';

export function addPeriod(options: AddPeriodOptions): Rule {
  return (tree: Tree) => {
    const periods = readJsonArray<{ id: string }>(tree, DATA_PATHS.timeline);
    const existingIds = new Set(periods.map(p => p.id));

    const input: PeriodInput = {
      id: options.id, label: options.label, startYear: options.startYear,
      endYear: options.endYear, color: options.color, description: options.description,
    };
    const errors = validatePeriod(input, existingIds);
    if (errors.length) throw new SchematicsException(errors.join('; '));

    periods.push({
      id: input.id, label: input.label,
      startDate: String(input.startYear), endDate: String(input.endYear),
      startYear: input.startYear, endYear: input.endYear,
      color: input.color, description: input.description,
    } as any);

    writeJsonArray(tree, DATA_PATHS.timeline, periods);
    return tree;
  };
}
```

- [ ] **Step 6: 執行確認通過**

Run: `npm run test:schematics`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add schematics/src/add-period
git commit -m "feat: add add-period generator with validation"
```

### Task 17：add-extension-field 產生器（TS AST）

**Files:**
- Create: `schematics/src/add-extension-field/schema.json`
- Create: `schematics/src/add-extension-field/schema.ts`
- Create: `schematics/src/add-extension-field/index.ts`
- Test: `schematics/src/add-extension-field/index_spec.ts`

- [ ] **Step 1: schema.json**

Create `schematics/src/add-extension-field/schema.json`:
```json
{
  "$schema": "http://json-schema.org/schema",
  "$id": "AddExtensionField",
  "title": "Add Extension Field",
  "type": "object",
  "properties": {
    "name": { "type": "string", "x-prompt": "欄位名稱？" },
    "fieldType": { "type": "string", "default": "string", "x-prompt": "型別（如 string、string[]、number）？" },
    "optional": { "type": "boolean", "default": true, "x-prompt": "是否為選擇性（?）？" }
  },
  "required": ["name"]
}
```

- [ ] **Step 2: schema.ts**

Create `schematics/src/add-extension-field/schema.ts`:
```ts
export interface AddExtensionFieldOptions {
  name: string;
  fieldType: string;
  optional: boolean;
}
```

- [ ] **Step 3: 寫失敗測試**

Create `schematics/src/add-extension-field/index_spec.ts`:
```ts
import { Tree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner } from '../utils/testing';

const MODEL = `export interface HistoricalEventBase {
  id: string;
}

export interface HistoricalEvent extends HistoricalEventBase {}
`;

function modelTree(): UnitTestTree {
  const tree = new UnitTestTree(Tree.empty());
  tree.create('/src/app/models/event.model.ts', MODEL);
  return tree;
}

describe('add-extension-field', () => {
  it('adds an optional field to HistoricalEvent', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('add-extension-field',
      { name: 'factions', fieldType: 'string[]', optional: true }, modelTree());
    const content = tree.readContent('/src/app/models/event.model.ts');
    expect(content).toContain('factions?: string[];');
  });

  it('rejects duplicate field', async () => {
    const runner = createRunner();
    const tree = modelTree();
    tree.overwrite('/src/app/models/event.model.ts',
      MODEL.replace('extends HistoricalEventBase {}', 'extends HistoricalEventBase {\n  factions?: string[];\n}'));
    await expectAsync(runner.runSchematic('add-extension-field',
      { name: 'factions', fieldType: 'string[]', optional: true }, tree))
      .toBeRejectedWithError(/already exists/);
  });
});
```

- [ ] **Step 4: 執行確認失敗**

Run: `npm run test:schematics`
Expected: FAIL

- [ ] **Step 5: 實作 index.ts（用正則定位 `HistoricalEvent` interface body 注入；簡單可靠，避免引入 ts AST 重依賴）**

Create `schematics/src/add-extension-field/index.ts`:
```ts
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { AddExtensionFieldOptions } from './schema';

const MODEL_PATH = '/src/app/models/event.model.ts';

export function addExtensionField(options: AddExtensionFieldOptions): Rule {
  return (tree: Tree) => {
    const buffer = tree.read(MODEL_PATH);
    if (!buffer) throw new SchematicsException(`Model not found: ${MODEL_PATH}`);
    let content = buffer.toString('utf-8');

    const field = `${options.name}${options.optional ? '?' : ''}: ${options.fieldType};`;
    if (new RegExp(`\\b${options.name}\\??\\s*:`).test(content.split('extends HistoricalEventBase')[1] ?? '')) {
      throw new SchematicsException(`Field "${options.name}" already exists`);
    }

    // 匹配 `interface HistoricalEvent extends HistoricalEventBase { ... }`
    const re = /(export\s+interface\s+HistoricalEvent\s+extends\s+HistoricalEventBase\s*\{)([\s\S]*?)(\})/;
    if (!re.test(content)) throw new SchematicsException('HistoricalEvent interface not found');
    content = content.replace(re, (_m, open, body, close) => {
      const trimmed = body.replace(/\s+$/, '');
      const sep = trimmed.length ? '\n' : '\n';
      return `${open}${trimmed}${sep}  ${field}\n${close}`;
    });

    tree.overwrite(MODEL_PATH, content);
    return tree;
  };
}
```

- [ ] **Step 6: 執行確認通過**

Run: `npm run test:schematics`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add schematics/src/add-extension-field
git commit -m "feat: add add-extension-field generator"
```

---

## Phase 5：端到端與 agent 流程驗證

### Task 18：SC-2 — 換主題端到端驗證

**Files:**
- Create: `scripts/verify-theme-swap.mjs`

- [ ] **Step 1: 寫換主題驗證腳本（模擬 agent 用產生器換皮）**

Create `scripts/verify-theme-swap.mjs`:
```js
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
run('ng generate @kevin/historical-map-schematics:add-period --id=ming --label=明朝 ' +
    '--startYear=1368 --endYear=1644 --color=#C8102E --description=明朝 --interactive=false');
run('ng generate @kevin/historical-map-schematics:add-event --id=ming-001 --title=靖難之役 ' +
    '--description=test --start=1399 --end=1402 --period=明朝 --periodId=ming ' +
    '--locationName=南京 --lat=32.06 --lng=118.8 --categories=軍事 --keywords=朱棣 --interactive=false');

run('npm run test:data');
run('npm run build');
console.log('✓ verify-theme-swap passed (SC-2)');
```

- [ ] **Step 2: 執行**

Run:
```bash
cd ~/Documents/RCodes/historical-map && npm run build:schematics && npm run verify && node scripts/verify-theme-swap.mjs
```
Expected: 種子清空 → add-period/add-event 成功寫入 → `test:data` 全綠 → build 成功 → `✓ verify-theme-swap passed (SC-2)`。

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-theme-swap.mjs
git commit -m "test: add theme-swap end-to-end verification (SC-2)"
```

### Task 19：README 與發佈說明收尾

**Files:**
- Modify: `README.md`
- Create: `schematics/README.md`

- [ ] **Step 1: 更新根 README**

在 `README.md` 補上完整用法：`ng add`、三個產生器的指令範例、開發/測試/驗證腳本說明、連結到 `docs/superpowers/specs/` 與 `plans/`。

- [ ] **Step 2: schematics 套件 README（給 npm 用）**

Create `schematics/README.md`，內容：套件簡介、`ng add @kevin/historical-map-schematics`、產生器列表與旗標、本機 `npm link` 測試方式、未來 `npm publish` 步驟。

- [ ] **Step 3: Commit**

```bash
git add README.md schematics/README.md
git commit -m "docs: document ng add usage, generators and publishing"
```

---

## Self-Review 結果

**1. Spec 覆蓋檢查：**
- SC-1（一鍵可互動）→ Task 12 種子 + Task 13 ng-add + Task 14 整合驗證 ✓
- SC-2（agent 換主題）→ Task 15/16 產生器 + AGENTS.md（Task 12）+ Task 18 ✓
- 決策 1（ng add + ng g）→ Phase 3 + Phase 4 ✓
- 決策 2/3（核心固定 + extends 擴充）→ Task 8 模型 ✓
- 決策 4（三產生器）→ Task 15/16/17 ✓
- 決策 5（非互動 + AGENTS.md + 強化驗證）→ schema 全旗標 + Task 12 ✓
- 決策 6（集中設定檔）→ Task 8 config + Task 11 timeline/app 改讀 config ✓
- 決策 7（monorepo + example-app）→ Task 1-3 + Task 14 ✓
- 測試策略（SchematicTestRunner + 整合）→ 各 Task 單元測試 + Task 14/18 ✓

**2. Placeholder 掃描：** 「複製並改寫」任務（9/10/11）指明確切來源路徑與精確改寫項，非 placeholder。無 TBD/TODO。

**3. 型別一致性：** `EventInput`/`PeriodInput`（utils/validation）在 add-event/add-period 一致使用；`DATA_PATHS`、`readJsonArray`/`writeJsonArray` 簽章一致；`historicalMapConfig` 結構在 config 模板、timeline、app 元件一致。

**已知風險：** Task 11 把來源 `standalone: false` 元件改為 standalone 並補 `imports` 是最易出錯處；Task 14 整合 build 會抓出遺漏，屬預期內的迭代點。
