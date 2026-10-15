import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';
const source = readFileSync(
    new URL('../infra/cloudfront/crica-blog-ready-viewer-request.js', import.meta.url),
    'utf8',
);
const handler = runInNewContext(source + ';handler');
test('social callbacks stay on their viewer domain and cannot spoof the forwarded host',()=>{
    const request={uri:'/api/blog/auth/callback/google',headers:{host:{value:'www.cricastudio.com'},'cloudfront-viewer-country':{value:'BR'},'x-crica-viewer-host':{value:'evil.example'}},querystring:{}};
    const response=handler({request});
    assert.equal(response.uri,request.uri);
    assert.equal(response.headers['x-crica-viewer-host'].value,'www.cricastudio.com');
});
test('News origin receives the domain/browser locale and preserves explicit footer links', () => {
    for (const [host, browser, expected] of [
        ['www.cricastudio.com.br', 'es-MX,en;q=0.8', 'pt'],
        ['www.cricastudio.com', 'es-MX,en;q=0.8', 'es'],
        ['www.cricastudio.com', 'pt-BR,en;q=0.8', 'en'],
        ['www.cricastudio.com', 'fr-FR', 'en'],
        ['www.cricastudio.com', 'es;q=0,en;q=1', 'en'],
        ['www.cricastudio.com', '', 'en'],
    ]) {
        const request = {uri:'/blog', headers:{host:{value:host}, 'accept-language':{value:browser}, 'cloudfront-viewer-country':{value:'BR'}}, querystring:{} as any};
        const result = handler({request});
        assert.equal(result.uri, '/blog');
        assert.equal(result.querystring.idioma.value, expected);
        request.querystring.idioma={value:'es'};
        assert.equal(handler({request}).querystring.idioma.value, 'es');
    }
});
test('blog HTML and sitemap keep their origin paths while S3 SPA routes get an explicit rewrite', () => {
    const request = (uri: string) => ({
        uri,
        headers: { host: { value: 'www.cricastudio.com.br' } },
        querystring: { q: { value: 'presente' } },
    });
    for (const path of [
        '/blog',
        '/blog/pt/minha-historia',
        '/blog-sitemap.xml',
        '/api/blog/posts',
        '/assets/blog.css',
    ])
        assert.equal(handler({ request: request(path) }).uri, path);
    for (const [path, expected] of [['/admin/blog/editar/123','/admin/index.html'], ['/loja/caneca','/loja/index.html'], ['/loja','/loja/index.html'], ['/fornecedores','/fornecedores/index.html'], ['/vitrine','/vitrine/index.html'], ['/login','/login/index.html']])
        assert.equal(handler({ request: request(path) }).uri, expected);
    const unknown = handler({ request: request('/missing') });
    assert.equal(unknown.statusCode, 404);
    assert.equal(unknown.headers['x-robots-tag'].value, 'noindex');
});
test('prepared distribution routes blog to HTTPS API and keeps real 404 without losing existing origins', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crica-blog-cdn-'));
    try {
        const input = join(dir, 'input.json'),
            output = join(dir, 'output.json');
        writeFileSync(
            input,
            JSON.stringify({
                Origins: { Quantity: 1, Items: [{ Id: 's3', DomainName: 'bucket.example.test' }] },
                DefaultCacheBehavior: { TargetOriginId: 's3' },
                CacheBehaviors: { Quantity: 0 },
                CustomErrorResponses: {
                    Quantity: 2,
                    Items: [
                        { ErrorCode: 404, ResponseCode: '200' },
                        { ErrorCode: 500, ResponseCode: '500' },
                    ],
                },
            }),
        );
        execFileSync(process.execPath, [
            'infra/cloudfront/prepare-blog-config.mjs',
            input,
            output,
            'api.example.test',
            'cache-disabled',
            'query-policy',
            'function-arn',
        ]);
        const config = JSON.parse(readFileSync(output, 'utf8'));
        assert.equal(config.Origins.Quantity, 2);
        assert.equal(config.DefaultCacheBehavior.TargetOriginId, 's3');
        assert.deepEqual(
            config.CacheBehaviors.Items.map((b: any) => b.PathPattern),
            ['/blog', '/blog/*', '/blog-sitemap.xml', '/api/blog/*'],
        );
        assert.equal(config.CacheBehaviors.Items[0].CachePolicyId, 'cache-disabled');
        assert.equal(config.CacheBehaviors.Items[3].AllowedMethods.Quantity,7);
        assert.deepEqual(config.CustomErrorResponses.Items, [
            { ErrorCode: 500, ResponseCode: '500' },
        ]);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
