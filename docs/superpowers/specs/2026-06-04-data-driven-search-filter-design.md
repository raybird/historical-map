# 設計：搜尋框篩選改為資料驅動（移除 cap-map 硬編碼）

日期：2026-06-04

## 背景與問題

`ng-add` 產生的應用，其搜尋框（`search-bar.component`）內含 cap-map 專屬的硬編碼：

1. `TEXTBOOK_OPTIONS` 常數（臺灣史課本分類，如「七上 臺灣史」）直接寫死在元件中。
2. 過濾邏輯綁定 `examRelevance.textbookReferences` —— 這是 cap-map 透過 `add-extension-field` 才會加上的欄位，**不存在於 `HistoricalEventBase`**。

因此任何全新 scaffold（例：[raybird/3S-5E](https://github.com/raybird/3S-5E)）都會得到一個「標籤是臺灣課本、且過濾欄位根本不存在於資料模型」的壞掉篩選面板，跑錯主題。

## 目標

讓篩選面板成為**通用、資料驅動、零設定**的功能：選項自動從事件資料衍生，預設取 base 模型既有的 `categories` 欄位；同時保留一個 config 旋鈕讓主題改指其他欄位（含嵌套路徑）。

## 設計決策（已確認）

- **選項來源**：由事件資料自動衍生 distinct 值，非硬編碼、非手動設定清單。
- **目標欄位**：預設 `categories`（base 模型一定有），但可在 config 改指任意欄位，含嵌套路徑如 `examRelevance.textbookReferences`。
- **顯示文字**：自動衍生 ⇒ 無 curated 短標籤，選項顯示文字即值本身。
- **空則隱藏**：衍生出的選項為空（欄位不存在或資料無值）時，整個篩選按鈕＋面板都不渲染。

## 變更範圍

只碰 4 個檔案，不動 NgRx 狀態層或其他元件。

### 1. `historical-map.config.ts.template`

`HistoricalMapConfig` 介面與 `historicalMapConfig` 預設值新增 `search` 區塊：

```ts
search: {
  filterField: string;   // 事件物件的點路徑，預設 'categories'
  filterLabel: string;   // 篩選面板標題，預設 '分類篩選'
};
```

預設值：`filterField: 'categories'`、`filterLabel: '分類篩選'`。

不新增 `ng-add` schema 旗標 / CLI 選項 —— 零設定即可運作；要換主題者手動改這兩個字串。

### 2. `search-bar.component.ts.template`

- **移除** `TEXTBOOK_OPTIONS` 常數，及所有 `examRelevance` / `textbookReferences` 字面引用。
- import `historicalMapConfig`，讀取 `filterField` / `filterLabel`。
- 新增點路徑解析輔助：`getFieldValues(event, path): string[]` —— 解析點路徑（支援嵌套），將結果（陣列或純量）正規化為 `string[]`。
- 事件載入後，對所有事件套用 `getFieldValues` 攤平、去重、排序，得 `filterOptions: string[]`。
- `filterLabel` 暴露給模板。
- 移除 `getLabel`（不再有 value→label 對照）。
- 過濾邏輯改用 `getFieldValues(event, filterField)` 取值，比對是否含任一 `selectedTextbooks`（可一併更名為 `selectedFilters`）已選值。

### 3. `search-bar.component.html.template`

- 面板標題綁 `filterLabel`。
- 選項迴圈改跑 `filterOptions`（`string[]`），chip 與選項按鈕直接顯示值。
- 篩選切換按鈕與面板外層包 `@if (filterOptions.length > 0)`。

### 4. `index_spec.ts`（`ng-add`）

新增回歸斷言：
- 產生的 `search-bar.component.ts` **不含** `TEXTBOOK_OPTIONS` 與 `textbookReferences`。
- 產生的 `historical-map.config.ts` 含 `filterField`。

## 驗證

- `npm run test:schematics` —— 單元測試（含新斷言）。
- `npm run verify` —— 對 example-app 跑 `ng add` 並建置；種子事件已填 `categories`（政治、軍事…），故 demo 開箱即顯示可運作的分類篩選。

## 非目標 / YAGNI

- 不為 `filterField` / `filterLabel` 新增 CLI 旗標或 x-prompt。
- 不支援多重篩選維度（多個 facet）—— 維持單一篩選欄位。
- 不為衍生值提供 value→label 映射設定。
