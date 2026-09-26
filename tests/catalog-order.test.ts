import test from 'node:test';
import assert from 'node:assert/strict';
import { moveCatalogItem, sameCatalogOrder } from '../src/app/admin/catalog-order.ts';
test('move across pages leaves live order unchanged until saved', () => {
    const original = Array.from({ length: 49 }, (_, i) => ({ id: String(i) }));
    const moved = moveCatalogItem(original, '48', 0);
    assert.equal(moved[0].id, '48');
    assert.equal(moved[1].id, '0');
    assert.equal(original[0].id, '0');
    assert.equal(new Set(moved.map((x) => x.id)).size, 49);
    assert.equal(sameCatalogOrder(original, moved), false);
    assert.equal(sameCatalogOrder(original, moveCatalogItem(moved, '48', 48)), true);
});
test('position accepts only existing items and valid integer destinations', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    for (const n of [-1, 3, NaN, 1.5]) assert.equal(moveCatalogItem(items, 'b', n), items);
    assert.equal(moveCatalogItem(items, 'missing', 0), items);
    assert.deepEqual(
        moveCatalogItem(items, 'a', 2).map((x) => x.id),
        ['b', 'c', 'a'],
    );
    assert.equal(sameCatalogOrder(items, [...items, { id: 'd' }]), false);
});
