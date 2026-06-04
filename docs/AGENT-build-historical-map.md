# AGENT 全流程規格：建立某一時期的歷史地圖網站

> 建立日期：2026-06-04 ｜ 對象：自動化 AI agent ｜ 套件：`@raybird/historical-map-schematics` 0.0.1 / Angular 20
> 本檔為 imperative 規格。逐步執行，每步通過 verification gate 才進入下一步。失敗時依「失敗 → 動作」表處理，不要略過驗證。
> 人類教學見 `docs/tutorial-建立歷史地圖網站.md`。產生專案後的資料維護見專案內 `AGENTS.md`。

## INPUT（執行前需確定的變數）

| 變數 | 範例 | 說明 |
| --- | --- | --- |
| `PROJECT` | `tang-map` | Angular 專案名（kebab-case） |
| `APP_TITLE` | `唐代歷史地圖` | 標題列 |
| `MIN_YEAR` | `500` | 時間軸最早年（西元前用負值） |
| `MAX_YEAR` | `1000` | 時間軸最晚年 |
| `PIXELS_PER_YEAR` | `20` | 範圍短調大、範圍長調小 |
| `MAP_CENTER` | `[34, 110]` | 地圖初始中心 `[lat, lng]` |
| `MAP_ZOOM` | `4` | 數字越大越近 |
| `PERIODS[]` | 見 STEP 5 | 分期清單 |
| `EVENTS[]` | 見 STEP 6 | 事件清單，每筆 `period_id` 必須屬於 `PERIODS[]` |

不變式（任何步驟都須維持）：
- 每個 event/period `id` 全域唯一。
- 每個 event 的 `period_id` ∈ 已建立的 period id 集合。
- event 座標 `lat∈[-90,90]`、`lng∈[-180,180]`。
- event `start` 年份 ∈ `[MIN_YEAR, MAX_YEAR]`。
- event 的 `related_events` 只能指向已存在的 event id。

## 資料蒐集準則（重要）

驗證閘門只檢查「結構與範圍」，**不檢查史實正確性**。蒐集 `PERIODS[]` / `EVENTS[]` 內容時：

- **優先採用 Wikipedia（維基百科）作為檢索來源**，年份、地點、人物等以維基條目為準，較準確且易於交叉查證。
- **座標**：用事件**地點的現代經緯度**（取自該地點的 Wikipedia 條目／GeoHack 或可靠地名資料庫）。常見錯誤是「地名對、座標亂填」，務必逐筆核對。
- 跨語言時以**中文維基**為主、英文維基交叉比對；遇分歧採較具來源者並記錄。
- 無法從可靠來源確認的事件**寧可略過，不要臆造**——validator 擋不到捏造的史實。

---

## STEP 0 — 環境前置
```bash
node -v        # 期望 v20+
ng version     # 期望 Angular CLI 20.x
```
- GATE：兩者皆滿足。
- 失敗：CLI 非 20 → `npm i -g @angular/cli@20`；Node < 20 → 中止並回報，不要降級嘗試。

## STEP 1 — 建立乾淨 workspace
```bash
ng new <PROJECT> --style=css --routing=false --skip-git
cd <PROJECT>
```
- GATE：`<PROJECT>/angular.json` 存在。

## STEP 2 — 一鍵搭建（非互動）
```bash
ng add @raybird/historical-map-schematics --skip-confirmation \
  --app-title="<APP_TITLE>" \
  --min-year=<MIN_YEAR> --max-year=<MAX_YEAR> --pixels-per-year=<PIXELS_PER_YEAR> \
  --include-sample-data=false
```
- 一律帶 `--include-sample-data=false`：直接得到空資料，省去清種子步驟。
- GATE：以下檔案皆存在
  - `src/app/historical-map.config.ts`
  - `public/assets/data/events.json`（內容為 `[]`）
  - `public/assets/data/timeline.json`（內容為 `[]`）
  - `scripts/validate-events.mjs`、`AGENTS.md`
- 失敗：`package.json not found` → 不在 workspace 根目錄，回到 STEP 1 的目錄；找不到 collection → 套件未發佈/未安裝，改用本機路徑 `ng add <絕對路徑>/schematics`。

## STEP 3 — 設定地圖視角
編輯 `src/app/historical-map.config.ts`，將 `map` 區塊改為 INPUT 值（`appTitle`/`timeline` 已由 STEP 2 帶入，勿重複改）：
```ts
  map: {
    center: <MAP_CENTER>,
    zoom: <MAP_ZOOM>,
  },
```
- GATE：檔案內 `center` 與 `zoom` 為 INPUT 值。

## STEP 4 —（選用）延伸欄位
僅當主題需要額外欄位時，對每個欄位執行：
```bash
ng generate @raybird/historical-map-schematics:add-extension-field \
  --name=<FIELD> --field-type=<TYPE> --optional=true --interactive=false
```
- 失敗 `already exists` → 該欄位已存在，視為成功、跳過。

## STEP 5 — 建立分期（必須先於事件）
對 `PERIODS[]` 每筆執行：
```bash
ng generate @raybird/historical-map-schematics:add-period \
  --id=<id> --label=<label> --start-year=<sy> --end-year=<ey> \
  --color=<#hex> --description="<desc>" --interactive=false
```
必填：`--id --label --start-year --end-year`。`--color` 預設 `#4169E1`。
- GATE：`timeline.json` 陣列長度 == `PERIODS[]` 筆數。
- 失敗對照見下方表。

## STEP 6 — 灌入事件
對 `EVENTS[]` 每筆執行（`--period-id` 須 ∈ STEP 5 的 id）：
```bash
ng generate @raybird/historical-map-schematics:add-event \
  --id=<id> --title=<title> --description="<desc>" \
  --start=<start> --end=<end> --period=<period_label> --period-id=<period_id> \
  --location-name=<loc> --lat=<lat> --lng=<lng> \
  --categories=<c1,c2> --keywords=<k1,k2> --interactive=false
```
必填：`--id --title --start --end --period-id --location-name --lat --lng`。
多值欄位（`--categories --keywords --admin-divisions --related-events`）用逗號分隔。
- 批次：可用迴圈逐筆呼叫；任一筆失敗會中止且不寫檔，修正該筆後重跑該筆即可（已成功的不受影響）。
- GATE：`events.json` 陣列長度 == `EVENTS[]` 筆數。

## STEP 7 — 資料驗證（硬性閘門）
```bash
npm run test:data
```
- GATE：exit code 0。非 0 不得進入 STEP 8。
- 失敗：依輸出訊息定位問題 event/period，修正資料後重跑。

## STEP 8 — 建置
```bash
ng build
```
- GATE：exit code 0，且 `dist/<PROJECT>/browser/index.html` 存在。
- 產物 `dist/<PROJECT>/browser` 為純靜態檔，可交付部署（GitHub Pages 需 `ng build --base-href=/<repo>/`）。

## STEP 9 —（選用）本機互動驗證
```bash
npm start   # http://localhost:4200
```
- 僅在需要人工確認互動時執行；自動化流程到 STEP 8 即算完成。

---

## 失敗 → 動作 對照表（machine-actionable）

| 訊息片段 | 成因 | 動作 |
| --- | --- | --- |
| `Unknown periodId: X` | 事件 `period-id` 不存在 | 先建立該 period（STEP 5）或修正 `period-id` |
| `year ... outside [MIN, MAX]` | `start` 超出年代範圍 | 調整事件年份，或放寬 config 的 `minYear/maxYear` |
| `Duplicate event id` / `Duplicate period id` | id 重複 | 換唯一 id |
| `Latitude/Longitude out of range` | 座標越界 | 修正 `lat`(-90~90) / `lng`(-180~180) |
| `Invalid hex color` | color 非合法 hex | 用 `#RGB` 或 `#RRGGBB` |
| `endYear ... must be >= startYear` | 分期年份顛倒 | 對調 `start-year` / `end-year` |
| `orphan relatedEvent X` | `related-events` 指向不存在 event | 移除該指向，或先建立目標 event |
| `Field "X" already exists` | 延伸欄位重複 | 視為成功、跳過 |
| `package.json not found` | 不在 workspace 根 | `cd` 到 `<PROJECT>` 後重試 |

## 驗證規則（與產生器、`validate-events.mjs` 同源）
- event：id 唯一且非空、title 非空、`periodId` 須存在、`lat∈[-90,90]`、`lng∈[-180,180]`、`start∈[minYear,maxYear]`、`relatedEvents` 不可孤兒。
- period：id 唯一且非空、`color` 合法 hex、`endYear >= startYear`。

## 完成判準（DONE 條件）
1. `timeline.json` 長度 == `PERIODS[]` 筆數。
2. `events.json` 長度 == `EVENTS[]` 筆數。
3. `npm run test:data` exit 0。
4. `ng build` exit 0 且 `dist/<PROJECT>/browser/index.html` 存在。

四項全滿足才回報成功。
