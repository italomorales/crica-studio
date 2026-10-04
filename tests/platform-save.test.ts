import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const bundle = await build({
    stdin: { contents: `import '@angular/compiler';
        export { PlatformLogoPickerComponent } from './src/app/admin/platform-logo-picker';
        export { safePlatformLogo, PLATFORM_LOGOS } from './src/app/services/platform-logos';
        export { PlatformAdminComponent } from './src/app/admin/platform-admin';
        export { PlatformService } from './src/app/services/platform.service';
        export { AuthService } from './src/app/services/auth.service';
        export { AdminComponent } from './src/app/admin/admin';
        export { AdminCatalogService } from './src/app/services/admin-catalog.service';
        export { ActivatedRoute, Router } from '@angular/router';
        export { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';`, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'node', define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'raw', setup(builder) {
        builder.onResolve({ filter: /\.html\?raw$/ }, args => ({ path: resolve(args.resolveDir, args.path) }));
        builder.onLoad({ filter: /\.html\?raw$/ }, async args => ({ contents: await readFile(args.path.replace('?raw', ''), 'utf8'), loader: 'text' }));
    } }],
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('supplier editor selects platform IDs and preserves inactive existing links only for edits', t => {
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.AuthService, useValue: {} },
        { provide: runtime.AdminCatalogService, useValue: { whatsappNumber: '', allAffiliates: [] } },
        { provide: runtime.ActivatedRoute, useValue: { snapshot: { data: { section: 'fornecedores' } } } },
        { provide: runtime.Router, useValue: {} },
        { provide: runtime.ChangeDetectorRef, useValue: { markForCheck() {} } },
    ]);
    t.after(() => injector.destroy());
    const component = runtime.runInInjectionContext(injector, () => new runtime.AdminComponent());
    component.registeredPlatforms = [
        { id: 'active-id', name: 'Amazon US', active: true },
        { id: 'inactive-id', name: 'Old platform', active: false },
    ];
    component.draft.platformId = 'inactive-id'; component.isNew = false;
    assert.equal(component.selectablePlatforms.length, 2);
    component.isNew = true;
    assert.equal(component.selectablePlatforms.length, 1);
    component.selectPlatform('active-id');
    assert.equal(component.draft.platformId, 'active-id'); assert.equal(component.draft.platform, 'Amazon US');
});


test('platforms POST, PUT and reload one localized record with a stable ID', async t => {
    let saved: any;
    const methods: string[] = [];
    t.mock.method(globalThis, 'fetch', async (url: any, options: any = {}) => {
        const path = new URL(String(url)).pathname;
        assert.match(path, /\/catalog\/platforms/);
        methods.push(options.method || 'GET');
        assert.equal(options.headers.Authorization, 'Bearer test-token');
        if (options.method === 'POST' || options.method === 'PUT') {
            saved = { ...JSON.parse(options.body), id: '12345678-1234-4234-8234-123456789abc' };
            return new Response(JSON.stringify(saved));
        }
        return new Response(JSON.stringify([saved]));
    });
    const injector = runtime.createEnvironmentInjector([{ provide: runtime.AuthService, useValue: { accessToken: () => 'test-token' } }]);
    t.after(() => injector.destroy());
    const service = runtime.runInInjectionContext(injector, () => new runtime.PlatformService());
    const platform = await service.save({ id: '', name: 'Amazon', code: 'amazon', description: 'US store', url: 'https://example.com/?ref=123', logoUrl: null, locale: 'en-US', countryCode: 'US', status: 'draft', order: 20, active: true, mobileOnly: false });
    await service.save({ ...platform, name: 'Amazon US', status: 'published', order: 10 });
    const row = (await service.all())[0];
    assert.equal(row.id, platform.id); assert.equal(row.name, 'Amazon US'); assert.equal(row.locale, 'en-US'); assert.equal(row.countryCode, 'US'); assert.equal(row.status, 'published');
    assert.deepEqual(methods, ['POST', 'PUT', 'GET']);
});

test('failed platform save retains the editor and dirty draft', async t => {
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.PlatformService, useValue: { save: async () => { throw new Error('Código duplicado'); } } },
        { provide: runtime.ChangeDetectorRef, useValue: { markForCheck() {} } },
    ]);
    t.after(() => injector.destroy());
    const component = runtime.runInInjectionContext(injector, () => new runtime.PlatformAdminComponent());
    component.edit(); component.draft.name = 'My platform';
    await component.save();
    assert.equal(component.editing, true); assert.equal(component.dirty, true); assert.equal(component.saving, false);
    assert.equal(component.draft.name, 'My platform'); assert.equal(component.error, 'Código duplicado'); assert.equal(component.notice, '');
});

test('public platform and storefront requests select market without admin authorization', async t => {
    const injector = runtime.createEnvironmentInjector([{ provide: runtime.AuthService, useValue: {} }]);
    t.after(() => injector.destroy());
    t.mock.method(globalThis, 'fetch', async (url: any, options: any) => {
        const parsed = new URL(String(url));
        assert.equal(parsed.pathname, '/api/catalog/platforms');
        assert.equal(parsed.searchParams.get('locale'), 'en-US'); assert.equal(parsed.searchParams.get('country'), 'US');
        assert.equal(parsed.searchParams.get('storefronts'), 'true'); assert.equal(options, undefined);
        return new Response('[]');
    });
    const service = runtime.runInInjectionContext(injector, () => new runtime.PlatformService());
    assert.deepEqual(await service.publicPlatforms('en-US', 'US', true), []);
});


test('logo upload preserves current logo on failure and blocks selection while uploading', async t => {
    let finish: (url: string) => void = () => {};
    let fail = false;
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.PlatformService, useValue: { uploadLogo: () => fail ? Promise.reject(new Error('Falha no envio')) : new Promise<string>(resolve => { finish = resolve; }) } },
        { provide: runtime.ChangeDetectorRef, useValue: { markForCheck() {} } },
    ]);
    t.after(() => injector.destroy());
    const picker = runtime.runInInjectionContext(injector, () => new runtime.PlatformLogoPickerComponent());
    picker.value = runtime.PLATFORM_LOGOS[0].url;
    const busy: boolean[] = []; picker.uploadingChange.subscribe((value: boolean) => busy.push(value));
    const pending = picker.upload(new File(['image'], 'logo.png', { type: 'image/png' }));
    picker.select(runtime.PLATFORM_LOGOS[1].url);
    assert.equal(picker.value, runtime.PLATFORM_LOGOS[0].url);
    finish('https://cdn.example.com/catalog/platforms/logo.png'); await pending;
    assert.equal(picker.value, 'https://cdn.example.com/catalog/platforms/logo.png');
    assert.deepEqual(busy, [true, false]);
    fail = true; await picker.upload(new File(['image'], 'logo.png', { type: 'image/png' }));
    assert.equal(picker.value, 'https://cdn.example.com/catalog/platforms/logo.png');
    assert.equal(picker.error, 'Falha no envio');
    await picker.upload(new File(['svg'], 'logo.svg', { type: 'image/svg+xml' }));
    assert.match(picker.error, /JPG, PNG ou WebP/);
});

test('logo upload uses multipart and authenticated platform media endpoint', async t => {
    t.mock.method(globalThis, 'fetch', async (url: any, options: any) => {
        assert.match(String(url), /media\/platforms$/);
        assert.equal(options.headers.Authorization, 'Bearer test-token');
        assert.equal(options.headers['Content-Type'], undefined);
        assert.equal(options.body.get('file').name, 'logo.png');
        return new Response(JSON.stringify({ url: 'https://cdn.example.com/logo.png' }));
    });
    const injector = runtime.createEnvironmentInjector([{ provide: runtime.AuthService, useValue: { accessToken: () => 'test-token' } }]);
    t.after(() => injector.destroy());
    const service = runtime.runInInjectionContext(injector, () => new runtime.PlatformService());
    assert.equal(await service.uploadLogo(new File(['image'], 'logo.png', { type: 'image/png' })), 'https://cdn.example.com/logo.png');
    for (const logo of runtime.PLATFORM_LOGOS) assert.equal(runtime.safePlatformLogo(logo.url), logo.url);
    assert.equal(runtime.safePlatformLogo('/assets/platforms/../secret.svg'), '');
    assert.equal(runtime.safePlatformLogo('javascript:alert(1)'), '');
});
