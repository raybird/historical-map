import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TimelineState } from '../reducers/timeline.reducer';

export const selectTimelineState = createFeatureSelector<TimelineState>('timeline');

export const selectPeriods = createSelector(
  selectTimelineState,
  (state: TimelineState) => state.periods
);

export const selectCurrentPeriodId = createSelector(
  selectTimelineState,
  (state: TimelineState) => state.currentPeriodId
);

export const selectTimelineLoading = createSelector(
  selectTimelineState,
  (state: TimelineState) => state.loading
);

export const selectTimelineError = createSelector(
  selectTimelineState,
  (state: TimelineState) => state.error
);
