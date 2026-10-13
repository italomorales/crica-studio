import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
    blogPath,
    canPublish,
    mergeBlogVersion,
    searchBlog,
    seedBlog,
    versionComplete,
} from '../src/app/blog/blog-data.ts';

test('mock catalogue supports volume, localized URLs, short/long/product stories and only published versions in public searches', () => {
    const posts = seedBlog();
    assert.equal(posts.length, 24);
    assert.ok(searchBlog(posts, 'pt', '', '').length > 12);
    assert.ok(posts[1].versions.pt.html.length > posts[0].versions.pt.html.length * 5);
    assert.equal((posts[2].versions.pt.html.match(/data-blog-product=/g) || []).length, 4);
    assert.notEqual(blogPath(posts[0], 'pt'), blogPath(posts[0], 'en'));
    assert.equal(searchBlog(posts, 'pt', 'FOTOS', '').length, 2);
    assert.ok(
        searchBlog(posts, 'es', '', '').every(
            (post) => post.versions.es.status === 'published' && versionComplete(post.versions.es),
        ),
    );
    assert.ok(
        searchBlog(posts, 'pt', '', 'Presentes').every((post) => post.category === 'Presentes'),
    );
});

test('saving or publishing one language never publishes unsaved edits to another language', () => {
    const original = seedBlog()[0],
        edited = structuredClone(original);
    edited.versions.pt.title = 'Português editado';
    edited.versions.en.title = 'English unsaved';
    edited.versions.en.status = 'draft';
    const saved = mergeBlogVersion(original, edited, 'pt');
    assert.equal(saved.versions.pt.title, 'Português editado');
    assert.deepEqual(saved.versions.en, original.versions.en);
    assert.deepEqual(original, seedBlog()[0]);
    const newPost = mergeBlogVersion(undefined, edited, 'en');
    assert.equal(newPost.versions.pt.title, '');
    assert.equal(newPost.versions.pt.status, 'draft');
    assert.equal(newPost.versions.en.title, 'English unsaved');
});

test('pending translations and invalid slugs cannot be published', () => {
    const version = seedBlog()[0].versions.pt;
    assert.ok(canPublish(version));
    assert.equal(canPublish({ ...version, slug: 'url com espaço' }), false);
    assert.equal(canPublish({ ...version, summary: '' }), false);
    assert.equal(canPublish({ ...version, html: '<p></p>' }), false);
    assert.equal(versionComplete(seedBlog().at(-1)!.versions.es), false);
});

test('local and direct blog prototypes do not load tracking, while existing production pages retain it', () => {
    const script = readFileSync('index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)![1];
    for (const [hostname, pathname, expected] of [
        ['localhost', '/blog', 0],
        ['127.0.0.1', '/admin/blog', 0],
        ['192.168.0.1', '/loja', 0],
        ['www.cricastudio.com.br', '/blog/pt/teste', 0],
        ['www.cricastudio.com.br', '/admin/blog/editar/novo', 0],
        ['www.cricastudio.com.br', '/loja', 1],
        ['www.cricastudio.com', '/fornecedores', 1],
    ] as const) {
        const scripts: any[] = [],
            window: any = {};
        runInNewContext(script, {
            window,
            location: { hostname, pathname },
            document: {
                createElement: () => ({}),
                head: { appendChild: (element: any) => scripts.push(element) },
            },
        });
        assert.equal(scripts.length, expected, hostname + pathname);
        if (expected) assert.equal(window.dataLayer.length, 3);
        else assert.equal(window.gtag, undefined);
    }
});
