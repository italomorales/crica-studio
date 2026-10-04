import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { initialLanguage } from '../src/app/services/language-policy.ts';
import { TRANSLATIONS } from '../src/app/services/translations.ts';

test('country determines the first international language; saved selection wins in either domain', () => {
    assert.equal(initialLanguage('www.cricastudio.com.br', null, 'US', 'en-US'), 'pt');
    assert.equal(initialLanguage('www.cricastudio.com', null, 'US', 'es-ES'), 'en');
    for (const country of ['ES', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'PR'])
        assert.equal(initialLanguage('www.cricastudio.com', null, country, 'en-US'), 'es');
    assert.equal(initialLanguage('www.cricastudio.com', null, undefined, 'es-MX'), 'es');
    assert.equal(initialLanguage('www.cricastudio.com', 'invalid', 'JP'), 'en');
    for (const domain of ['www.cricastudio.com.br', 'www.cricastudio.com'])
        for (const saved of ['pt', 'en', 'es'])
            assert.equal(initialLanguage(domain, saved, 'US'), saved);
});

test('each interface translation preserves interpolation parameters in English and Spanish', () => {
    const parameters = (text: string) =>
        [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const [key, value] of Object.entries(TRANSLATIONS)) {
        for (const locale of ['en', 'es'] as const) {
            assert.ok(value[locale].trim(), `${key}: ${locale}`);
            assert.deepEqual(parameters(value[locale]), parameters(key), `${key}: ${locale}`);
        }
    }
});

const bundled = await build({
    stdin: {
        contents: `import '@angular/compiler'; export * from './src/app/services/language'; export {currentSiteMarket} from './src/app/services/site-market';`,
        resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    define: { 'import.meta.env': '{}' },
});
const runtime = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
test('manual selection persists, updates accessibility language and never changes the catalog market', async (t) => {
    const oldWindow = (globalThis as any).window,
        oldDocument = (globalThis as any).document;
    const saved = new Map();
    (globalThis as any).document = { documentElement: { lang: '' } };
    t.after(() => {
        (globalThis as any).window = oldWindow;
        (globalThis as any).document = oldDocument;
        runtime.setLanguage('pt', false);
    });
    for (const [hostname, market] of [
        ['www.cricastudio.com.br', 'br'],
        ['www.cricastudio.com', 'international'],
    ]) {
        (globalThis as any).window = {
            location: { hostname },
            localStorage: {
                getItem: (key: string) => saved.get(key),
                setItem: (key: string, value: string) => saved.set(key, value),
            },
        };
        for (const language of ['en', 'es', 'pt']) {
            runtime.setLanguage(language);
            assert.equal(saved.get('crica.language'), language);
            assert.equal(runtime.currentSiteMarket(), market);
            assert.equal(
                (globalThis as any).document.documentElement.lang,
                language === 'pt' ? 'pt-BR' : language,
            );
        }
    }
    runtime.setLanguage('invalid');
    assert.equal(runtime.language(), 'pt');
    Object.defineProperty((globalThis as any).window, 'localStorage', {
        get() {
            throw new Error('blocked');
        },
    });
    runtime.setLanguage('es');
    assert.equal(runtime.translate('Fornecedores'), 'Proveedores');
    assert.equal(runtime.translate('Carregar mais produtos'), 'Cargar más productos');
    assert.equal(
        runtime.translate('Exibindo {shown} de {total} modelos', { shown: 12, total: 30 }),
        'Mostrando 12 de 30 modelos',
    );
    assert.equal(runtime.translate('Nome original sem tradução'), 'Nome original sem tradução');
    assert.match(runtime.localizedOrderMessage('Caneca', 3, 'Azul'), /Cantidad: 3\. Mi idea: Azul/);
    assert.match(runtime.localizedPrice({ priceMode: 'fixed', price: 50 }), /(?:BRL|R\$)/);
});

test('CloudFront exposes only country without caching and preserves existing routing', async () => {
    const source = await readFile('infra/cloudfront/crica-primary-domain-redirect.js', 'utf8');
    const scope = vm.createContext({});
    vm.runInContext(source, scope);
    for (const country of ['US', 'ES', 'BR']) {
        const response = scope.handler({
            request: {
                uri: '/site-context.json',
                headers: {
                    host: { value: 'www.cricastudio.com' },
                    'cloudfront-viewer-country': { value: country },
                },
                querystring: {},
            },
        });
        assert.deepEqual(JSON.parse(response.body), { country });
        assert.equal(response.headers['cache-control'].value, 'private, no-store');
    }
});
