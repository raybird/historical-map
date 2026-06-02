import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { AddExtensionFieldOptions } from './schema';

const MODEL_PATH = '/src/app/models/event.model.ts';

export function addExtensionField(options: AddExtensionFieldOptions): Rule {
  return (tree: Tree) => {
    const buffer = tree.read(MODEL_PATH);
    if (!buffer) throw new SchematicsException(`Model not found: ${MODEL_PATH}`);
    let content = buffer.toString('utf-8');

    const field = `${options.name}${options.optional ? '?' : ''}: ${options.fieldType};`;

    // 匹配 `interface HistoricalEvent extends HistoricalEventBase { ... }`
    const re = /(export\s+interface\s+HistoricalEvent\s+extends\s+HistoricalEventBase\s*\{)([\s\S]*?)(\})/;
    const match = content.match(re);
    if (!match) throw new SchematicsException('HistoricalEvent interface not found');

    const body = match[2];
    if (new RegExp(`\\b${options.name}\\??\\s*:`).test(body)) {
      throw new SchematicsException(`Field "${options.name}" already exists`);
    }

    content = content.replace(re, (_m, open, innerBody, close) => {
      const trimmed = innerBody.replace(/\s+$/, '');
      return `${open}${trimmed}\n  ${field}\n${close}`;
    });

    tree.overwrite(MODEL_PATH, content);
    return tree;
  };
}
