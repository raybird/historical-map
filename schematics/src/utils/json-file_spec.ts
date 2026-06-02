import { Tree } from '@angular-devkit/schematics';
import { readJsonArray, writeJsonArray, DATA_PATHS } from './json-file';

describe('json-file utils', () => {
  it('reads an array from the tree', () => {
    const tree = Tree.empty();
    tree.create(DATA_PATHS.events, JSON.stringify([{ id: 'a' }]));
    expect(readJsonArray(tree, DATA_PATHS.events)).toEqual([{ id: 'a' }]);
  });

  it('writes a formatted array back', () => {
    const tree = Tree.empty();
    tree.create(DATA_PATHS.events, '[]');
    writeJsonArray(tree, DATA_PATHS.events, [{ id: 'b' }]);
    const text = tree.read(DATA_PATHS.events)!.toString('utf-8');
    expect(JSON.parse(text)).toEqual([{ id: 'b' }]);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('throws when file missing', () => {
    const tree = Tree.empty();
    expect(() => readJsonArray(tree, DATA_PATHS.events)).toThrowError(/not found/);
  });
});
