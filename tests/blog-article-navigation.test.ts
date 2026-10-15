import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const bundle = await build({
    stdin: { contents: `import '@angular/compiler';
        export { resolveBlogArticle } from './src/app/blog/blog-article-resolver';
        export { BlogPublicComponent } from './src/app/blog/blog-public';
        export { BlogApi } from './src/app/blog/blog-api';
        export { createEnvironmentInjector, runInInjectionContext, signal } from '@angular/core';`, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'node',
    define: { 'import.meta.env': '{"DEV":true}' },
    plugins: [{ name: 'templates', setup(build) {
        build.onResolve({ filter: /\.html\?raw$/ }, args => ({ path: resolve(args.resolveDir, args.path) }));
        build.onLoad({ filter: /\.html\?raw$/ }, async args => ({ contents: await readFile(args.path.replace('?raw', ''), 'utf8'), loader: 'text' }));
        build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'text' }));
    } }],
});
const r = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const post = { id: 'one', author: 'Crica', versions: { pt: { slug: 'historia', title: 'Historia', summary: '', html: '<p>Texto</p>' } } };
function resolveArticle(article: (...args: any[]) => any, preview = false) {
    const injector = r.createEnvironmentInjector([{ provide: r.BlogApi, useValue: { article } }]);
    const route = { paramMap: new Map([['locale', 'pt'], ['slug', 'historia']]), queryParamMap: new Map(preview ? [['preview', '1']] : []) };
    const result = r.runInInjectionContext(injector, () => r.resolveBlogArticle(route));
    injector.destroy();
    return result;
}
test('article navigation waits for complete content before activating the destination', async () => {
    let finish: (post: any) => void = () => {};
    let ready = false;
    const pending = resolveArticle((locale, slug) => {
        assert.equal(locale, 'pt'); assert.equal(slug, 'historia');
        return new Promise(resolve => { finish = resolve; });
    }).then((value: any) => { ready = true; return value; });
    await Promise.resolve();
    assert.equal(ready, false);
    finish(post);
    assert.equal((await pending).post, post);
});
test('editorial previews bypass public fetching; request failures reach the unavailable screen', async () => {
    assert.deepEqual(resolveArticle(() => { throw new Error('must not fetch'); }, true), {});
    assert.deepEqual(await resolveArticle(async () => { throw new Error('offline'); }), { error: 'offline' });
});
function component(list: () => Promise<any>) {
    const c = Object.create(r.BlogPublicComponent.prototype);
    Object.assign(c, {
        requestId: 0, loading: r.signal(true), currentPost: r.signal(undefined),
        resolvedArticle: r.signal({ post }), slug: r.signal('historia'), locale: r.signal('pt'),
        previewMode: r.signal(false), notice: r.signal(''),
        api: { list, categories() { throw new Error('Article must not wait for categories'); } },
        seo: { setBlog() {} }, store: { posts: r.signal([]) },
        subscriptions: { unsubscribe() {} },
    });
    return c;
}
test('article renders immediately and remains visible if optional suggestions fail', async () => {
    let fail: (error: Error) => void = () => {};
    const c = component(() => new Promise((_, reject) => { fail = reject; }));
    const pending = c.load();
    assert.equal(c.currentPost(), post);
    assert.equal(c.loading(), false);
    fail(new Error('offline'));
    await pending;
    assert.equal(c.currentPost(), post);
    assert.equal(c.notice(), '');
});
test('leaving an article prevents its pending suggestions from replacing shared listing data', async () => {
    let finish: (data: any) => void = () => {};
    const c = component(() => new Promise(resolve => { finish = resolve; }));
    const pending = c.load();
    c.ngOnDestroy();
    finish({ items: [post] });
    await pending;
    assert.deepEqual(c.store.posts(), []);
});
