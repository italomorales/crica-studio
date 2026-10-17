import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { interfaceText, INTERFACE_DICTIONARIES } from '../src/app/services/translations.ts';

test('every public News interface string has English and Spanish translations', async () => {
    const template = await readFile('src/app/blog/blog-public.html', 'utf8');
    const component = await readFile('src/app/blog/blog-public.ts', 'utf8');
    const keys = [...(template + component).matchAll(/\bt\('([^']+)'/g)].map(match => match[1]);
    for (const locale of ['en', 'es']) {
        for (const key of keys) assert.ok(INTERFACE_DICTIONARIES[locale][key], `${locale}: ${key}`);
        for (const key of ['Publicada nesta sessão', 'Versão não publicada'])
            assert.ok(INTERFACE_DICTIONARIES[locale][key], `${locale}: ${key}`);
    }
    // Accessible names and input hints must follow the selected language too.
    assert.ok(template.includes('[placeholder]="t('));
    assert.ok(template.includes('[attr.aria-label]="t('));
});

test('category, author introduction and reading labels do not fall back to Portuguese', () => {
    assert.equal(interfaceText('Empreendedorismo', 'en'), 'Entrepreneurship');
    assert.equal(interfaceText('Empreendedorismo', 'es'), 'Emprendimiento');
    assert.equal(interfaceText('{minutes} min de leitura', 'en'), '{minutes} min read');
    assert.equal(interfaceText('{minutes} min de leitura', 'es'), '{minutes} min de lectura');
    assert.equal(interfaceText('Todas as histórias', 'en'), 'All stories');
    const bio = 'A Crica ajuda pessoas a transformar ideias em presentes cheios de significado, compartilhando inspirações e dicas para criar com carinho. 💙';
    assert.match(interfaceText(bio, 'en'), /^Crica helps people/);
    assert.match(interfaceText(bio, 'es'), /^Crica ayuda/);
    assert.equal(interfaceText(bio, 'pt'), bio);
});
