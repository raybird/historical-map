# Historical Map Schematics

> GitHub：https://github.com/raybird/historical-map

Angular Schematics 一鍵搭建「歷史事件 × 地圖」可互動體驗的 Angular 專案，再由 AI agent 依主題快速灌入 JSON 資料。

- 資料驅動：事件與分期分別存於 `public/assets/data/events.json`、`timeline.json`
- 集中設定：標題、時間軸範圍、地圖初始視角統一在 `src/app/historical-map.config.ts`
- 核心固定 + 開放延伸：`HistoricalEvent` 透過 `extends HistoricalEventBase` 擴充欄位
- 非互動產生器：人與 AI agent 共用同一套安全寫入指令（自動驗證）

完整設計與規劃見 `docs/superpowers/specs/` 與 `docs/superpowers/plans/`。

## 一、初始化專案（ng add）

在既有 Angular 20 workspace 中執行：

```bash
ng add @raybird/historical-map-schematics
```

會建立模型、NgRx store、services、5 個元件 + app 元件、集中設定檔、種子資料與驗證 script，並安裝相依（`@ngrx/store`、`fuse.js`、`leaflet`）。

可選旗標（皆有 x-prompt 互動提示）：

| 旗標 | 預設 | 說明 |
| --- | --- | --- |
| `--app-title` | `Historical Map` | 標題列文字 |
| `--min-year` | `-5000` | 時間軸最早年份（負值為西元前） |
| `--max-year` | `2025` | 時間軸最晚年份 |
| `--pixels-per-year` | `5` | 時間軸每年像素 |
| `--include-sample-data` | `true` | 附帶可運作的展示種子；`--include-sample-data=false` 則產生空資料 |
| `--project` | 當前專案 | 目標 Angular 專案名稱 |

> 多字選項在命令列須用 kebab-case（如 `--app-title`、`--min-year`）。

## 二、產生器（人 / AI agent 共用）

加上 `--interactive=false` 即可供 agent 批次非互動執行。

### add-period — 新增分期

```bash
ng generate @raybird/historical-map-schematics:add-period \
  --id=ming --label=明朝 --start-year=1368 --end-year=1644 \
  --color=#C8102E --description=明朝 --interactive=false
```

旗標：`--id`（必填，唯一）、`--label`（必填）、`--start-year`（必填）、`--end-year`（必填）、`--color`（預設 `#4169E1`）、`--description`。

### add-event — 新增事件

```bash
ng generate @raybird/historical-map-schematics:add-event \
  --id=ming-001 --title=靖難之役 --description=... --start=1399 --end=1402 \
  --period=明朝 --period-id=ming --location-name=南京 --lat=32.06 --lng=118.80 \
  --categories=軍事,政治 --keywords=朱棣,建文帝 --interactive=false
```

旗標：`--id`、`--title`、`--start`、`--end`、`--period-id`、`--location-name`、`--lat`、`--lng` 為必填；`--description`、`--period`、`--admin-divisions`、`--categories`、`--keywords`、`--related-events` 選填（後四者為逗號分隔多值）。

寫入前自動驗證：id 不重複、`period-id` 須存在、座標範圍、年份落在設定範圍。

### add-extension-field — 為事件模型新增延伸欄位

```bash
ng generate @raybird/historical-map-schematics:add-extension-field \
  --name=factions --field-type=string[] --optional=true --interactive=false
```

旗標：`--name`（必填）、`--field-type`（預設 `string`）、`--optional`（預設 `true`）。欄位會注入 `HistoricalEvent extends HistoricalEventBase`，已存在則報錯。

## 三、換主題 SOP

1. 調整 `src/app/historical-map.config.ts` 的 `appTitle`、時間軸範圍與地圖初始視角。
2. 清空種子：`events.json` 與 `timeline.json` 皆設為 `[]`。
3. 用 `add-period` 建立主題分期。
4. 用 `add-event` 逐一（或迴圈批次）灌入事件。
5. 執行 `npm run test:data` 自我檢查，全綠後 `npm start` 驗證互動。

詳見產生專案內的 `AGENTS.md`。

## 四、本倉庫開發

本倉庫為 monorepo：`schematics/`（套件本體）+ `example-app/`（即時驗證靶）。

- `npm run build:schematics` — 編譯 schematics + 複製模板
- `npm run test:schematics` — 跑 schematics 單元測試
- `npm run verify` — 對 example-app 跑 `ng add` 並建置（SC-1 端到端驗證）
- `node scripts/verify-theme-swap.mjs` — 清種子後用產生器換主題並建置（SC-2，須先跑過 `npm run verify`）
