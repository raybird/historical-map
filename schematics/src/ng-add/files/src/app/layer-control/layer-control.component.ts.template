import { Component, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as MapActions from '../store/actions/map.actions';
import * as MapSelectors from '../store/selectors/map.selectors';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-layer-control',
  templateUrl: './layer-control.component.html',
  styleUrls: ['./layer-control.component.css'],
  standalone: true,
  imports: [AsyncPipe],
})
export class LayerControlComponent implements OnInit {
  activeLayers$!: Observable<string[]>;
  isOpen = false;

  availableLayers = [
    { id: '歷史', name: '歷史事件', color: '#c41e3a' },
    { id: '地理', name: '地理事件', color: '#3a87bc' },
    { id: '公民', name: '公民事件', color: '#5a9a3a' },
  ];

  constructor(private store: Store<AppState>) {}

  ngOnInit(): void {
    this.activeLayers$ = this.store.select(MapSelectors.selectMapActiveLayers);
  }

  toggleLayer(layerId: string): void {
    this.store.dispatch(MapActions.toggleMapLayer({ layerId }));
  }

  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }
}