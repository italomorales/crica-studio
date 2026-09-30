import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const bundle = await build({
    stdin: {
        contents: `import '@angular/compiler';
            export { ProductDetailComponent } from './src/app/product-detail';
            export { PublicCatalogService } from './src/app/services/public-catalog.service';
            export { SeoService } from './src/app/services/seo.service';
            export { ActivatedRoute } from '@angular/router';
            export { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
            export { Subject } from 'rxjs';`,
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
const product = { id: '1', slug: 'caneca', name: 'Caneca', images: ['a', 'b'] };
function fixture(cached: any, fetchProduct: (slug: string) => Promise<any>) {
    const route = new runtime.Subject();
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.PublicCatalogService, useValue: { cachedProduct: () => cached, getProduct: fetchProduct } },
        { provide: runtime.ActivatedRoute, useValue: { paramMap: route } },
        { provide: runtime.SeoService, useValue: { setProduct() {} } },
    ]);
    const component = runtime.runInInjectionContext(injector, () => new runtime.ProductDetailComponent());
    return { component, dispose() { component.ngOnDestroy(); injector.destroy(); } };
}
test('shows cached product immediately and preserves edits during refresh', async () => {
    let finish: (value: any) => void = () => {};
    const f = fixture(product, () => new Promise((resolve) => { finish = resolve; }));
    const pending = f.component.load('caneca');
    assert.equal(f.component.product, product);
    assert.equal(f.component.loading, false);
    f.component.idea = 'Minha arte';
    f.component.imageIndex = 1;
    finish({ ...product, name: 'Nome atualizado' });
    await pending;
    assert.equal(f.component.product.name, 'Nome atualizado');
    assert.equal(f.component.idea, 'Minha arte');
    assert.equal(f.component.imageIndex, 1);
    f.dispose();
});
test('direct navigation delays skeleton and ignores stale responses', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const pending: Record<string, (value: any) => void> = {};
    const f = fixture(undefined, (slug) => new Promise((resolve) => { pending[slug] = resolve; }));
    const first = f.component.load('first');
    t.mock.timers.tick(199);
    assert.equal(f.component.showSkeleton, false);
    t.mock.timers.tick(1);
    assert.equal(f.component.showSkeleton, true);
    const second = f.component.load('second');
    pending.second({ ...product, slug: 'second' });
    await second;
    pending.first(product);
    await first;
    assert.equal(f.component.product.slug, 'second');
    assert.equal(f.component.showSkeleton, false);
    assert.equal(f.component.loading, false);
    f.dispose();
});
test('network errors preserve cached content, while confirmed removal clears it', async () => {
    const f = fixture(product, async () => { throw new Error('offline'); });
    await f.component.load('caneca');
    assert.equal(f.component.product, product);
    assert.equal(f.component.loadError, false);
    f.dispose();
    const removed = fixture(product, async () => undefined);
    await removed.component.load('caneca');
    assert.equal(removed.component.product, undefined);
    assert.equal(removed.component.unavailable, true);
    removed.dispose();
});
