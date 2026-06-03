import { createRunner } from './testing';

describe('schematics harness', () => {
  it('loads the collection', () => {
    const runner = createRunner();
    expect(runner.engine.createCollection('@raybird/historical-map-schematics')).toBeTruthy();
  });
});
