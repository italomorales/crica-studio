import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const bundled = await build({
    stdin: {
        contents: `import '@angular/compiler'; export {LanguageAdminComponent} from './src/app/admin/language-admin'; export {LanguageAdminService} from './src/app/services/language-admin.service'; export {ChangeDetectorRef,NgZone,createEnvironmentInjector,runInInjectionContext} from '@angular/core';`,
        resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    define: { 'import.meta.env': '{}' },
    plugins: [
        {
            name: 'raw',
            setup(builder) {
                builder.onResolve({ filter: /\.html\?raw$/ }, (args) => ({
                    path: resolve(args.resolveDir, args.path),
                }));
                builder.onLoad({ filter: /\.html\?raw$/ }, async (args) => ({
                    contents: await readFile(args.path.replace('?raw', ''), 'utf8'),
                    loader: 'text',
                }));
            },
        },
    ],
});
const runtime = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
test('language editing opens a cloned draft, persists changes and updates the grid data', async (t) => {
    let saved: any;
    let marked = 0;
    const injector = runtime.createEnvironmentInjector([
        {
            provide: runtime.LanguageAdminService,
            useValue: {
                save: async (item: any) => {
                    saved = item;
                    return item;
                },
            },
        },
        {
            provide: runtime.ChangeDetectorRef,
            useValue: {
                markForCheck() {
                    marked++;
                },
                detectChanges() {},
            },
        },
        { provide: runtime.NgZone, useValue: { run: (fn: any) => fn() } },
    ]);
    t.after(() => injector.destroy());
    const component = runtime.runInInjectionContext(
        injector,
        () => new runtime.LanguageAdminComponent(),
    );
    const item = {
        code: 'fr',
        name: 'Francês',
        nativeName: 'Français',
        flagCode: 'FR',
        active: false,
        order: 30,
    };
    component.items = [item];
    component.edit(item);
    assert.equal(component.editing, true);
    assert.equal(marked, 1);
    component.draft.name = 'Francês atualizado';
    assert.equal(item.name, 'Francês');
    assert.equal(component.dirty, true);
    await component.save();
    assert.equal(saved.code, 'fr');
    assert.equal(saved.name, 'Francês atualizado');
    assert.equal(component.editing, false);
    assert.equal(component.items[0].name, 'Francês atualizado');
});
test('language deletion keeps failed rows, removes successful rows and blocks Portuguese', async (t) => {
    let fail = true;
    let calls = 0;
    let closed = false;
    const injector = runtime.createEnvironmentInjector([
        {
            provide: runtime.LanguageAdminService,
            useValue: {
                remove: async () => {
                    calls++;
                    if (fail) throw Error('Idioma com traduções vinculadas.');
                },
            },
        },
        { provide: runtime.ChangeDetectorRef, useValue: { markForCheck() {}, detectChanges() {} } },
        { provide: runtime.NgZone, useValue: { run: (fn: any) => fn() } },
    ]);
    t.after(() => injector.destroy());
    const component = runtime.runInInjectionContext(
        injector,
        () => new runtime.LanguageAdminComponent(),
    );
    const item = { code: 'fr', name: 'Francês' };
    component.items = [item];
    component.deleteDialog = {
        nativeElement: {
            close() {
                closed = true;
            },
        },
    };
    await component.remove(item);
    assert.equal(component.items.length, 1);
    assert.match(component.deletionError, /vinculadas/);
    assert.equal(closed, false);
    fail = false;
    await component.remove(item);
    assert.equal(component.items.length, 0);
    assert.equal(closed, true);
    await component.remove({ code: 'pt' });
    assert.equal(calls, 2);
});
