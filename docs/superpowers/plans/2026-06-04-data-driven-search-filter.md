# 資料驅動搜尋篩選 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `ng-add` 產生的搜尋框篩選面板從 cap-map 硬編碼（臺灣課本選項 + `examRelevance.textbookReferences` 欄位）改為資料驅動：選項自動從事件資料衍生，預設取 `categories`，並可透過 config 改指其他欄位（含嵌套路徑）。

**Architecture:** `historical-map.config.ts` 新增 `search.filterField` / `search.filterLabel` 兩個設定。`search-bar.component` 改為讀 config，用點路徑解析器從所有事件衍生 distinct 篩選選項；選項為空時整個面板不渲染。範圍只碰 4 個模板/測試檔，不動 NgRx 與其他元件。

**Tech Stack:** Angular Schematics（模板 `.template` 副檔名 + `applyTemplates` 變數插值）、Angular 20 standalone component、Fuse.js、Jasmine 單元測試。

**重要建置慣例（執行前必讀）：**
- 模板檔以 `.template` 結尾存放於 `schematics/src/ng-add/files/`，產生時去除副檔名並做 `<%= %>` 插值；TypeScript 不編譯 `files/`。
- Jasmine 只跑**編譯後**的 `*_spec.js`，所以改 `*_spec.ts` 後必須先 `npm run build:schematics` 才生效；`npm run test:schematics` 已含 build。
- 所有指令在倉庫根目錄 `/home/raybird/Documents/RCodes/historical-map` 執行。

---

## File Structure

- **Modify** `schematics/src/ng-add/files/src/app/historical-map.config.ts.template` — 新增 `search` 設定區塊（介面 + 預設值）。
- **Modify** `schematics/src/ng-add/files/src/app/search-bar/search-bar.component.ts.template` — 移除硬編碼，改資料驅動；新增點路徑解析輔助。
- **Modify** `schematics/src/ng-add/files/src/app/search-bar/search-bar.component.html.template` — 綁 `filterLabel`、跑 `filterOptions`（字串陣列）、空則隱藏。
- **Modify** `schematics/src/ng-add/index_spec.ts` — 新增回歸斷言。
- CSS（`search-bar.component.css.template`）class 名稱不變，**不需更動**。

---

## Task 1: 回歸測試（先寫失敗測試）

**Files:**
- Test: `schematics/src/ng-add/index_spec.ts`（修改第一個 `it` 區塊，約 22-55 行）

- [ ] **Step 1: 在第一個 `it('creates core files and seeds data by default', ...)` 區塊結尾（第 54 行 `expect(tree.exists('/src/app/app.ts')).toBe(false);` 之後、`});` 之前）加入斷言**

```ts
    const cfgSearch = tree.readContent('/src/app/historical-map.config.ts');
    expect(cfgSearch).toContain('filterField');
    expect(cfgSearch).toContain("filterField: 'categories'");

    const searchBar = tree.readContent('/src/app/search-bar/search-bar.component.ts');
    expect(searchBar).not.toContain('TEXTBOOK_OPTIONS');
    expect(searchBar).not.toContain('textbookReferences');
    expect(searchBar).toContain('historicalMapConfig');
```

- [ ] **Step 2: 編譯並執行測試，確認失敗**

Run: `npm run test:schematics`
Expected: FAIL —「creates core files and seeds data by default」案例失敗，因為 `historical-map.config.ts` 尚無 `filterField`，且 `search-bar.component.ts` 仍含 `TEXTBOOK_OPTIONS`。

- [ ] **Step 3: 提交失敗測試**

```bash
git add schematics/src/ng-add/index_spec.ts
git commit -m "test: 為搜尋框資料驅動篩選加入回歸斷言"
```

---

## Task 2: Config 新增 search 設定

**Files:**
- Modify: `schematics/src/ng-add/files/src/app/historical-map.config.ts.template`

- [ ] **Step 1: 在 `HistoricalMapConfig` 介面加入 `search` 欄位**

把介面（目前 1-5 行）改為：

```ts
export interface HistoricalMapConfig {
  appTitle: string;
  timeline: { minYear: number; maxYear: number; pixelsPerYear: number };
  map: { center: [number, number]; zoom: number };
  search: { filterField: string; filterLabel: string };
}
```

- [ ] **Step 2: 在 `historicalMapConfig` 物件加入 `search` 預設值**

把 `map` 區塊（目前 14-18 行）之後、結尾 `};` 之前補上 `search`，使物件結尾為：

```ts
  // 地圖初始視角；可依主題調整（預設世界視角，確保任何種子資料都看得到）。
  map: {
    center: [20, 30],
    zoom: 2,
  },
  // 搜尋篩選面板：選項自動從事件資料的 filterField 欄位衍生（支援嵌套點路徑，
  // 如 'examRelevance.textbookReferences'）。衍生選項為空時面板自動隱藏。
  search: {
    filterField: 'categories',
    filterLabel: '分類篩選',
  },
};
```

- [ ] **Step 3: 執行測試，確認 config 斷言通過、search-bar 斷言仍失敗**

Run: `npm run test:schematics`
Expected: 仍 FAIL，但失敗點移到 search-bar 斷言（`expect(searchBar).not.toContain('TEXTBOOK_OPTIONS')`）；`filterField` 相關斷言已不再報錯。

- [ ] **Step 4: 提交**

```bash
git add schematics/src/ng-add/files/src/app/historical-map.config.ts.template
git commit -m "feat: config 新增 search.filterField/filterLabel 設定"
```

---

## Task 3: 搜尋框元件改資料驅動（TS + HTML 一起改）

> TS 與 HTML 互相引用重新命名後的成員，必須同一個 commit 一起改，否則 `npm run verify` 會編譯失敗。

**Files:**
- Modify: `schematics/src/ng-add/files/src/app/search-bar/search-bar.component.ts.template`
- Modify: `schematics/src/ng-add/files/src/app/search-bar/search-bar.component.html.template`

- [ ] **Step 1: 改寫元件 TS — 用以下完整內容覆蓋 `search-bar.component.ts.template`**

```ts
import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as EventActions from '../store/actions/event.actions';
import * as MapActions from '../store/actions/map.actions';
import * as EventSelectors from '../store/selectors/event.selectors';
import { Subscription, Observable } from 'rxjs';
import Fuse from 'fuse.js';
import { historicalMapConfig } from '../historical-map.config';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css'],
  standalone: true,
  imports: [AsyncPipe],
})
export class SearchBarComponent implements OnInit, OnDestroy {
  events$!: Observable<any[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  searchResults: any[] = [];
  fuse!: Fuse<any>;
  isFocused = false;
  queryText = '';
  showFilterPanel = false;

  // 篩選面板：選項自動從事件資料衍生，欄位與標題由 config 設定。
  readonly filterField = historicalMapConfig.search.filterField;
  readonly filterLabel = historicalMapConfig.search.filterLabel;
  filterOptions: string[] = [];
  selectedFilters: string[] = [];

  private allEvents: any[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private store: Store<AppState>,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.events$ = this.store.select(EventSelectors.selectEvents);
    this.loading$ = this.store.select(EventSelectors.selectEventLoading);
    this.error$ = this.store.select(EventSelectors.selectEventError);

    const eventsSub = this.events$.subscribe(events => {
      if (events.length > 0) {
        this.allEvents = events;
        this.initializeFuse(events);
        this.buildFilterOptions(events);
      }
    });
    this.subscriptions.push(eventsSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get showResults(): boolean {
    return this.isFocused && this.searchResults.length > 0;
  }

  initializeFuse(events: any[]): void {
    this.fuse = new Fuse(events, {
      keys: ['title', 'description', 'keywords'],
      threshold: 0.3
    });
  }

  // 解析點路徑（支援嵌套，如 'examRelevance.textbookReferences'），
  // 將結果（陣列或純量）正規化為 string[]。
  private getFieldValues(event: any, path: string): string[] {
    const raw = path.split('.').reduce(
      (acc: any, key: string) => (acc == null ? acc : acc[key]),
      event
    );
    if (raw == null) return [];
    return (Array.isArray(raw) ? raw : [raw]).map(v => String(v));
  }

  private buildFilterOptions(events: any[]): void {
    const set = new Set<string>();
    for (const e of events) {
      for (const v of this.getFieldValues(e, this.filterField)) {
        set.add(v);
      }
    }
    this.filterOptions = Array.from(set).sort();
  }

  onSearch(event: Event): void {
    this.queryText = (event.target as HTMLInputElement).value.trim();
    this.runSearch();
  }

  onFocus(): void {
    this.isFocused = true;
    this.showFilterPanel = false;
  }

  toggleFilterPanel(event: Event): void {
    event.stopPropagation();
    this.showFilterPanel = !this.showFilterPanel;
    if (this.showFilterPanel) {
      this.isFocused = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isFocused = false;
      this.showFilterPanel = false;
    }
  }

  toggleFilter(value: string): void {
    const idx = this.selectedFilters.indexOf(value);
    if (idx > -1) {
      this.selectedFilters.splice(idx, 1);
    } else {
      this.selectedFilters.push(value);
    }
    this.runSearch();
  }

  removeFilter(value: string): void {
    this.selectedFilters = this.selectedFilters.filter(v => v !== value);
    this.runSearch();
  }

  isFilterSelected(value: string): boolean {
    return this.selectedFilters.includes(value);
  }

  selectEvent(eventId: string): void {
    this.isFocused = false;
    this.searchResults = [];
    this.store.dispatch(EventActions.selectEvent({ eventId }));
    this.store.dispatch(MapActions.selectEvent({ eventId }));
  }

  clearSearch(): void {
    const input = document.querySelector('#search-input') as HTMLInputElement;
    if (input) input.value = '';
    this.queryText = '';
    this.selectedFilters = [];
    this.searchResults = [];
  }

  private runSearch(): void {
    if (!this.queryText && this.selectedFilters.length === 0) {
      this.searchResults = [];
      return;
    }

    let results: any[];
    if (this.queryText && this.fuse) {
      results = this.fuse.search(this.queryText).map(r => r.item);
    } else {
      results = [...this.allEvents];
    }

    if (this.selectedFilters.length > 0) {
      results = results.filter(e => {
        const values = this.getFieldValues(e, this.filterField);
        return this.selectedFilters.some(f => values.includes(f));
      });
    }

    this.searchResults = results;
  }
}
```

- [ ] **Step 2: 改寫元件 HTML — 用以下完整內容覆蓋 `search-bar.component.html.template`**

```html
<div class="search-box-container">
  <div class="search-input-wrapper" [class.has-chips]="selectedFilters.length > 0">
    <span class="search-icon">🔍</span>

    @for (f of selectedFilters; track f) {
      <span
        class="filter-chip"
        (mousedown)="$event.preventDefault()"
        (click)="removeFilter(f)">
        {{ f }}
        <span class="filter-chip-remove">✕</span>
      </span>
    }

    <input
      type="text"
      class="search-input"
      id="search-input"
      [placeholder]="selectedFilters.length > 0 ? '輸入關鍵字進一步篩選...' : '輸入關鍵字搜尋事件...'"
      (input)="onSearch($event)"
      (focus)="onFocus()"
      autocomplete="off"
    />

    @if (filterOptions.length > 0) {
      <button
        type="button"
        class="filter-toggle-btn"
        [class.active]="showFilterPanel"
        (mousedown)="$event.preventDefault()"
        (click)="toggleFilterPanel($event)"
        [title]="filterLabel">
        <svg class="book-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20M4 19.5C4 20.163 4.26339 20.7989 4.73223 21.2678C5.20107 21.7366 5.83696 22 6.5 22H20M4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2H20V17H6.5C5.83696 17 5.20107 17.2634 4.73223 17.7322C4.26339 18.2011 4 18.837 4 19.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    }

    @if (searchResults.length > 0 || queryText || selectedFilters.length > 0) {
      <button class="clear-button" (click)="clearSearch()">×</button>
    }
  </div>

  <!-- 篩選面板（選項自動從資料衍生，欄位由 config.search.filterField 決定） -->
  @if (showFilterPanel && filterOptions.length > 0) {
    <div class="filter-panel">
      <div class="filter-panel-header">{{ filterLabel }}</div>
      <div class="filter-chip-grid">
        @for (opt of filterOptions; track opt) {
          <button
            class="filter-option"
            [class.selected]="isFilterSelected(opt)"
            (mousedown)="$event.preventDefault()"
            (click)="toggleFilter(opt)">
            {{ opt }}
          </button>
        }
      </div>
    </div>
  }

  <!-- 搜尋結果 -->
  @if (showResults) {
    <div class="search-results-container">
      <div class="results-header">
        <h4>搜尋結果</h4>
        <span class="result-count">
          {{ searchResults.length }} 個結果
          @if (selectedFilters.length > 0) {
            <span class="filter-active-badge">已套用篩選</span>
          }
        </span>
      </div>
      <ul class="results-list">
        @for (event of searchResults; track event.id) {
          <li class="result-item" (click)="selectEvent(event.id)">
            <div class="result-header">
              <span class="result-title">{{ event.title }}</span>
            </div>
            <div class="result-meta">
              <span class="result-dynasty">{{ event.date?.period || event.date?.start }}</span>
              <span class="result-location">{{ event.location?.name }}</span>
            </div>
          </li>
        }
      </ul>
    </div>
  }

  @if (loading$ | async) {
    <div class="search-loading">載入中...</div>
  }
  @if ((error$ | async) && !(loading$ | async)) {
    <div class="search-message">搜尋失敗: {{ error$ | async }}</div>
  }
</div>
```

- [ ] **Step 3: 執行單元測試，確認全數通過**

Run: `npm run test:schematics`
Expected: PASS —「creates core files and seeds data by default」與「writes empty data arrays...」皆通過，Task 1 新增的斷言全綠。

- [ ] **Step 4: 提交**

```bash
git add schematics/src/ng-add/files/src/app/search-bar/search-bar.component.ts.template schematics/src/ng-add/files/src/app/search-bar/search-bar.component.html.template
git commit -m "feat: 搜尋框篩選改為資料驅動，移除 cap-map 硬編碼"
```

---

## Task 4: 端到端驗證

**Files:** 無（僅執行驗證腳本）

- [ ] **Step 1: 對 example-app 跑 ng add 並建置**

Run: `npm run verify`
Expected: PASS — example-app 安裝相依、`ng add` 套用模板、`ng build` 成功編譯（驗證 TS+HTML 重新命名後的成員一致、`historicalMapConfig.search` 型別正確）。

- [ ] **Step 2: 若 example-app 工作目錄有產出變更，依專案慣例處理**

Run: `git status`
Expected: 確認沒有非預期的追蹤檔變更；`verify` 產生的 example-app 中間產物若被 `.gitignore` 忽略則無需提交。若有需要提交的變更，檢視後提交：

```bash
git add -A
git commit -m "chore: 同步 example-app 驗證產物"
```

（若 `git status` 乾淨，跳過此步。）

---

## Self-Review

**Spec coverage：**
- 「config 新增 search 區塊（filterField/filterLabel）」→ Task 2 ✔
- 「移除 TEXTBOOK_OPTIONS 與 examRelevance/textbookReferences 字面引用」→ Task 3 Step 1 ✔
- 「點路徑解析器 getFieldValues、衍生 distinct 並排序」→ Task 3 Step 1（`getFieldValues` / `buildFilterOptions`）✔
- 「label＝值本身、移除 getLabel」→ Task 3（無 `getLabel`，HTML 直接 `{{ opt }}` / `{{ f }}`）✔
- 「選項空則整個面板隱藏」→ Task 3 Step 2（`@if (filterOptions.length > 0)` 包按鈕與面板）✔
- 「HTML 標題綁 filterLabel、迴圈跑 filterOptions」→ Task 3 Step 2 ✔
- 「index_spec 回歸斷言」→ Task 1 ✔
- 「驗證：test:schematics + verify」→ Task 3 Step 3、Task 4 ✔

**Placeholder scan：** 無 TBD/TODO；所有程式碼步驟皆給完整內容。

**Type consistency：**
- 成員命名一致：`selectedFilters`、`filterOptions`、`toggleFilter`、`removeFilter`、`isFilterSelected`、`filterField`、`filterLabel` 於 TS 定義並於 HTML 使用，名稱一一對應。
- 移除的舊成員（`textbookOptions`、`selectedTextbooks`、`toggleTextbook`、`removeTextbook`、`isTextbookSelected`、`getLabel`、`TEXTBOOK_OPTIONS`）在新 TS/HTML 中均無殘留引用。
- `historicalMapConfig.search.filterField` / `.filterLabel` 與 Task 2 介面定義型別（string）相符。
