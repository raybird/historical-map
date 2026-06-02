import { Tree } from '@angular-devkit/schematics';

export const DATA_PATHS = {
  events: 'public/assets/data/events.json',
  timeline: 'public/assets/data/timeline.json',
};

export function readJsonArray<T = unknown>(tree: Tree, filePath: string): T[] {
  const buffer = tree.read(filePath);
  if (!buffer) {
    throw new Error(`Data file not found: ${filePath}`);
  }
  const parsed = JSON.parse(buffer.toString('utf-8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array in ${filePath}`);
  }
  return parsed as T[];
}

export function writeJsonArray(tree: Tree, filePath: string, data: unknown[]): void {
  const text = JSON.stringify(data, null, 2) + '\n';
  if (tree.exists(filePath)) {
    tree.overwrite(filePath, text);
  } else {
    tree.create(filePath, text);
  }
}
