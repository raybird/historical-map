import {
  apply, applyTemplates, chain, mergeWith, move, Rule, SchematicContext, Tree, url,
  MergeStrategy,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { NgAddOptions } from './schema';

const DEPENDENCIES: Record<string, string> = {
  '@ngrx/store': '^20.1.0',
  'fuse.js': '^7.3.0',
  'leaflet': '^1.9.4',
};
const DEV_DEPENDENCIES: Record<string, string> = {
  '@types/leaflet': '^1.9.21',
};

function addDependencies(): Rule {
  return (tree: Tree) => {
    const pkgBuffer = tree.read('/package.json');
    if (!pkgBuffer) throw new Error('package.json not found in workspace root');
    const pkg = JSON.parse(pkgBuffer.toString('utf-8'));
    pkg.dependencies = { ...pkg.dependencies, ...DEPENDENCIES };
    pkg.devDependencies = { ...pkg.devDependencies, ...DEV_DEPENDENCIES };
    pkg.scripts = { ...pkg.scripts, 'test:data': 'node scripts/validate-events.mjs' };
    tree.overwrite('/package.json', JSON.stringify(pkg, null, 2) + '\n');
    return tree;
  };
}

function emptyDataIfNoSample(options: NgAddOptions): Rule {
  return (tree: Tree) => {
    if (!options.includeSampleData) {
      tree.overwrite('/public/assets/data/events.json', '[]\n');
      tree.overwrite('/public/assets/data/timeline.json', '[]\n');
    }
    return tree;
  };
}

function wireAppConfig(): Rule {
  return (tree: Tree) => {
    const path = '/src/app/app.config.ts';
    if (!tree.exists(path)) return tree;
    let content = tree.read(path)!.toString('utf-8');
    if (!content.includes('provideStore')) {
      content =
        `import { provideStore } from '@ngrx/store';\n` +
        `import { provideHttpClient } from '@angular/common/http';\n` +
        `import { appReducer } from './store/app.state';\n` +
        content.replace(/providers:\s*\[/, 'providers: [\n    provideStore(appReducer),\n    provideHttpClient(),');
      tree.overwrite(path, content);
    }
    return tree;
  };
}

function bootstrapAppComponent(): Rule {
  return (tree: Tree) => {
    // 改寫 main.ts，bootstrap 我們的 AppComponent。
    const mainPath = '/src/main.ts';
    if (tree.exists(mainPath)) {
      tree.overwrite(
        mainPath,
        `import { bootstrapApplication } from '@angular/platform-browser';\n` +
          `import { appConfig } from './app/app.config';\n` +
          `import { AppComponent } from './app/app.component';\n\n` +
          `bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));\n`,
      );
    }
    // 移除 ng new 產生的預設根元件，避免與 AppComponent 重複 (app-root)。
    for (const f of ['/src/app/app.ts', '/src/app/app.html', '/src/app/app.css', '/src/app/app.spec.ts']) {
      if (tree.exists(f)) tree.delete(f);
    }
    return tree;
  };
}

export function ngAdd(options: NgAddOptions): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    const templateSource = apply(url('./files'), [
      applyTemplates({
        appTitle: options.appTitle,
        minYear: options.minYear,
        maxYear: options.maxYear,
        pixelsPerYear: options.pixelsPerYear,
      }),
      move('/'),
    ]);

    context.addTask(new NodePackageInstallTask());

    return chain([
      mergeWith(templateSource, MergeStrategy.Overwrite),
      addDependencies(),
      emptyDataIfNoSample(options),
      wireAppConfig(),
      bootstrapAppComponent(),
    ]);
  };
}
