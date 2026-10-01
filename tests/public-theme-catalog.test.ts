import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
    stdin: { contents: `import '@angular/compiler'; export { PublicCatalogService } from './src/app/services/public-catalog.service';`, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'node', define: { 'import.meta.env': '{}' },
});
const { PublicCatalogService } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('public service preserves combined themes, type and search on subsequent pages and reloads available themes', async t => {
    const requests: URL[] = [];
    const types = [{ id: 'type-1', name: 'Canecas', scope: 'shop', active: true }];
    const theme = { id: 'theme-1', name: 'Natal', active: true, productCount: 2 };
    let themes = [theme];
    t.mock.method(globalThis, 'fetch', async (value: string) => {
        const url = new URL(value); requests.push(url);
        if (url.pathname.endsWith('/types')) return Response.json(types);
        if (url.pathname.endsWith('/themes')) return Response.json(themes);
        if (url.pathname.endsWith('/settings')) return Response.json({ whatsappNumber: '' });
        const page = Number(url.searchParams.get('page'));
        return Response.json({ items: [{ id: `product-${page}`, typeId: 'type-1', themeIds: ['theme-1'] }], total: 2, page, pageSize: 1 });
    });
    const service = new PublicCatalogService();
    const filters = { query: 'Canéca', typeId: 'type-1', themeIds: ['theme-1', 'theme-2'] };
    await service.loadShop(filters);
    await service.loadShop(filters, true);
    const pages = requests.filter(url => url.pathname.endsWith('/products'));
    assert.equal(pages[1].searchParams.get('page'), '2');
    for (const url of pages) {
        assert.equal(url.searchParams.get('themes'), 'theme-1,theme-2');
        assert.equal(url.searchParams.get('typeId'), 'type-1');
        assert.equal(url.searchParams.get('query'), 'caneca');
    }
    assert.equal(service.products().length, 2);
    assert.equal(service.products()[0].category, 'Canecas');
    assert.deepEqual(service.themes(), [theme]);
    themes = [];
    await service.loadShop({ query: '' });
    assert.deepEqual(service.themes(), []);
    assert.equal(service.products().length, 1);
    assert.equal(requests.filter(url => url.pathname.endsWith('/products')).at(-1)?.searchParams.has('themes'), false);
});

test('a stale filter response cannot overwrite the most recent results', async t => {
    let finishFirst!: (response: Response) => void;
    t.mock.method(globalThis, 'fetch', async (value: string) => {
        const url = new URL(value);
        if (url.pathname.endsWith('/types') || url.pathname.endsWith('/themes')) return Response.json([]);
        if (url.pathname.endsWith('/settings')) return Response.json({ whatsappNumber: '' });
        if (url.searchParams.get('themes') === 'old') return new Promise<Response>(resolve => finishFirst = resolve);
        return Response.json({ items: [{ id: 'new' }], total: 1, page: 1, pageSize: 12 });
    });
    const service = new PublicCatalogService();
    const old = service.loadShop({ query: '', themeIds: ['old'] });
    while (!finishFirst) await new Promise(resolve => setImmediate(resolve));
    await service.loadShop({ query: '', themeIds: ['new'] });
    finishFirst(Response.json({ items: [{ id: 'old' }], total: 1, page: 1, pageSize: 12 }));
    await old;
    assert.equal(service.products()[0].id, 'new');
});
