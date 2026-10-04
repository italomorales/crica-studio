import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const bundle = await build({ stdin: { contents: `import '@angular/compiler';
    export { PublicCatalogService } from './src/app/services/public-catalog.service';
    export { PlatformService } from './src/app/services/platform.service';
    export { AuthService } from './src/app/services/auth.service';
    export { HeaderComponent, FooterComponent } from './src/app/components/shared';
    export { createEnvironmentInjector, runInInjectionContext } from '@angular/core';`, resolveDir: process.cwd() },
    bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'raw', setup(builder) {
        builder.onResolve({ filter: /\.html\?raw$/ }, args => ({ path: resolve(args.resolveDir, args.path) }));
        builder.onLoad({ filter: /\.html\?raw$/ }, async args => ({ contents: await readFile(args.path.replace('?raw', ''), 'utf8'), loader: 'text' }));
    } }],
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
test('domains scope supplier pages, featured products and platform filters consistently and change the public menu', async t => {
    const previousWindow = (globalThis as any).window;
    t.after(() => { (globalThis as any).window = previousWindow; });
    const requests: URL[] = [];
    t.mock.method(globalThis, 'fetch', async (value: any) => {
        const url = new URL(String(value)); requests.push(url);
        return new Response(JSON.stringify(url.pathname.endsWith('/types') || url.pathname.endsWith('/platforms') ? [] : { items: [], total: 0, page: 1, pageSize: 12 }));
    });
    const injector = runtime.createEnvironmentInjector([{ provide: runtime.AuthService, useValue: {} }]);
    t.after(() => injector.destroy());
    for (const [hostname, market] of [['www.cricastudio.com.br', 'br'], ['www.cricastudio.com', 'international']]) {
        (globalThis as any).window = { innerWidth: 1200, matchMedia: () => ({ matches: false }), location: { hostname, search: '' } };
        requests.length = 0;
        const catalog = new runtime.PublicCatalogService();
        await catalog.loadAffiliates({ query: '', platform: 'Amazon' });
        await catalog.loadAffiliates({ query: '', platform: 'Amazon' }, true);
        await catalog.loadFeaturedAffiliates();
        const platforms = runtime.runInInjectionContext(injector, () => new runtime.PlatformService());
        await platforms.publicPlatforms(); await platforms.publicPlatforms('pt-BR', 'BR', true);
        const scoped = requests.filter(url => /\/(affiliates|platforms)$/.test(url.pathname));
        assert.equal(scoped.length, 5);
        assert.ok(scoped.every(url => url.searchParams.get('market') === market));
        const header = new runtime.HeaderComponent();
        assert.equal(header.showShop, market === 'br');
        assert.equal(header.homePath, market === 'br' ? '/loja' : '/fornecedores');
        assert.equal(new runtime.FooterComponent().homePath, header.homePath);
    }
});
