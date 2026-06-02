# Historical Map Schematics — 設計文件

- **日期**：2026-06-02
- **狀態**：設計核可，待轉實作計畫
- **參考來源**：`~/Documents/RCodes/cap-map`、`~/Documents/RCodes/three-kingdoms-map`

## 1. 目標與背景

cap-map（臺灣史）與 three-kingdoms-map（三國）是同一套架構的不同主題版本：
Angular 20 + NgRx 20 + Leaflet + Fuse.js + Angular Material，骨架完全相同，僅
「主題資料、模型延伸欄位、年代範圍」在變。本專案要把這套骨架抽成一組 Angular
Schematics，達成：

1. **`ng add` 一鍵搭建**：在乾淨 Angular 專案執行後，**無需任何手動修改**，
   `npm start` 即可看到「地圖標記 ↔ 時間軸 ↔ 側欄詳情 ↔ 搜尋」全鏈路可互動的
   歷史地圖 app（附可運作的展示種子資料）。
2. **`ng generate` 持續餵料**：用 `add-event` / `add-period` / `add-extension-field`
   快速且**結構化、可驗證地**新增事件、分期與延伸欄位。
3. **AI agent 友善**：所有產生器支援非互動批次呼叫，並產生 `AGENTS.md` 指南，
   讓 agent 能依主題把展示種子替換/補充成正式資料。

### 第一順位成功標準

- **SC-1**：在乾淨 Angular 專案 `ng add` → `npm start`，無手動修改即看到可互動的
  地圖 + 時間軸 + 範例事件。
- **SC-2**：agent 讀 `AGENTS.md` 後，能用產生器把展示種子替換成指定主題資料，
  且 `npm run test:data` 全綠、`npm run build` 成功。

## 2. 設計決策（brainstorming 結論）

| # | 決策 | 選擇 |
|---|---|---|
| 1 | 使用方式 | `ng add`（初始搭建）+ `ng generate`（持續產生）兩者皆做 |
| 2 | 模型差異處理 | 核心欄位固定 + 開放延伸欄位 |
| 3 | 延伸欄位形式 | 核心介面 + 交集擴充（`extends HistoricalEventBase`，欄位掛根層） |
| 4 | 子產生器 | `add-event`、`add-period`、`add-extension-field` |
| 5 | agent 支援 | 非互動批次模式 + `AGENTS.md` 指南 + 強化驗證 script |
| 6 | 可變設定存放 | 集中設定檔 `historical-map.config.ts`（單一真實來源） |
| 7 | 專案組織 | Monorepo（schematics 套件 + example-app 即時驗證靶） |
| 8 | 資料內容 | 由 AI agent 生成；schematics 提供結構化、可驗證的寫入工具 |

## 3. 專案結構（Monorepo）

```
historical-map/
├── package.json              # workspace 根：build / test / verify 腳本
├── schematics/               # ★ 可發佈的 collection 套件
│   ├── package.json          #   name: @kevin/historical-map-schematics
│   │                         #   "schematics": "./src/collection.json"
│   ├── tsconfig.json
│   └── src/
│       ├── collection.json   #   宣告 4 個 schematic
│       ├── ng-add/           #   初始整套搭建（index.ts + schema.json + files/）
│       ├── add-event/
│       ├── add-period/
│       ├── add-extension-field/
│       └── utils/            #   共用：JSON 讀寫、驗證、TS AST 修改
├── example-app/              # ★ 即時驗證/回歸測試靶（Angular workspace）
└── docs/superpowers/specs/   # 設計與計畫文件
```

開發循環：改 `schematics/` → build → 對 `example-app/` 跑 `ng add` / `ng g` →
比對產出 → `SchematicTestRunner` 單元測試。

## 4. `ng-add`（初始搭建）

`ng add @kevin/historical-map-schematics` 流程：

1. **互動詢問**（`schema.json` 的 `x-prompt`，皆可由旗標覆寫）：
   - `appTitle`：app 標題
   - `minYear` / `maxYear`：時間軸年代範圍（負值為西元前）
   - `pixelsPerYear`：時間軸每年像素
   - `includeSampleData`：是否附展示種子，**預設 `true`**（達成 SC-1）
2. **加入相依套件**並觸發 `npm install`（`NodePackageInstallTask`）：
   leaflet、@types/leaflet、fuse.js、@ngrx/store、@ngrx/effects、
   @angular/material、@angular/cdk。
3. **產生檔案**（template `<%= %>` 套入設定值）：
   - `models/event.model.ts`、`models/timeline.model.ts`
   - `store/`：event / map / timeline 三 slice（actions + reducers + selectors）
     與 `app.state.ts`
   - `services/`：`EventService`、`TimelineService`、`QuizService`
   - 5 個元件：`map-container`、`timeline`、`event-sidebar`、`search-bar`、
     `layer-control`
   - `app/historical-map.config.ts`（集中設定）
   - `public/assets/data/events.json` + `timeline.json`（展示種子或最小骨架）
   - `scripts/validate-events.mjs`（通用化版）
   - `AGENTS.md`（agent 操作指南）
4. **接線** `app.config.ts`：`provideStore(appReducer)`、`provideHttpClient()`。

### 關鍵資料流（沿用來源專案）

`TimelineComponent` 訂閱 `selectEvents` + `selectCurrentPeriodId`，以 `combineLatest`
依 `date.periodId` 過濾主事件列表，dispatch `MapActions.setMapEvents` 推給地圖
slice；地圖不直接讀 event slice。事件選取需同時 dispatch `EventActions.selectEvent`
與 `MapActions.selectEvent`。座標一律 `[lat, lng]`。

## 5. `ng generate` 三個產生器

| 產生器 | 作用 | 驗證項目 |
|---|---|---|
| `add-event` | 寫入一筆事件至 `events.json` | id 唯一、`periodId` 存在於 timeline、`[lat,lng]` 範圍合法、年份可解析 |
| `add-period` | 新增分期至 `timeline.json` | id 唯一、年代區間合法、顏色格式（hex） |
| `add-extension-field` | 用 TS AST 在專案 `HistoricalEvent` 介面新增延伸欄位（可選同步更新 sidebar 顯示） | 欄位名不重複 |

- 每個皆以 `schema.json` 的 `x-prompt` 提供互動。
- **全參數可由旗標帶入**，支援 `--interactive=false` 非互動批次（agent 迴圈呼叫）。
- 寫入採 schematics `Tree` + JSON 解析/格式化（非字串拼接），避免破壞檔案。

## 6. 模型設計（核心固定 + 交集擴充）

```ts
// models/event.model.ts
export interface EventLocation {
  name: string;
  coordinates: [number, number]; // [lat, lng]
  adminDivisions: string[];
}
export interface EventDate {
  start: string; end: string; period: string; periodId: string;
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
// 各專案自行擴充頂層欄位；add-extension-field 即操作此介面
export interface HistoricalEvent extends HistoricalEventBase {
  // 例：factions?: string[];  examRelevance?: ExamRelevance;
}
```

集中設定檔為單一真實來源：

```ts
// app/historical-map.config.ts
export const historicalMapConfig = {
  appTitle: '<%= appTitle %>',
  timeline: {
    minYear: <%= minYear %>,
    maxYear: <%= maxYear %>,
    pixelsPerYear: <%= pixelsPerYear %>,
  },
};
```

`timeline.component.ts` 等改為自 config 讀取（修正來源專案把 `-5000`/`5` 散落硬編碼
的小缺點）。時間軸位置：`pixelX = (year - config.timeline.minYear) * config.timeline.pixelsPerYear`。

## 7. AI Agent 支援

- **非互動批次**：產生器支援 `--interactive=false` + 完整旗標，agent 可批次灌入。
- **`AGENTS.md`**（`ng add` 產生）內容：
  - 事件 / 分期資料 schema 與欄位定義
  - 驗證規則
  - 產生器呼叫範例（含批次）
  - **換主題 SOP**：清除展示種子 → `add-period` 建分期 → 批次 `add-event` 灌事件
    → 跑 `npm run test:data` 自檢
- **強化 `validate-events.mjs`**：讀 config 年代範圍檢查、座標範圍、孤兒
  `relatedEvents`、`periodId` 對應；以 exit code 回報，供 CI 與 agent 自檢。

## 8. 測試策略

- **schematics 單元測試**：`@angular-devkit/schematics/testing` 的
  `SchematicTestRunner` 對 `UnitTestTree` 驗證每個 schematic：檔案存在、內容正確、
  JSON 合法、驗證邏輯能擋住錯誤輸入（重複 id、未知 periodId、座標越界等）。
- **整合/回歸**：腳本對 `example-app/` 副本跑 `ng add` 後 `npm run build` +
  `npm run test:data`，確保產出可編譯、資料合法、滿足 SC-1 / SC-2。

## 9. 非目標（YAGNI）

- 不做 `add-layer`、`regenerate-component` 子產生器。
- 不做主題 preset 集（先以單一中性種子 + agent 換皮達成）。
- 不做執行期 JSON 設定載入（採編譯期集中設定檔）。
- 不做 JSON 批次匯入專用產生器（由非互動模式迴圈呼叫取代）。
- 初期不發佈 npm（本機 `npm link` / 路徑安裝；發佈為後續步驟）。
