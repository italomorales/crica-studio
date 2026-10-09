import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const bundle = await build({
    stdin: {
        contents: `import '@angular/compiler';
            export { ImageCarouselComponent } from './src/app/components/image-carousel';
            export { ElementRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';`,
        resolveDir: process.cwd(),
    },
    bundle: true, write: false, format: 'esm', platform: 'node',
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'raw-templates', setup(build) {
        build.onResolve({ filter: /\.html\?raw$/ }, args => ({ path: resolve(args.resolveDir, args.path) }));
        build.onLoad({ filter: /\.html\?raw$/ }, async args => ({
            contents: await readFile(args.path.replace('?raw', ''), 'utf8'), loader: 'text',
        }));
    } }],
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
function fixture(images = ['a', 'b', 'c']) {
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.ElementRef, useValue: { nativeElement: { clientWidth: 320 } } },
    ]);
    const carousel = runtime.runInInjectionContext(injector, () => new runtime.ImageCarouselComponent());
    carousel.images = images;
    carousel.ngOnChanges({ images: {} });
    const indices: number[] = [], events: string[] = [];
    carousel.indexChange.subscribe((index: number) => indices.push(index));
    carousel.gestureStart.subscribe(() => events.push('start'));
    carousel.gestureEnd.subscribe(() => events.push('end'));
    return { carousel, indices, events, dispose() { carousel.ngOnDestroy(); injector.destroy(); } };
}

test('drag follows the finger, selection changes only after settling and wrapping resets to an identical slide', () => {
    const f = fixture(), c = f.carousel;
    assert.deepEqual(c.slides(), ['c', 'a', 'b', 'c', 'a']);
    c.start(); c.move(-80);
    assert.equal(c.drag(), -80);
    assert.equal(c.animating(), false);
    c.next(); c.end();
    assert.equal(c.position(), 2);
    assert.equal(c.animating(), true);
    assert.deepEqual(f.indices, []);
    assert.deepEqual(f.events, ['start']);
    c.finish(); assert.deepEqual(f.indices, [1]);
    assert.deepEqual(f.events, ['start', 'end']);
    c.previous(); c.finish();
    c.previous(); assert.equal(c.position(), 0);
    c.finish(); assert.equal(c.position(), 3);
    assert.equal(c.slides()[0], c.slides()[c.position()]);
    c.next(); assert.equal(c.position(), 4);
    c.finish(); assert.equal(c.position(), 1);
    assert.equal(c.slides()[4], c.slides()[c.position()]);
    f.dispose();
});

test('short or cancelled drags return smoothly without changing selection; repeated input during settling is ignored', () => {
    const f = fixture(), c = f.carousel;
    c.start(); c.move(25); c.end();
    assert.equal(c.position(), 1);
    assert.equal(c.animating(), true);
    c.next(); assert.equal(c.position(), 1);
    c.finish(); assert.deepEqual(f.indices, []);
    assert.deepEqual(f.events, ['start', 'end']);
    f.dispose();
});

test('desktop selection animates without re-emitting the input and a fallback completes if no transition event arrives', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const f = fixture(), c = f.carousel;
    c.index = 1; c.ngOnChanges({ index: {} });
    assert.equal(c.animating(), true);
    t.mock.timers.tick(360);
    assert.equal(c.animating(), false);
    assert.equal(c.position(), 2);
    assert.deepEqual(f.indices, []);
    c.start(); c.move(-60); c.next(); c.end();
    t.mock.timers.tick(360);
    assert.deepEqual(f.indices, [2]);
    f.dispose();
});

test('single images stay fixed and replacing a gallery cancels stale animation and releases autoplay', () => {
    const f = fixture(), c = f.carousel;
    c.start(); c.next(); c.end();
    c.images = ['only']; c.index = 0; c.ngOnChanges({ images: {} });
    c.finish(); assert.deepEqual(f.indices, []);
    assert.deepEqual(f.events, ['start', 'end']);
    c.next(); c.previous(); assert.equal(c.position(), 0);
    assert.equal(c.animating(), false);
    f.dispose();
});

test('an empty gallery keeps one placeholder slide and never navigates', () => {
    const f = fixture([]);
    assert.deepEqual(f.carousel.slides(), [undefined]);
    f.carousel.next(); f.carousel.previous();
    assert.equal(f.carousel.position(), 0);
    assert.deepEqual(f.indices, []);
    f.dispose();
});
