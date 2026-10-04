import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
    stdin: {
        contents: `import '@angular/compiler';
            export { AdminCatalogService } from './src/app/services/admin-catalog.service';
            export { AuthService } from './src/app/services/auth.service';
            export { createEnvironmentInjector, runInInjectionContext } from '@angular/core';`,
        resolveDir: process.cwd(),
    },
    bundle: true, write: false, format: 'esm', platform: 'node',
    define: { 'import.meta.env': '{}' },
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('catalog saves send translation states and fields alongside the unchanged original data', async t => {
    const injector=runtime.createEnvironmentInjector([{provide:runtime.AuthService,useValue:{accessToken:()=> 'test-token'}}]);
    const service=runtime.runInInjectionContext(injector,()=>new runtime.AdminCatalogService());t.after(()=>injector.destroy());
    const translations={en:{status:'reviewed',fields:{name:'Mug'}},es:{status:'draft',fields:{name:'Taza'}}};
    const writes:any[]=[];
    t.mock.method(globalThis,'fetch',async(url:string,options:any={})=>{
        if(options.method){writes.push(JSON.parse(options.body));return Response.json({id:'12345678-1234-4234-8234-123456789abc'});}
        return Response.json(url.endsWith('/settings')?{whatsappNumber:''}:[]);
    });
    const item={id:'12345678-1234-4234-8234-123456789abc',name:'Caneca',typeId:'22345678-1234-4234-8234-123456789abc',active:true,scope:'both',translations};
    await service.saveType(item);await service.saveTheme(item);
    await service.saveProduct({...item,description:'Original',images:[],characteristics:[],personalization:[],priceMode:'fixed',price:65,themeIds:[]});
    await service.saveAffiliate({...item,description:'Original',platform:'Shopee',images:[],international:false});
    assert.equal(writes.length,4);
    for(const body of writes)assert.equal(body.name,'Caneca');
    for(const index of [0,1,3])assert.deepEqual(writes[index].translations,translations);
    assert.equal('translations' in writes[2],false);
    assert.equal(writes[2].price,65);assert.equal(writes[3].platform,'Shopee');
});

test('affiliate international flag is sent and retained after catalog reload, including unchecking', async (t) => {
    let token: string | null = null;
    let international = false;
    const affiliate = { id: '12345678-1234-4234-8234-123456789abc', name: 'Material', platform: 'Amazon US', platformId: '22345678-1234-4234-8234-123456789abc' };
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.AuthService, useValue: { accessToken: () => token } },
    ]);
    const service = runtime.runInInjectionContext(injector, () => new runtime.AdminCatalogService());
    t.after(() => injector.destroy());
    token = 'test-token';
    t.mock.method(globalThis, 'fetch', async (url: string, options: any) => {
        if (options.method) {
            international = JSON.parse(options.body).international; assert.equal(JSON.parse(options.body).platformId, affiliate.platformId); assert.equal(JSON.parse(options.body).platform, affiliate.platform);
            assert.equal(typeof international, 'boolean');
            return Response.json({ id: affiliate.id });
        }
        return Response.json(url.endsWith('/affiliates') ? [{ ...affiliate, international }] :
            url.endsWith('/settings') ? { whatsappNumber: '' } : []);
    });
    await service.saveAffiliate({ ...affiliate, international: true });
    assert.equal(service.allAffiliates[0].international, true); assert.equal(service.allAffiliates[0].platformId, affiliate.platformId);
    await service.saveAffiliate({ ...affiliate, international: false });
    assert.equal(service.allAffiliates[0].international, false);
    await service.saveAffiliate(affiliate);
    assert.equal(service.allAffiliates[0].international, false);
});

test('themes use authenticated POST/PUT/DELETE and product saves include zero or multiple theme IDs', async (t) => {
    let token: string | null = null;
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.AuthService, useValue: { accessToken: () => token } },
    ]);
    const service = runtime.runInInjectionContext(injector, () => new runtime.AdminCatalogService());
    t.after(() => injector.destroy());
    token = 'test-token';
    const theme = { id: '12345678-1234-4234-8234-123456789abc', name: 'Natal', active: true, productCount: 2 };
    const writes: { url: string; method: string; body?: any }[] = [];
    t.mock.method(globalThis, 'fetch', async (url: string, options: any) => {
        assert.equal(options.headers.Authorization, 'Bearer test-token');
        if (options.method) {
            writes.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : undefined });
            return Response.json({});
        }
        return Response.json(url.endsWith('/themes') ? [theme] : url.endsWith('/settings') ? { whatsappNumber: '' } : []);
    });
    await service.saveTheme({ id: '', name: ' Natal ', active: true });
    assert.deepEqual(writes[0].body, { name: 'Natal', active: true });
    assert.equal(writes[0].method, 'POST');
    assert.deepEqual(service.themes, [theme]);
    await service.saveTheme({ ...theme, active: false });
    assert.equal(writes[1].method, 'PUT');
    assert.equal(writes[1].url, `https://api.cricastudio.com/api/admin/catalog/themes/${theme.id}`);
    await service.saveProduct({ id: theme.id, themeIds: [theme.id, '22345678-1234-4234-8234-123456789abc'] });
    assert.equal(writes[2].body.themeIds.length, 2);
    await service.saveProduct({ id: theme.id, themeIds: [] });
    assert.deepEqual(writes[3].body.themeIds, []);
    await service.deleteTheme(theme.id);
    assert.equal(writes[4].method, 'DELETE');
});

test('new types POST a valid GUID placeholder; saved types PUT their ID and refresh the catalog', async (t) => {
    const saved = { id: '12345678-1234-4234-8234-123456789abc', name: 'Camiseta', scope: 'shop', active: true };
    const writes: { url: string; method: string; body: any }[] = [];
    let token: string | null = null;
    const injector = runtime.createEnvironmentInjector([
        { provide: runtime.AuthService, useValue: { accessToken: () => token } },
    ]);
    const service = runtime.runInInjectionContext(injector, () => new runtime.AdminCatalogService());
    t.after(() => injector.destroy());
    token = 'test-token';
    t.mock.method(globalThis, 'fetch', async (url: string, options: any) => {
        if (options.method) {
            writes.push({ url, method: options.method, body: JSON.parse(options.body) });
            return Response.json(saved);
        }
        return Response.json(url.endsWith('/types') ? [saved] :
            url.endsWith('/settings') ? { whatsappNumber: '' } : []);
    });
    await service.saveType({ id: 'item-new-draft', name: ' Camiseta ', scope: 'shop', active: true, usage: 5 });
    assert.deepEqual(writes[0], {
        url: 'https://api.cricastudio.com/api/admin/catalog/types', method: 'POST',
        body: { id: '00000000-0000-0000-0000-000000000000', name: 'Camiseta', scope: 'shop', active: true },
    });
    assert.deepEqual(service.types, [saved]);
    await service.saveType({ ...saved, active: false });
    assert.deepEqual(writes[1], {
        url: `https://api.cricastudio.com/api/admin/catalog/types/${saved.id}`, method: 'PUT',
        body: { ...saved, active: false },
    });
});
