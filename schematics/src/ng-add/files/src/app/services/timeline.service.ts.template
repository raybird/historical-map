import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as TimelineActions from '../store/actions/timeline.actions';
import { TimelinePeriod } from '../models/timeline.model';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  private timelineDataUrl = 'assets/data/timeline.json';

  constructor(private http: HttpClient, private store: Store<AppState>) {}

  loadTimelinePeriods(): void {
    this.store.dispatch(TimelineActions.loadTimelinePeriods());

    this.http.get<TimelinePeriod[]>(this.timelineDataUrl).subscribe({
      next: (periods) => {
        this.store.dispatch(TimelineActions.loadTimelinePeriodsSuccess({ periods }));
      },
      error: (error) => {
        this.store.dispatch(TimelineActions.loadTimelinePeriodsFailure({
          error: error.message || 'Failed to load timeline data'
        }));
      }
    });
  }
}
