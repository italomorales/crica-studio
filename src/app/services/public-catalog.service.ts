import { Injectable, signal } from '@angular/core';
import type { AffiliateProduct, CatalogType, Product } from '../data/models';

const API_URL = (
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5030' : 'https://api.cricastudio.com')
).replace(/\/$/, '');

type ApiProduct = Omit<Product, 'category' | 'typeId'> & { typeId: string };
type ApiAffiliate = Omit<AffiliateProduct, 'category' | 'typeId'> & { typeId: string };
type ApiSettings = { whatsappNumber: string };

@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
    readonly products = signal<Product[]>([]);
    readonly affiliates = signal<AffiliateProduct[]>([]);
    readonly types = signal<CatalogType[]>([]);
    readonly whatsappNumber = signal('');
    readonly loading = signal(true);
    readonly error = signal('');

    constructor() {
        void this.load();
    }

    async load() {
        this.loading.set(true);
        this.error.set('');
        try {
            const [typesResponse, productsResponse, affiliatesResponse, settingsResponse] = await Promise.all(
                ['types', 'products', 'affiliates', 'settings'].map((resource) =>
                    fetch(`${API_URL}/api/catalog/${resource}`),
                ),
            );
            if (![typesResponse, productsResponse, affiliatesResponse, settingsResponse].every((r) => r.ok))
                throw new Error('api');

            const [types, products, affiliates, settings] = (await Promise.all([
                typesResponse.json(),
                productsResponse.json(),
                affiliatesResponse.json(),
                settingsResponse.json(),
            ])) as [CatalogType[], ApiProduct[], ApiAffiliate[], ApiSettings];
            const typeNames = new Map(types.map((type) => [type.id, type.name]));

            this.types.set(types);
            this.products.set(
                products.map((product) => ({
                    ...product,
                    category: typeNames.get(product.typeId) ?? 'Sem tipo',
                })),
            );
            this.affiliates.set(
                affiliates.map((affiliate) => ({
                    ...affiliate,
                    category: typeNames.get(affiliate.typeId) ?? 'Sem tipo',
                })),
            );
            this.whatsappNumber.set(settings.whatsappNumber ?? '');
        } catch {
            this.error.set('Não foi possível carregar o catálogo. Atualize a página para tentar novamente.');
        } finally {
            this.loading.set(false);
        }
    }
}
