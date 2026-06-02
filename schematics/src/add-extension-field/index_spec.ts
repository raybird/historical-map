import { Tree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner } from '../utils/testing';

const MODEL = `export interface HistoricalEventBase {
  id: string;
}

export interface HistoricalEvent extends HistoricalEventBase {}
`;

function modelTree(): UnitTestTree {
  const tree = new UnitTestTree(Tree.empty());
  tree.create('/src/app/models/event.model.ts', MODEL);
  return tree;
}

describe('add-extension-field', () => {
  it('adds an optional field to HistoricalEvent', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('add-extension-field',
      { name: 'factions', fieldType: 'string[]', optional: true }, modelTree());
    const content = tree.readContent('/src/app/models/event.model.ts');
    expect(content).toContain('factions?: string[];');
  });

  it('rejects duplicate field', async () => {
    const runner = createRunner();
    const tree = modelTree();
    tree.overwrite('/src/app/models/event.model.ts',
      MODEL.replace('extends HistoricalEventBase {}', 'extends HistoricalEventBase {\n  factions?: string[];\n}'));
    await expectAsync(runner.runSchematic('add-extension-field',
      { name: 'factions', fieldType: 'string[]', optional: true }, tree))
      .toBeRejectedWithError(/already exists/);
  });
});
