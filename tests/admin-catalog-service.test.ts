import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
    stdin: {
        contents: `import '@angular/compiler';
            export { AdminCatalogService } from './src/app/services/admin-catalog.service';
            export { AuthService } from './src/app/services/auth.service';
            export { createEnvironmentInjector, runInInjectionContext } from '@angular/core';`,
        resolveDir: process.cwd(),
    },
    bundle: true, write: false, format: 'esm', platform: 'node',
    define: { 'import.meta.env': '{}' },
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('new types POST a valid GUID placeholder; saved types PUT their ID and refresh the catalog', async (t) => {
    const saved = { id: '12345678-1234-4234-8234-123456789abc', name: 'Camiseta', scope: 'shop', active: true };
    const writes: { url: string; method: string; body: any }[] = [];
    let token: string | null = null;
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.AuthService, useValue: { accessToken: () => token } },
    ]);
    const service = runtime.runInInjectionContext(injector, () => new runtime.AdminCatalogService());
    t.after(() => injector.destroy());
    token = 'test-token';
    t.mock.method(globalThis, 'fetch', async (url: string, options: any) => {
        if (options.method) {
            writes.push({ url, method: options.method, body: JSON.parse(options.body) });
            return Response.json(saved);
        }
        return Response.json(url.endsWith('/types') ? [saved] :
            url.endsWith('/settings') ? { whatsappNumber: '' } : []);
    });
    await service.saveType({ id: 'item-new-draft', name: ' Camiseta ', scope: 'shop', active: true, usage: 5 });
    assert.deepEqual(writes[0], {
        url: 'https://api.cricastudio.com/api/admin/catalog/types', method: 'POST',
        body: { id: '00000000-0000-0000-0000-000000000000', name: 'Camiseta', scope: 'shop', active: true },
    });
    assert.deepEqual(service.types, [saved]);
    await service.saveType({ ...saved, active: false });
    assert.deepEqual(writes[1], {
        url: `https://api.cricastudio.com/api/admin/catalog/types/${saved.id}`, method: 'PUT',
        body: { ...saved, active: false },
    });
});
