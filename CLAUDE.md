# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概覽

本倉庫是發佈 `@raybird/historical-map-schematics` 的 **Angular Schematics monorepo**。它提供一鍵搭建「歷史事件 × 地圖」互動式 Angular 應用的能力，並讓人類與 AI agent 透過同一套非互動產生器安全灌入 JSON 資料。

兩個工作區：
- `schematics/` — 套件本體（schematics collection），有獨立的 `package.json` 與 `node_modules`。
- `example-app/` — 真實 Angular 20 workspace，作為 `ng add` 與換主題流程的端到端驗證靶。

### 來源淵源（重要）
本專案是把兩個既有姊妹專案的共同骨架抽成 Schematics，架構與其**緊耦合**：
- [raybird/cap-map](https://github.com/raybird/cap-map) — 臺灣史主題，是 `ng-add/files/` 模板的**架構基準**（多數模板從此複製改寫）。
- [raybird/three-kingdoms-map](https://github.com/raybird/three-kingdoms-map) — 三國主題。

兩者是同一套架構（Angular 20 + NgRx 20 + Leaflet + Fuse.js）的不同主題版本，僅「主題資料、模型延伸欄位、年代範圍」在變。改寫模板時的主要工作是**把來源散落的硬編碼年代常數改為集中設定 / 模板變數**。當來源專案或 Angular/NgRx 大版本演進時，模板需手動跟進——`example-app` + `npm run verify` 即為抓回歸用的端到端驗證靶。

## 常用指令（在倉庫根目錄執行）

```bash
npm run build:schematics   # tsc 編譯 schematics + 檢查 schema/template 齊全
npm run test:schematics    # 先 build 再用 jasmine 跑單元測試
npm run verify             # 對 example-app 跑 ng add 並建置（SC-1 端到端驗證）
node scripts/verify-theme-swap.mjs  # 清種子後用產生器換主題並建置（SC-2，須先跑過 npm run verify）
```

跑單一測試檔：先 `npm run build:schematics`，再直接指定編譯後的 spec：
```bash
schematics/node_modules/.bin/jasmine schematics/src/add-event/index_spec.js
```

## 建置機制（重要陷阱）

- `tsconfig.json` 設定 `rootDir` 與 `outDir` 皆為 `src`，所以 **`.js` / `.d.ts` 編譯產物會直接落在 `.ts` 旁邊**，並被 `.gitignore` 忽略。
- Jasmine 設定（`schematics/jasmine.json`）只跑 **編譯後的 `**/*_spec.js`**，因此改動 `*_spec.ts` 後必須重新 build 才會生效（`test:schematics` 已含此步驟）。
- `tsconfig.json` 排除 `src/**/files/**`，模板不會被 TypeScript 編譯。
- 模板檔以 **`.template` 副檔名** 存放於 `src/ng-add/files/`（含 `.template` 的 `.json`、`.ts`、`.md` 等），避免被當成原始碼處理；`applyTemplates` 會在產生時去除 `.template` 並做變數插值。

## 架構

### Collection 結構（`schematics/src/collection.json`）
四個 schematic，每個是一個目錄，內含 `index.ts`（factory）、`schema.ts`（型別）、`schema.json`（CLI 旗標 + x-prompt）、`index_spec.ts`（測試）：

- **`ng-add`** — 搭建整個 app。從 `files/` 套用模板樹（注入 `appTitle` / `minYear` / `maxYear` / `pixelsPerYear`），並以多個 `Rule` 改寫宿主專案：加相依（`@ngrx/store`、`fuse.js`、`leaflet`）、注入 `provideStore` / `provideHttpClient` 到 `app.config.ts`、改寫 `main.ts` bootstrap 自家 `AppComponent`、刪除 `ng new` 的預設根元件、依 `--include-sample-data` 決定種子或空資料。
- **`add-event`** / **`add-period`** — 讀取 `public/assets/data/{events,timeline}.json`，驗證後 append 再寫回。
- **`add-extension-field`** — 用 regex 比對 `HistoricalEvent extends HistoricalEventBase { ... }` 介面並注入新欄位。

### 產生的 App 架構（`ng-add/files/` 模板）
產生的 Angular app 是 **資料驅動 + NgRx** 的單頁應用：
- 資料層：`public/assets/data/events.json`（事件）與 `timeline.json`（分期），執行期由 services 載入。
- 集中設定：`src/app/historical-map.config.ts`（標題、時間軸範圍、地圖初始視角）。
- 狀態：`src/app/store/`（event / map / timeline 各自的 actions / reducers / selectors）。
- 元件：`map-container`、`timeline`、`event-sidebar`、`search-bar`、`layer-control` + `app.component`。
- 模型擴充點：`HistoricalEvent extends HistoricalEventBase`，由 `add-extension-field` 延伸。
- 驗證 script：`scripts/validate-events.mjs`（產生後可用 `npm run test:data` 自檢）。

### 共用驗證邏輯（關鍵設計）
`schematics/src/utils/` 是跨 schematic 共用的核心：
- `validation.ts` — `validateEvent` / `validatePeriod`，集中所有規則（id 不重複、`periodId` 須存在於 periods、座標範圍、hex 色碼、年份順序）。產生器與產生 app 內的 `validate-events.mjs` 共用同一套規則語意，確保「人寫」與「AI agent 寫」走相同驗證閘門。
- `json-file.ts` — `DATA_PATHS` 常數與 `readJsonArray` / `writeJsonArray`，統一 JSON 讀寫。
- `testing.ts` — 測試輔助（建立 Tree fixture 等）。

修改驗證規則時，務必同步檢查 `validate-events.mjs.template` 是否需對齊。

## 開發慣例

- 新增 schematic：建目錄 → `index.ts` + `schema.ts` + `schema.json` + `index_spec.ts` → 在 `collection.json` 註冊。
- 多字旗標在 schema 用 camelCase（如 `appTitle`），命令列須用 kebab-case（`--app-title`）。
- 所有產生器都應支援 `--interactive=false` 供 agent 批次非互動執行。
- 規格與規劃文件在 `docs/superpowers/specs/` 與 `docs/superpowers/plans/`，SC-1 / SC-2 等驗收條件即對應上面的 `verify` 腳本。

## ⚠️ Most Important Rule

**Git commit messages must never contain `Co-Authored-By: Claude` or any AI-generated attribution information.** Only write a feature description, without any trailing lines.
