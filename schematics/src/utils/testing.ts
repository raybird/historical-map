import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

export function createRunner(): SchematicTestRunner {
  return new SchematicTestRunner(
    '@kevin/historical-map-schematics',
    path.join(__dirname, '..', 'collection.json'),
  );
}
