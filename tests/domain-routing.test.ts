import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const functionCode = await readFile('infra/cloudfront/crica-primary-domain-redirect.js', 'utf8');
const handler = runInNewContext(functionCode + '\nhandler;');
function request(host: string, country: string | undefined, uri = '/vitrine', querystring: any = {}) {
    return { request: { uri, querystring, headers: { host: { value: host }, ...(country ? { 'cloudfront-viewer-country': { value: country } } : {}) } } };
}
test('CloudFront sends Brazil from .com to .com.br preserving paths and repeated query parameters without geo caching', () => {
    for (const host of ['cricastudio.com', 'www.cricastudio.com']) {
        const response = handler(request(host, 'BR', '/vitrine', { ref: { value: 'a%20b' }, type: { multiValue: [{ value: '1' }, { value: '2' }] } }));
        assert.equal(response.statusCode, 302);
        assert.equal(response.headers.location.value, 'https://www.cricastudio.com.br/vitrine?ref=a%20b&type=1&type=2');
        assert.equal(response.headers['cache-control'].value, 'private, no-store');
    }
});
test('foreign .com visitors stay international and shop URLs lead to suppliers; .com.br always stays Brazilian', () => {
    for (const country of ['US', 'ES', 'AR', undefined]) {
        assert.equal(handler(request('www.cricastudio.com', country)).uri, '/vitrine');
        for (const path of ['/', '/index.html', '/loja', '/loja/caneca'])
            assert.equal(handler(request('www.cricastudio.com', country, path)).headers.location.value, 'https://www.cricastudio.com/fornecedores');
        assert.equal(handler(request('www.cricastudio.com.br', country, '/loja')).uri, '/loja');
        assert.equal(handler(request('cricastudio.com.br', country, '/loja')).headers.location.value, 'https://www.cricastudio.com.br/loja');
    }
    assert.equal(handler(request('www.cricastudio.com', 'US', '/assets/font.woff2')).uri, '/assets/font.woff2');
});

const bundle = await build({stdin: { contents: "export * from './src/app/services/site-market';", resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', define: { 'import.meta.env': '{}' }});
const market = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
test('public market follows exact domain names and defaults to Brazil for local development', () => {
    assert.equal(market.marketForHostname('cricastudio.com'), 'international');
    assert.equal(market.marketForHostname('WWW.CRICASTUDIO.COM'), 'international');
    for (const host of ['cricastudio.com.br', 'www.cricastudio.com.br', 'localhost', 'cricastudio.com.evil.example'])
        assert.equal(market.marketForHostname(host), 'br');
});
