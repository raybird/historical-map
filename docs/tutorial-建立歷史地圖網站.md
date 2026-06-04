# 教學：用 historical-map-schematics 建立某一時期的歷史地圖網站

> 建立日期：2026-06-04
> 適用版本：`@raybird/historical-map-schematics` 0.0.1、Angular 20
> 全程以「**唐代歷史地圖**」為實際範例，照著做即可產出一個可互動、可部署的網站。

本文件可獨立閱讀。讀完你會得到一個「地圖標記 ↔ 時間軸 ↔ 側欄詳情 ↔ 搜尋」全鏈路可互動的單頁應用，內含你指定時期的分期與事件資料。

---

## 0. 成品長什麼樣子

- 左/中：Leaflet 地圖，每個歷史事件是一個地圖標記。
- 下方：時間軸（依你設定的年代範圍縮放），可點選跳轉。
- 右側：事件側欄，顯示選中事件的詳情。
- 上方：搜尋列（Fuse.js 模糊搜尋標題／關鍵字）+ 圖層控制。

資料完全由兩個 JSON 檔驅動：

| 檔案 | 內容 |
| --- | --- |
| `public/assets/data/timeline.json` | 分期（period），例如「唐朝」 |
| `public/assets/data/events.json` | 事件（event），例如「玄武門之變」 |

---

## 1. 前置需求

```bash
node -v   # 需 Node 20+（Angular 20 要求）
npm i -g @angular/cli@20   # 若尚未安裝 Angular CLI 20
ng version # 確認 Angular CLI 為 20.x
```

> 本 schematics 設計給 **Angular 20 workspace**。若 CLI 為其他大版本，請先切到 20。

---

## 2. 建立一個乾淨的 Angular workspace

```bash
ng new tang-map --style=css --routing=false
cd tang-map
```

- `tang-map` 是專案名稱，可自取。
- style 用 css、不需要 routing（本 app 是單頁）。

---

## 3. 一鍵搭建骨架（ng add）

在專案根目錄執行。這一步會建立模型、NgRx store、services、5 個元件 + app 元件、集中設定檔、種子資料與驗證 script，並安裝相依（`@ngrx/store`、`fuse.js`、`leaflet`）。

**互動式（會逐項詢問）：**

```bash
ng add @raybird/historical-map-schematics
```

**或一次帶齊參數（建議，可重現）：**

```bash
ng add @raybird/historical-map-schematics --skip-confirmation \
  --app-title="唐代歷史地圖" \
  --min-year=500 \
  --max-year=1000 \
  --pixels-per-year=20 \
  --include-sample-data=false
```

參數說明：

| 旗標 | 本範例值 | 說明 |
| --- | --- | --- |
| `--app-title` | `唐代歷史地圖` | 標題列文字 |
| `--min-year` | `500` | 時間軸最早年份（負值為西元前，如 `-221`） |
| `--max-year` | `1000` | 時間軸最晚年份 |
| `--pixels-per-year` | `20` | 每年像素；範圍越短可調越大，事件才不會擠在一起 |
| `--include-sample-data` | `false` | **直接產生空資料**，省去後面「清空種子」步驟 |

> 多字選項在命令列一律用 kebab-case（`--app-title`、`--min-year`）。
> 若你想先看一個可運作的展示，把 `--include-sample-data` 設為 `true`（或省略，預設即 true），再依第 5 步清空。

完成後，`ng add` 也會：自動把 `provideStore` / `provideHttpClient` 注入 `app.config.ts`、改寫 `main.ts` bootstrap 自家 `AppComponent`、並刪除 `ng new` 的預設根元件。**不需要手動改任何程式碼。**

---

## 4. 設定主題（集中設定檔）

打開 `src/app/historical-map.config.ts`，這是**唯一真實來源**。`appTitle` 與 `timeline` 已由 `ng add` 帶入，你主要需要調整 **地圖初始視角 `map`**，讓鏡頭對準你的主題地區：

```ts
export const historicalMapConfig: HistoricalMapConfig = {
  appTitle: '唐代歷史地圖',
  timeline: {
    minYear: 500,
    maxYear: 1000,
    pixelsPerYear: 20,
  },
  map: {
    center: [34, 110], // 對準中國中原（西安一帶）；[lat, lng]
    zoom: 4,           // 數字越大越近
  },
};
```

> 之後若要改標題或年代範圍，改這裡即可——時間軸與資料驗證都讀這份設定。

---

## 5. 清空種子資料（若第 3 步用了 `--include-sample-data=true` 才需要）

把兩個資料檔內容都設為空陣列：

```bash
echo "[]" > public/assets/data/events.json
echo "[]" > public/assets/data/timeline.json
```

> 若第 3 步已用 `--include-sample-data=false`，此步可跳過（檔案本來就是 `[]`）。

---

## 6. 建立分期（add-period）

分期是事件的歸類容器，**必須先建立**，因為事件的 `period-id` 會被驗證「是否存在」。

唐代範例（先建隋、唐兩個分期）：

```bash
ng generate @raybird/historical-map-schematics:add-period \
  --id=sui --label=隋朝 --start-year=581 --end-year=618 \
  --color=#8E44AD --description="隋朝統一南北" --interactive=false

ng generate @raybird/historical-map-schematics:add-period \
  --id=tang --label=唐朝 --start-year=618 --end-year=907 \
  --color=#C8102E --description="唐朝" --interactive=false
```

旗標：`--id`（必填，唯一）、`--label`（必填）、`--start-year`（必填）、`--end-year`（必填）、`--color`（hex，預設 `#4169E1`）、`--description`。

> 驗證：id 不可重複、color 須為合法 hex、`end-year >= start-year`。

---

## 7. 灌入事件（add-event）

每個事件需要座標（`--lat` / `--lng`）與所屬分期（`--period-id`，須對應第 6 步建立的分期 id）。

唐代範例（4 筆）：

```bash
ng generate @raybird/historical-map-schematics:add-event \
  --id=tang-001 --title=玄武門之變 --description="李世民奪嫡即位" \
  --start=626 --end=626 --period=唐朝 --period-id=tang \
  --location-name=長安 --lat=34.27 --lng=108.95 \
  --categories=政治,軍事 --keywords=李世民,玄武門 --interactive=false

ng generate @raybird/historical-map-schematics:add-event \
  --id=tang-002 --title=貞觀之治 --description="唐太宗治世" \
  --start=627 --end=649 --period=唐朝 --period-id=tang \
  --location-name=長安 --lat=34.27 --lng=108.95 \
  --categories=政治 --keywords=唐太宗,貞觀 --interactive=false

ng generate @raybird/historical-map-schematics:add-event \
  --id=tang-003 --title=安史之亂 --description="安祿山、史思明叛亂" \
  --start=755 --end=763 --period=唐朝 --period-id=tang \
  --location-name=范陽 --lat=39.90 --lng=116.40 \
  --categories=軍事 --keywords=安祿山,史思明 --interactive=false

ng generate @raybird/historical-map-schematics:add-event \
  --id=tang-004 --title=黃巢之亂 --description="唐末民變" \
  --start=875 --end=884 --period=唐朝 --period-id=tang \
  --location-name=長安 --lat=34.27 --lng=108.95 \
  --categories=軍事,民變 --keywords=黃巢 --interactive=false
```

必填旗標：`--id`、`--title`、`--start`、`--end`、`--period-id`、`--location-name`、`--lat`、`--lng`。
選填：`--description`、`--period`、`--admin-divisions`、`--categories`、`--keywords`、`--related-events`（後四者逗號分隔多值）。

> 寫入前自動驗證：id 不重複、`period-id` 須存在、座標範圍（lat∈[-90,90]、lng∈[-180,180]）、`start` 年份須落在 config 的 `[minYear, maxYear]`、`relatedEvents` 不可指向不存在的事件。任何一項不過就會中止且不寫檔。

---

## 8.（選用）為事件新增延伸欄位（add-extension-field）

若你的主題需要額外欄位（例如「在位皇帝」`emperor`），可擴充模型而不動核心：

```bash
ng generate @raybird/historical-map-schematics:add-extension-field \
  --name=emperor --field-type=string --optional=true --interactive=false
```

欄位會注入 `src/app/models/event.model.ts` 的 `HistoricalEvent extends HistoricalEventBase`。之後就能在 `events.json` 為事件加上該欄位。

---

## 9. 自我檢查與本機預覽

```bash
npm run test:data   # 驗證 JSON 資料合法（沿用與產生器同一套規則）
npm start           # 啟動開發伺服器
```

瀏覽器開啟 `http://localhost:4200`，應看到地圖上出現你灌入的事件標記、時間軸落在 500–1000、點標記可在右側看詳情、搜尋列可搜到「安史之亂」等。

> `npm run test:data` 全綠才代表資料層沒問題；它檢查的規則與 `add-event` / `add-period` 完全一致，是部署前的最後一道閘門。

---

## 10. 建置與部署

```bash
ng build   # 產物在 dist/<專案名>/browser
```

`dist/.../browser` 是純靜態檔，可部署到任何靜態主機：

- **GitHub Pages**：把 `browser` 內容推到 `gh-pages` 分支（注意 base href，必要時 `ng build --base-href=/repo-name/`）。
- **Netlify / Vercel / Cloudflare Pages**：build command 設 `ng build`，發佈目錄設 `dist/<專案名>/browser`。

---

## 11. 批次 / 交給 AI agent 灌資料

所有產生器都支援 `--interactive=false`，可寫成迴圈批次執行；資料正確性由內建驗證保證，人與 AI agent 走同一條安全路徑。範例（bash 迴圈，從你準備好的清單灌入）：

```bash
# 假設你有一個事件清單，可用 shell 迴圈逐筆呼叫 add-event。
# 每筆失敗（驗證不過）會中止並印出原因，據此修正資料即可。
while IFS='|' read -r id title start end loc lat lng; do
  ng generate @raybird/historical-map-schematics:add-event \
    --id="$id" --title="$title" --start="$start" --end="$end" \
    --period=唐朝 --period-id=tang \
    --location-name="$loc" --lat="$lat" --lng="$lng" --interactive=false
done < events.txt
```

> 產生的專案內附有 `AGENTS.md`，已寫好資料 schema、驗證規則與產生器指令，可直接交給 AI agent 當作工作說明。

---

## 12. 換成「別的時期」要改什麼

把上面範例的唐代換成任何時期，只有 4 處要動：

1. **`ng add` 的年代範圍**：`--min-year` / `--max-year`（西元前用負值，如戰國 `--min-year=-475 --max-year=-221`）。
2. **`historical-map.config.ts` 的 `map.center` / `zoom`**：對準該時期的地理重心。
3. **`add-period`**：建立該時期的分期。
4. **`add-event`**：灌入該時期的事件（座標用該地點的現代經緯度即可）。

其餘骨架、元件、互動行為完全不用改。

---

## 13. 疑難排解

| 症狀 | 原因 / 解法 |
| --- | --- |
| `add-event` 報 `Unknown periodId` | 事件的 `--period-id` 在 `timeline.json` 找不到；先用 `add-period` 建立該分期。 |
| `add-event` 報 year outside range | `--start` 不在 config 的 `[minYear, maxYear]`；調整事件年份或放寬 `historical-map.config.ts` 的年代範圍。 |
| `Duplicate event id` / `Duplicate period id` | id 必須唯一；換一個 id。 |
| 地圖一片空白、看不到標記 | `map.center` / `zoom` 沒對準資料所在地區；調整 `historical-map.config.ts` 的 `map`。 |
| 時間軸事件擠在一起或太散 | 調 `pixelsPerYear`（範圍短調大、範圍長調小）。 |
| `npm start` 後標記沒更新 | 確認改的是 `public/assets/data/*.json`，並重新整理瀏覽器。 |

---

## 附錄：資料 schema 速查

**分期（timeline.json 內每筆）：**
`id`、`label`、`startDate`、`endDate`、`startYear`、`endYear`、`color`(hex)、`description`。
（用 `add-period` 產生時，`startDate`/`endDate` 會自動以年份字串填入。）

**事件（events.json 內每筆）：**
`id`、`title`、`description`、`date{start,end,period,periodId}`、`location{name,coordinates:[lat,lng],adminDivisions[]}`、`categories[]`、`keywords[]`、`relatedEvents[]`，加上你用 `add-extension-field` 增補的欄位。
