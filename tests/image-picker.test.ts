import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Bundle the real component with Angular's JIT compiler for a DOM-free queue test.
const bundle = await build({
    stdin: {
        contents: `import '@angular/compiler'; export {ImagePickerComponent} from './src/app/admin/image-picker'; export {AdminCatalogService} from './src/app/services/admin-catalog.service'; export {createEnvironmentInjector,runInInjectionContext,NgZone} from '@angular/core';`,
        resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    define: { 'import.meta.env': '{}' },
    plugins: [
        {
            name: 'raw-template',
            setup(build) {
                build.onLoad({ filter: /\.html\?raw$/ }, async (args) => ({
                    contents: await (
                        await import('node:fs/promises')
                    ).readFile(args.path.replace('?raw', ''), 'utf8'),
                    loader: 'text',
                }));
                build.onResolve({ filter: /\.html\?raw$/ }, (args) => ({
                    path: awaitPath(args.resolveDir, args.path),
                }));
            },
        },
    ],
});
function awaitPath(dir: string, path: string) {
    return dir + '/' + path;
}
const testDir = await mkdtemp(join(tmpdir(), 'crica-photo-test-'));
const moduleFile = join(testDir, 'component.mjs');
await writeFile(moduleFile, bundle.outputFiles[0].text);
let runtime;
try {
    runtime = await import(pathToFileURL(moduleFile).href);
} finally {
    await rm(moduleFile);
    await rmdir(testDir);
}
function picker(uploadImage: (blob: Blob) => Promise<string>) {
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.AdminCatalogService, useValue: { uploadImage } },
        { provide: runtime.NgZone, useValue: { run: (fn: () => unknown) => fn() } },
    ]);
    const component = runtime.runInInjectionContext(
        injector,
        () => new runtime.ImagePickerComponent(),
    );
    component.prepare = async (file: File) => file;
    return component;
}
function completed(component: any) {
    return new Promise<void>((resolve) => {
        const sub = component.uploading.subscribe((busy: boolean) => {
            if (!busy) {
                sub.unsubscribe();
                resolve();
            }
        });
    });
}
const file = (name: string) => new File(['photo'], name, { type: 'image/png' });

test('multi-upload preserves all photos and order; cover and removal update the emitted list', async () => {
    const component = picker(async (blob) => 'https://example.com/' + (blob as File).name);
    const done = completed(component);
    component.enqueue([file('a.png'), file('b.png'), file('c.png')]);
    await done;
    assert.deepEqual(component.images, [
        'https://example.com/a.png',
        'https://example.com/b.png',
        'https://example.com/c.png',
    ]);
    let emitted: string[] = [];
    component.changed.subscribe((images: string[]) => (emitted = images));
    component.move(2, 0);
    assert.equal(emitted[0], 'https://example.com/c.png');
    component.remove(1);
    assert.equal(emitted.length, 2);
    component.ngOnDestroy();
});
test('failed upload does not lose successful photos and can be retried', async () => {
    let fail = true;
    const component = picker(async (blob) => {
        if ((blob as File).name === 'b.png' && fail) throw new Error('Falha de rede');
        return 'https://example.com/' + (blob as File).name;
    });
    let done = completed(component);
    component.enqueue([file('a.png'), file('b.png'), file('c.png')]);
    await done;
    assert.equal(component.images.length, 2);
    assert.equal(component.uploads[0].state, 'error');
    assert.equal(component.busy, false);
    fail = false;
    done = completed(component);
    component.retry(component.uploads[0]);
    await done;
    assert.equal(component.images.length, 3);
    assert.equal(component.uploads.length, 0);
    component.ngOnDestroy();
});
test('capacity and invalid files are enforced before upload', async () => {
    let calls = 0;
    const component = picker(async () => {
        calls++;
        return 'https://example.com/photo.png';
    });
    component.images = ['1', '2', '3', '4'];
    const done = completed(component);
    component.enqueue([
        new File(['x'], 'invalid.txt', { type: 'text/plain' }),
        file('a.png'),
        file('b.png'),
    ]);
    await done;
    assert.equal(calls, 1);
    assert.equal(component.images.length, 5);
    assert.match(component.error, /invalid.txt/);
    assert.match(component.error, /b.png/);
    component.ngOnDestroy();
});
