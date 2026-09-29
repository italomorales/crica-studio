import test from 'node:test';
import assert from 'node:assert/strict';
import { friendlySlug, productPath } from '../src/app/services/product-url.ts';

test('URL amigável remove acentos, normaliza espaços e preserva slug publicado', () => {
    assert.equal(friendlySlug(' Caneca: Coração & Café! '), 'caneca-coracao-cafe');
    assert.equal(productPath({ name: 'Caneca Coração', slug: 'caneca-coracao-estavel' }), '/loja/caneca-coracao-estavel');
    assert.equal(productPath({ name: 'Caneca Coração' }), '/loja/caneca-coracao');
});
