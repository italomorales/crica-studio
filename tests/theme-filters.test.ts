import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShopFilters, shopFilterParams } from '../src/app/services/theme-filters.ts';

const natal = '12345678-1234-4234-8234-123456789abc';
const memes = '22345678-1234-4234-8234-123456789abc';
test('shared filters preserve search, product type and multiple themes through URL round trip', () => {
    const filters = { query: 'Caneca de Natal', typeId: natal, themeIds: [natal, memes] };
    const params = shopFilterParams(filters);
    assert.deepEqual(parseShopFilters(params.q, params.tipo, params.temas), filters);
    assert.deepEqual(shopFilterParams({ query: '', themeIds: [] }), { q: null, tipo: null, temas: null });
});
test('URL parsing removes duplicate and malformed IDs while preserving usable themes', () => {
    assert.deepEqual(parseShopFilters(null, 'invalido', `${natal.toUpperCase()},${natal},invalid,${memes}`), {
        query: '', typeId: undefined, themeIds: [natal, memes],
    });
});
