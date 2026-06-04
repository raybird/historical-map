import { Tree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner } from '../utils/testing';

function workspaceTree(): UnitTestTree {
  const tree = new UnitTestTree(Tree.empty());
  tree.create('/package.json', JSON.stringify({ name: 'host', dependencies: {}, devDependencies: {} }));
  tree.create('/angular.json', JSON.stringify({
    version: 1, projects: { host: {
      projectType: 'application', root: '', sourceRoot: 'src',
      architect: {}, prefix: 'app',
    } } }));
  tree.create('/src/main.ts',
    `import { bootstrapApplication } from '@angular/platform-browser';\nimport { appConfig } from './app/app.config';\nimport { App } from './app/app';\n\nbootstrapApplication(App, appConfig).catch((err) => console.error(err));\n`);
  tree.create('/src/app/app.ts', `export class App {}\n`);
  tree.create('/src/app/app.config.ts',
    `import { ApplicationConfig } from '@angular/core';\nexport const appConfig: ApplicationConfig = { providers: [] };\n`);
  return tree;
}

describe('ng-add', () => {
  it('creates core files and seeds data by default', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('ng-add',
      { appTitle: 'Test Map', minYear: -3000, maxYear: 2025, pixelsPerYear: 5, includeSampleData: true, project: 'host' },
      workspaceTree());

    expect(tree.exists('/src/app/historical-map.config.ts')).toBe(true);
    expect(tree.exists('/src/app/models/event.model.ts')).toBe(true);
    expect(tree.exists('/src/app/store/app.state.ts')).toBe(true);
    expect(tree.exists('/src/app/app.component.ts')).toBe(true);
    expect(tree.exists('/public/assets/data/events.json')).toBe(true);
    expect(tree.exists('/AGENTS.md')).toBe(true);

    const cfg = tree.readContent('/src/app/historical-map.config.ts');
    expect(cfg).toContain("appTitle: 'Test Map'");
    expect(cfg).toContain('minYear: -3000');

    const events = JSON.parse(tree.readContent('/public/assets/data/events.json'));
    expect(events.length).toBeGreaterThan(0);

    const pkg = JSON.parse(tree.readContent('/package.json'));
    expect(pkg.dependencies['leaflet']).toBeDefined();
    expect(pkg.dependencies['@ngrx/store']).toBeDefined();
    expect(pkg.scripts['test:data']).toBe('node scripts/validate-events.mjs');

    const cfgApp = tree.readContent('/src/app/app.config.ts');
    expect(cfgApp).toContain('provideStore');
    expect(cfgApp).toContain('provideHttpClient');

    const main = tree.readContent('/src/main.ts');
    expect(main).toContain('app.component');
    expect(main).toContain('AppComponent');
    expect(tree.exists('/src/app/app.ts')).toBe(false);

    const cfgSearch = tree.readContent('/src/app/historical-map.config.ts');
    expect(cfgSearch).toContain('filterField');
    expect(cfgSearch).toContain("filterField: 'categories'");

    const searchBar = tree.readContent('/src/app/search-bar/search-bar.component.ts');
    expect(searchBar).not.toContain('TEXTBOOK_OPTIONS');
    expect(searchBar).not.toContain('textbookReferences');
    expect(searchBar).toContain('historicalMapConfig');
  });

  it('writes empty data arrays when includeSampleData is false', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('ng-add',
      { appTitle: 'Empty', minYear: 0, maxYear: 2025, pixelsPerYear: 5, includeSampleData: false, project: 'host' },
      workspaceTree());
    expect(JSON.parse(tree.readContent('/public/assets/data/events.json'))).toEqual([]);
    expect(JSON.parse(tree.readContent('/public/assets/data/timeline.json'))).toEqual([]);
  });
});
