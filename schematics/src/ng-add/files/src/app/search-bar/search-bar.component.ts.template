import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as EventActions from '../store/actions/event.actions';
import * as MapActions from '../store/actions/map.actions';
import * as EventSelectors from '../store/selectors/event.selectors';
import { Subscription, Observable } from 'rxjs';
import Fuse from 'fuse.js';

const TEXTBOOK_OPTIONS = [
  { label: '七上 臺灣史', value: '社會科七年級上冊 臺灣史' },
  { label: '七下 臺灣史', value: '社會科七年級下冊 臺灣史' },
  { label: '七上 地理',   value: '社會科七年級上冊 地理' },
  { label: '八上 中國史', value: '社會科八年級上冊 中國史' },
  { label: '八上 地理',   value: '社會科八年級上冊 地理' },
  { label: '八下 世界史', value: '社會科八年級下冊 世界史' },
  { label: '九下 臺灣史', value: '社會科九年級下冊 臺灣近現代史' },
];

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

  textbookOptions = TEXTBOOK_OPTIONS;
  selectedTextbooks: string[] = [];

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

  toggleTextbook(value: string): void {
    const idx = this.selectedTextbooks.indexOf(value);
    if (idx > -1) {
      this.selectedTextbooks.splice(idx, 1);
    } else {
      this.selectedTextbooks.push(value);
    }
    this.runSearch();
  }

  removeTextbook(value: string): void {
    this.selectedTextbooks = this.selectedTextbooks.filter(v => v !== value);
    this.runSearch();
  }

  isTextbookSelected(value: string): boolean {
    return this.selectedTextbooks.includes(value);
  }

  getLabel(value: string): string {
    return TEXTBOOK_OPTIONS.find(o => o.value === value)?.label ?? value;
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
    this.selectedTextbooks = [];
    this.searchResults = [];
  }

  private runSearch(): void {
    if (!this.queryText && this.selectedTextbooks.length === 0) {
      this.searchResults = [];
      return;
    }

    let results: any[];
    if (this.queryText && this.fuse) {
      results = this.fuse.search(this.queryText).map(r => r.item);
    } else {
      results = [...this.allEvents];
    }

    if (this.selectedTextbooks.length > 0) {
      results = results.filter(e =>
        this.selectedTextbooks.some(tb =>
          e.examRelevance?.textbookReferences?.includes(tb)
        )
      );
    }

    this.searchResults = results;
  }
}
