import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { AddEventOptions } from './schema';
import { DATA_PATHS, readJsonArray, writeJsonArray } from '../utils/json-file';
import { validateEvent, EventInput } from '../utils/validation';

function csv(value: string): string[] {
  return (value ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

export function addEvent(options: AddEventOptions): Rule {
  return (tree: Tree) => {
    const periods = readJsonArray<{ id: string }>(tree, DATA_PATHS.timeline);
    const events = readJsonArray<{ id: string }>(tree, DATA_PATHS.events);
    const existingIds = new Set(events.map(e => e.id));

    const input: EventInput = {
      id: options.id, title: options.title, description: options.description,
      start: options.start, end: options.end, period: options.period, periodId: options.periodId,
      locationName: options.locationName, lat: options.lat, lng: options.lng,
      adminDivisions: csv(options.adminDivisions), categories: csv(options.categories),
      keywords: csv(options.keywords), relatedEvents: csv(options.relatedEvents),
    };

    const errors = validateEvent(input, periods, existingIds);
    if (errors.length) throw new SchematicsException(errors.join('; '));

    events.push({
      id: input.id, title: input.title, description: input.description,
      date: { start: input.start, end: input.end, period: input.period, periodId: input.periodId },
      location: { name: input.locationName, coordinates: [input.lat, input.lng], adminDivisions: input.adminDivisions },
      categories: input.categories, keywords: input.keywords, relatedEvents: input.relatedEvents,
    } as any);

    writeJsonArray(tree, DATA_PATHS.events, events);
    return tree;
  };
}
