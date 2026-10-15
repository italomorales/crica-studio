import test from 'node:test';
import assert from 'node:assert/strict';
import { siteTitle } from '../src/app/services/seo-title.ts';

test('article titles keep exactly one brand suffix without removing meaningful content', () => {
    for (const title of ['Minha história', 'Minha história | Crica Studio', 'Minha história | Crica Studio | Crica Studio', 'Minha história — Crica Studio'])
        assert.equal(siteTitle(title), 'Minha história | Crica Studio');
    assert.equal(siteTitle('Crica Studio e o começo das canecas'), 'Crica Studio e o começo das canecas | Crica Studio');
});
