import { Tree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner } from '../utils/testing';

function dataTree(): UnitTestTree {
  const tree = new UnitTestTree(Tree.empty());
  tree.create('/public/assets/data/timeline.json', JSON.stringify([{ id: 'p1' }]));
  return tree;
}

const valid = { id: 'p2', label: '近世', startYear: 1500, endYear: 1800, color: '#2E8B57', description: 'd' };

describe('add-period', () => {
  it('appends a valid period with derived date strings', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('add-period', valid, dataTree());
    const periods = JSON.parse(tree.readContent('/public/assets/data/timeline.json'));
    expect(periods.length).toBe(2);
    const p = periods.find((x: any) => x.id === 'p2');
    expect(p.startDate).toBe('1500');
    expect(p.endDate).toBe('1800');
  });

  it('rejects duplicate id', async () => {
    const runner = createRunner();
    await expectAsync(runner.runSchematic('add-period', { ...valid, id: 'p1' }, dataTree()))
      .toBeRejectedWithError(/Duplicate period id: p1/);
  });

  it('rejects invalid hex color', async () => {
    const runner = createRunner();
    await expectAsync(runner.runSchematic('add-period', { ...valid, color: 'blue' }, dataTree()))
      .toBeRejectedWithError(/Invalid hex color: blue/);
  });
});
