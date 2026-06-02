import { Tree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner } from '../utils/testing';

function dataTree(): UnitTestTree {
  const tree = new UnitTestTree(Tree.empty());
  tree.create('/public/assets/data/timeline.json', JSON.stringify([{ id: 'p1' }]));
  tree.create('/public/assets/data/events.json', JSON.stringify([{ id: 'e1' }]));
  return tree;
}

const valid = {
  id: 'e2', title: 'T', description: 'D', start: '100', end: '100', period: 'P', periodId: 'p1',
  locationName: 'L', lat: 25, lng: 121, adminDivisions: '', categories: 'a,b', keywords: 'k', relatedEvents: '',
};

describe('add-event', () => {
  it('appends a valid event with parsed arrays', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('add-event', valid, dataTree());
    const events = JSON.parse(tree.readContent('/public/assets/data/events.json'));
    expect(events.length).toBe(2);
    const added = events.find((e: any) => e.id === 'e2');
    expect(added.location.coordinates).toEqual([25, 121]);
    expect(added.categories).toEqual(['a', 'b']);
    expect(added.date.periodId).toBe('p1');
  });

  it('rejects duplicate id', async () => {
    const runner = createRunner();
    await expectAsync(runner.runSchematic('add-event', { ...valid, id: 'e1' }, dataTree()))
      .toBeRejectedWithError(/Duplicate event id: e1/);
  });

  it('rejects unknown periodId', async () => {
    const runner = createRunner();
    await expectAsync(runner.runSchematic('add-event', { ...valid, periodId: 'nope' }, dataTree()))
      .toBeRejectedWithError(/Unknown periodId: nope/);
  });
});
