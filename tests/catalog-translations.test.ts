import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
    stdin: {
        contents:
            "import '@angular/compiler'; export * from './src/app/services/catalog-translations'; export * from './src/app/services/language';",
        resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    define: { 'import.meta.env': '{}' },
});
const runtime = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

test('reviewed content switches reactively and falls back per field without changing original names or IDs', () => {
    const item = {
        id: 'stable',
        name: 'Mug',
        description: 'Original',
        original: { name: 'Caneca' },
        translations: {
            en: {
                status: 'reviewed',
                fields: { name: 'Mug', description: '  ', characteristics: ['Ceramic'] },
            },
            es: { status: 'draft', fields: { name: 'Taza' } },
        },
    };
    assert.equal(runtime.contentField(item, 'name', 'pt'), 'Caneca');
    assert.equal(runtime.contentField(item, 'name', 'en'), 'Mug');
    assert.equal(runtime.contentField(item, 'description', 'en'), 'Original');
    assert.equal(runtime.contentField(item, 'name', 'es'), 'Caneca');
    assert.deepEqual(runtime.contentField(item, 'characteristics', 'en'), ['Ceramic']);
    const product = { category: 'Caneca', categoryType: item };
    assert.equal(runtime.contentField(product, 'category', 'en'), 'Mug');
    assert.equal(item.id, 'stable');
    assert.equal(item.original.name, 'Caneca');
});

test('future languages load from registry without database interface overrides and disappear when deactivated', async (t) => {
    const oldFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = oldFetch;
        runtime.setLanguage('pt', false);
    });
    const languages = [
        { code: 'pt', active: true },
        { code: 'en', active: true },
        { code: 'es', active: true },
        {
            code: 'fr',
            nativeName: 'Français',
            active: true,
            flagCode: 'FR',
            interfaceTexts: { Fornecedores: 'Fournisseurs' },
        },
    ];
    globalThis.fetch = async () => new Response(JSON.stringify(languages));
    await runtime.refreshLanguages();
    runtime.setLanguage('fr', false);
    assert.equal(runtime.language(), 'fr');
    assert.equal(runtime.translate('Fornecedores'), 'Fornecedores');
    assert.equal(runtime.translate('Fornecedores', {}, 'en'), 'Suppliers');
    assert.equal(runtime.translate('Texto sem tradução'), 'Texto sem tradução');
    languages[3].active = false;
    await runtime.refreshLanguages();
    assert.equal(runtime.language(), 'pt');
    runtime.setLanguage('fr', false);
    assert.equal(runtime.language(), 'pt');
});
