import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
    stdin: {
        contents: `import '@angular/compiler';
            export { FeaturedSwipeDirective } from './src/app/components/featured-swipe';
            export { ElementRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';`,
        resolveDir: process.cwd(),
    },
    bundle: true, write: false, format: 'esm', platform: 'node',
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

function fixture() {
    const listeners = new Map();
    const element = {
        addEventListener(name: string, listener: any, capture: boolean) {
            assert.equal(capture, true);
            listeners.set(name, listener);
        },
        removeEventListener(name: string, listener: any, capture: boolean) {
            assert.equal(capture, true);
            assert.equal(listeners.get(name), listener);
            listeners.delete(name);
        },
    };
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.ElementRef, useValue: { nativeElement: element } },
    ]);
    const directive = runtime.runInInjectionContext(injector, () => new runtime.FeaturedSwipeDirective());
    directive.ngOnInit();
    const events: string[] = [];
    for (const [output, name] of [['swipeNext', 'next'], ['swipePrevious', 'previous'], ['gestureStart', 'start'], ['gestureEnd', 'end']]) {
        directive[output].subscribe(() => events.push(name));
    }
    function start(control = false, touches = 1) {
        directive.onTouchStart({
            touches: Array.from({ length: touches }, (_, identifier) => ({ identifier, clientX: 150, clientY: 150 })),
            target: { closest: () => control },
        });
    }
    function end(dx: number, dy = 0) {
        let prevented = false;
        directive.onTouchEnd({
            changedTouches: [{ identifier: 0, clientX: 150 + dx, clientY: 150 + dy }],
            cancelable: true, preventDefault() { prevented = true; },
        });
        return prevented;
    }
    return { directive, events, listeners, start, end, dispose() { directive.ngOnDestroy(); injector.destroy(); assert.equal(listeners.size, 0); } };
}

test('horizontal swipes navigate once in either direction and bracket the autoplay pause', () => {
    const f = fixture();
    f.start(); assert.equal(f.end(-80), true);
    f.start(); assert.equal(f.end(80), true);
    f.end(80);
    assert.deepEqual(f.events, ['start', 'next', 'end', 'start', 'previous', 'end']);
    f.dispose();
});

test('taps, vertical/diagonal scrolling, controls, cancelled and multi-touch gestures do not navigate', () => {
    const f = fixture();
    for (const [dx, dy] of [[0, 0], [30, 0], [10, 80], [80, 80]]) {
        f.start(); assert.equal(f.end(dx, dy), false);
    }
    f.start(true); f.end(-80);
    f.start(); f.directive.cancel(); f.end(-80);
    f.start(); f.start(false, 2); f.end(-80);
    assert.equal(f.events.filter(event => event === 'next' || event === 'previous').length, 0);
    assert.equal(f.events.filter(event => event === 'start').length, f.events.filter(event => event === 'end').length);
    f.dispose();
});

test('capture suppresses the click after a swipe before product/link handlers, while fresh taps and keyboard clicks work', () => {
    const f = fixture();
    f.start(); f.end(-80);
    let prevented = false, stopped = false;
    const click = (detail: number) => f.listeners.get('click')({
        detail, preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; },
    });
    click(1); assert.ok(prevented && stopped);
    prevented = stopped = false;
    click(0); assert.ok(!prevented && !stopped);
    f.start(); f.end(0);
    click(1); assert.ok(!prevented && !stopped);
    f.dispose();
});
