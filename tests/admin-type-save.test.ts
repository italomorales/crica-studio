import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const bundle = await build({
    stdin: {
        contents: `import '@angular/compiler';
            export { AdminComponent } from './src/app/admin/admin';
            export { AdminCatalogService } from './src/app/services/admin-catalog.service';
            export { LanguageAdminService } from './src/app/services/language-admin.service';
            export { AuthService } from './src/app/services/auth.service';
            export { ActivatedRoute, Router } from '@angular/router';
            export { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';`,
        resolveDir: process.cwd(),
    },
    bundle: true, write: false, format: 'esm', platform: 'node',
    define: { 'import.meta.env': '{}' },
    plugins: [{
        name: 'raw-templates',
        setup(build) {
            build.onResolve({ filter: /\.html\?raw$/ }, (args) => ({ path: resolve(args.resolveDir, args.path) }));
            build.onLoad({ filter: /\.html\?raw$/ }, async (args) => ({
                contents: await readFile(args.path.replace('?raw', ''), 'utf8'), loader: 'text',
            }));
        },
    }],
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

function fixture(t: any, saveType: (type: any) => Promise<void>) {
    let refreshes = 0;
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
        configurable: true, value: { clearTimeout() {}, setTimeout() { return 1; } },
    });
    t.after(() => {
        if (previous) Object.defineProperty(globalThis, 'window', previous);
        else delete (globalThis as any).window;
    });
    t.mock.method(globalThis, 'setTimeout', () => 1 as any);
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.AdminCatalogService, useValue: { whatsappNumber: '', saveType } },
        { provide: runtime.AuthService, useValue: {} },
        { provide: runtime.LanguageAdminService, useValue: { all: async () => [] } },
        { provide: runtime.Router, useValue: {} },
        { provide: runtime.ActivatedRoute, useValue: { snapshot: { data: { section: 'tipos' } } } },
        { provide: runtime.ChangeDetectorRef, useValue: { markForCheck() { refreshes++; } } },
    ]);
    const component = runtime.runInInjectionContext(injector, () => new runtime.AdminComponent());
    component.editing = true;
    component.isNew = true;
    component.typeDraft = { id: 'item-draft', name: 'Camiseta', scope: 'shop', active: true };
    t.after(() => injector.destroy());
    return { component, refreshes: () => refreshes };
}

test('successful type save closes the editor, shows feedback and refreshes after async completion', async (t) => {
    let finish!: () => void;
    let calls = 0;
    const f = fixture(t, () => { calls++; return new Promise<void>((resolve) => { finish = resolve; }); });
    f.component.query = 'Caneca';
    f.component.status = 'inactive';
    const pending = f.component.saveType();
    assert.equal(f.component.savingType, true);
    assert.equal(f.component.editing, true);
    assert.equal(f.component.canLeave(), false);
    await f.component.saveType();
    assert.equal(calls, 1);
    const before = f.refreshes();
    finish();
    await pending;
    assert.equal(f.component.editing, false);
    assert.equal(f.component.savingType, false);
    assert.equal(f.component.notice, 'Tipo salvo com sucesso.');
    assert.equal(f.component.query, '');
    assert.equal(f.component.status, 'all');
    assert.ok(f.refreshes() > before);
});

test('failed type save keeps the draft and shows the error instead of success', async (t) => {
    const f = fixture(t, async () => { throw new Error('Falha ao salvar tipo'); });
    await f.component.saveType();
    assert.equal(f.component.editing, true);
    assert.equal(f.component.savingType, false);
    assert.equal(f.component.typeDraft.name, 'Camiseta');
    assert.equal(f.component.noticeTone, 'error');
    assert.equal(f.component.notice, 'Falha ao salvar tipo');
    assert.ok(f.refreshes() > 0);
});

test('type inline translations save with the Portuguese original and survive language changes', async t => {
    let payload: any;
    const f = fixture(t, async item => { payload = structuredClone(item); });
    f.component.catalogEditor.selected = 'en';
    f.component.catalogEditor.change(f.component.typeDraft, 'name', 'T-shirt');
    f.component.catalogEditor.changeStatus(f.component.typeDraft, 'reviewed');
    f.component.catalogEditor.selected = 'es';
    f.component.catalogEditor.change(f.component.typeDraft, 'name', 'Camiseta ES');
    f.component.catalogEditor.selected = 'en';
    assert.equal(f.component.catalogEditor.value(f.component.typeDraft, 'name'), 'T-shirt');
    await f.component.saveType();
    assert.equal(payload.name, 'Camiseta');
    assert.equal(payload.translations.en.fields.name, 'T-shirt');
    assert.equal(payload.translations.en.status, 'reviewed');
    assert.equal(payload.translations.es.fields.name, 'Camiseta ES');
});
