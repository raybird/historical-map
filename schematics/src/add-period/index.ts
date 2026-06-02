import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { AddPeriodOptions } from './schema';
import { DATA_PATHS, readJsonArray, writeJsonArray } from '../utils/json-file';
import { validatePeriod, PeriodInput } from '../utils/validation';

export function addPeriod(options: AddPeriodOptions): Rule {
  return (tree: Tree) => {
    const periods = readJsonArray<{ id: string }>(tree, DATA_PATHS.timeline);
    const existingIds = new Set(periods.map(p => p.id));

    const input: PeriodInput = {
      id: options.id, label: options.label, startYear: options.startYear,
      endYear: options.endYear, color: options.color, description: options.description,
    };
    const errors = validatePeriod(input, existingIds);
    if (errors.length) throw new SchematicsException(errors.join('; '));

    periods.push({
      id: input.id, label: input.label,
      startDate: String(input.startYear), endDate: String(input.endYear),
      startYear: input.startYear, endYear: input.endYear,
      color: input.color, description: input.description,
    } as any);

    writeJsonArray(tree, DATA_PATHS.timeline, periods);
    return tree;
  };
}
