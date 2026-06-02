import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MapState } from '../reducers/map.reducer';

export const selectMapState = createFeatureSelector<MapState>('map');

export const selectMapEvents = createSelector(
  selectMapState,
  (state: MapState) => state.events
);

export const selectSelectedEventId = createSelector(
  selectMapState,
  (state: MapState) => state.selectedEventId
);

export const selectMapActiveLayers = createSelector(
  selectMapState,
  (state: MapState) => state.activeLayers
);
