# @raybird/historical-map-schematics

Angular Schematics：一鍵搭建「歷史事件 × 地圖」可互動體驗的 Angular 專案，並提供非互動產生器，讓人與 AI agent 共用同一套安全寫入指令快速依主題灌入資料。

## 安裝與初始化

於既有 Angular 20 workspace：

```bash
ng add @raybird/historical-map-schematics
```

產生模型、NgRx store、services、5 個元件 + app 元件、集中設定檔（`src/app/historical-map.config.ts`）、種子資料與資料驗證 script，並安裝 `@ngrx/store`、`fuse.js`、`leaflet`。

常用旗標（kebab-case）：`--app-title`、`--min-year`、`--max-year`、`--pixels-per-year`、`--include-sample-data`、`--project`。

## 產生器

| 名稱 | 用途 | 必填旗標 |
| --- | --- | --- |
| `add-period` | 新增時間軸分期 | `--id` `--label` `--start-year` `--end-year` |
| `add-event` | 新增歷史事件 | `--id` `--title` `--start` `--end` `--period-id` `--location-name` `--lat` `--lng` |
| `add-extension-field` | 為 `HistoricalEvent` 新增延伸欄位 | `--name` |

```bash
ng generate @raybird/historical-map-schematics:add-period \
  --id=ming --label=明朝 --start-year=1368 --end-year=1644 --interactive=false

ng generate @raybird/historical-map-schematics:add-event \
  --id=ming-001 --title=靖難之役 --start=1399 --end=1402 \
  --period-id=ming --location-name=南京 --lat=32.06 --lng=118.80 --interactive=false
```

加 `--interactive=false` 供 agent 批次執行；寫入前自動驗證 id 唯一性、`period-id` 是否存在、座標與年份範圍。

## 本機測試（npm link）

```bash
# 套件目錄
npm run build            # 編譯 + 複製模板
npm link

# 目標 Angular 專案
npm link @raybird/historical-map-schematics
ng add @raybird/historical-map-schematics
```

## 發佈（npm publish）

```bash
npm run build            # 確保 dist 模板齊全
npm publish --access public
```

> 套件 `package.json` 的 `schematics` 指向 `./src/collection.json`；發佈前請確認 `src/**/files/` 模板已隨 `copy:templates` 一併輸出。
