import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EventState } from '../reducers/event.reducer';

export const selectEventState = createFeatureSelector<EventState>('event');

export const selectEvents = createSelector(
  selectEventState,
  (state: EventState) => state.events
);

export const selectSelectedEventId = createSelector(
  selectEventState,
  (state: EventState) => state.selectedEventId
);

export const selectSelectedEvent = createSelector(
  selectEvents,
  selectSelectedEventId,
  (events, selectedEventId) => {
    if (!selectedEventId || !events) {
      return null;
    }
    return events.find(event => event.id === selectedEventId) || null;
  }
);

export const selectEventLoading = createSelector(
  selectEventState,
  (state: EventState) => state.loading
);

export const selectEventError = createSelector(
  selectEventState,
  (state: EventState) => state.error
);
