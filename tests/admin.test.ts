import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateItem,
    validateType,
    persist,
    readState,
    priceLabel,
    STORAGE_KEY,
} from '../src/app/services/local-store.ts';
const state: any = {
    version: 1,
    types: [{ id: 'caneca', name: 'Caneca', scope: 'both', active: true }],
    products: [],
    affiliates: [],
    settings: { whatsappNumber: '' },
};
const product: any = {
    id: 'one',
    name: 'Caneca especial',
    typeId: 'caneca',
    category: 'Caneca',
    status: 'published',
    order: 1,
    description: 'Descrição',
    images: ['/assets/product-1.webp'],
    characteristics: [],
    personalization: [],
    demo: true,
    priceMode: 'fixed',
    price: 45,
};
test('publicação exige conteúdo e valores válidos, rascunho permite foto pendente', () => {
    assert.deepEqual(validateItem(product, 'shop', state.types), []);
    assert.ok(
        validateItem({ ...product, images: [] }, 'shop', state.types).some((e) =>
            e.includes('foto'),
        ),
    );
    assert.deepEqual(
        validateItem(
            { ...product, images: [], status: 'draft', description: '' },
            'shop',
            state.types,
        ),
        [],
    );
    assert.ok(validateItem({ ...product, price: 0 }, 'shop', state.types).length);
    assert.equal(priceLabel(product), 'R$ 45,00');
    assert.equal(priceLabel({ ...product, priceMode: 'consult' }), 'Sob consulta');
});
test('link obrigatório para indicação real; demonstração pode ter destino pendente', () => {
    const item: any = {
        id: 's',
        name: 'Caneca',
        typeId: 'caneca',
        platform: 'Shopee',
        status: 'published',
        order: 1,
        description: 'Teste',
        image: '/assets/product-1.webp',
    };
    assert.ok(validateItem(item, 'suppliers', state.types).some((e) => e.includes('anúncio')));
    assert.deepEqual(validateItem({ ...item, demoListing: true }, 'suppliers', state.types), []);
    assert.deepEqual(
        validateItem(
            { ...item, url: 'https://example.com/item?ref=a%2Bb' },
            'suppliers',
            state.types,
        ),
        [],
    );
    assert.ok(
        validateItem({ ...item, url: 'javascript:alert(1)' }, 'suppliers', state.types).length,
    );
});
test('tipos duplicados e incompatíveis são bloqueados; vínculo inativo existente é preservado', () => {
    assert.ok(
        validateType({ id: 'two', name: ' CÁNECA ', scope: 'both', active: true }, state).length,
    );
    assert.ok(
        validateType(
            { id: 'caneca', name: 'Caneca', scope: 'suppliers', active: true },
            { ...state, products: [product] },
        ).length,
    );
    const types = [{ ...state.types[0], active: false }];
    assert.ok(validateItem(product, 'shop', types).length);
    assert.deepEqual(validateItem(product, 'shop', types, product), []);
});
test('persistência mantém alterações e links após leitura e falha sem ocultar erro de quota', () => {
    let data: string | null = null;
    const storage = {
        getItem: () => data,
        setItem: (key: string, value: string) => {
            assert.equal(key, STORAGE_KEY);
            data = value;
        },
    };
    const saved = {
        ...state,
        products: [product],
        affiliates: [
            {
                id: 's',
                name: 'Material',
                description: 'Teste',
                url: 'https://example.com/?ref=a%2Bb',
            },
        ],
    };
    persist(storage, saved);
    assert.deepEqual(readState(storage), saved);
    assert.throws(
        () =>
            persist(
                {
                    getItem: () => null,
                    setItem: () => {
                        throw new Error('Quota');
                    },
                },
                saved,
            ),
        /Quota/,
    );
    data = '{corrupted';
    assert.throws(() => readState(storage));
});
