import { Injectable, signal } from '@angular/core';
import type { AffiliateProduct, CatalogType, Product } from '../data/models';
import { normalize } from './contact';

const API_URL = (
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? '' : 'https://api.cricastudio.com')
).replace(/\/$/, '');
const PAGE_SIZE = 12;

type ApiProduct = Omit<Product, 'category' | 'typeId'> & { typeId: string };
type ApiAffiliate = Omit<AffiliateProduct, 'category' | 'typeId'> & { typeId: string };
type ApiPage<T> = { items: T[]; total: number; page: number; pageSize: number };
type ApiSettings = { whatsappNumber: string };
type ShopFilters = { query: string; typeId?: string };
type AffiliateFilters = { query: string; platform?: string };

@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
    readonly products = signal<Product[]>([]);
    readonly featuredProducts = signal<Product[]>([]);
    readonly affiliates = signal<AffiliateProduct[]>([]);
    readonly featuredAffiliates = signal<AffiliateProduct[]>([]);
    readonly types = signal<CatalogType[]>([]);
    readonly whatsappNumber = signal('');
    readonly productsTotal = signal(0);
    readonly affiliatesTotal = signal(0);
    readonly productsLoading = signal(false);
    readonly affiliatesLoading = signal(false);
    readonly productsError = signal('');
    readonly affiliatesError = signal('');
    private productsPage = 0;
    private affiliatesPage = 0;
    private productsRequest = 0;
    private affiliatesRequest = 0;
    private metaPromise?: Promise<void>;
    private settingsPromise?: Promise<void>;

    get hasMoreProducts() {
        return this.products().length < this.productsTotal();
    }
    get hasMoreAffiliates() {
        return this.affiliates().length < this.affiliatesTotal();
    }

    async loadShop(filters: ShopFilters, append = false) {
        const request = ++this.productsRequest;
        const page = append ? this.productsPage + 1 : 1;
        if (!append) {
            this.products.set([]);
            this.productsTotal.set(0);
        }
        this.productsLoading.set(true);
        this.productsError.set('');
        try {
            await Promise.all([this.ensureMeta(), this.ensureSettings()]);
            const result = await this.fetchPage<ApiProduct>('products', {
                page,
                pageSize: PAGE_SIZE,
                query: normalize(filters.query),
                typeId: filters.typeId,
                featured: false,
            });
            if (request !== this.productsRequest) return;
            const typeNames = new Map(this.types().map((type) => [type.id, type.name]));
            const items = result.items.map((product) => ({
                ...product,
                category: typeNames.get(product.typeId) ?? 'Sem tipo',
            }));
            this.products.set(append ? [...this.products(), ...items] : items);
            this.productsTotal.set(result.total);
            this.productsPage = result.page;
        } catch {
            if (request === this.productsRequest)
                this.productsError.set('Não foi possível carregar o catálogo. Tente novamente.');
        } finally {
            if (request === this.productsRequest) this.productsLoading.set(false);
        }
    }

    async loadFeaturedProducts() {
        try {
            await this.ensureMeta();
            const result = await this.fetchPage<ApiProduct>('products', {
                page: 1,
                pageSize: 3,
                featured: true,
            });
            const typeNames = new Map(this.types().map((type) => [type.id, type.name]));
            this.featuredProducts.set(
                result.items.map((product) => ({
                    ...product,
                    category: typeNames.get(product.typeId) ?? 'Sem tipo',
                })),
            );
        } catch {
            this.featuredProducts.set([]);
        }
    }

    async loadAffiliates(filters: AffiliateFilters, append = false) {
        const request = ++this.affiliatesRequest;
        const page = append ? this.affiliatesPage + 1 : 1;
        if (!append) {
            this.affiliates.set([]);
            this.affiliatesTotal.set(0);
        }
        this.affiliatesLoading.set(true);
        this.affiliatesError.set('');
        try {
            await this.ensureMeta();
            const result = await this.fetchPage<ApiAffiliate>('affiliates', {
                page,
                pageSize: PAGE_SIZE,
                query: normalize(filters.query),
                platform: filters.platform,
                featured: false,
            });
            if (request !== this.affiliatesRequest) return;
            const typeNames = new Map(this.types().map((type) => [type.id, type.name]));
            const items = result.items.map((affiliate) => ({
                ...affiliate,
                category: typeNames.get(affiliate.typeId) ?? 'Sem tipo',
            }));
            this.affiliates.set(append ? [...this.affiliates(), ...items] : items);
            this.affiliatesTotal.set(result.total);
            this.affiliatesPage = result.page;
        } catch {
            if (request === this.affiliatesRequest)
                this.affiliatesError.set('Não foi possível carregar as indicações. Tente novamente.');
        } finally {
            if (request === this.affiliatesRequest) this.affiliatesLoading.set(false);
        }
    }

    async loadFeaturedAffiliates() {
        try {
            await this.ensureMeta();
            const result = await this.fetchPage<ApiAffiliate>('affiliates', {
                page: 1,
                pageSize: 3,
                featured: true,
            });
            const typeNames = new Map(this.types().map((type) => [type.id, type.name]));
            this.featuredAffiliates.set(
                result.items.map((affiliate) => ({
                    ...affiliate,
                    category: typeNames.get(affiliate.typeId) ?? 'Sem tipo',
                })),
            );
        } catch {
            this.featuredAffiliates.set([]);
        }
    }

    private async ensureMeta() {
        if (this.types().length) return;
        this.metaPromise ??= fetch(`${API_URL}/api/catalog/types`)
            .then(async (response) => {
                if (!response.ok) throw new Error('api');
                this.types.set((await response.json()) as CatalogType[]);
            })
            .finally(() => (this.metaPromise = undefined));
        return this.metaPromise;
    }

    private async ensureSettings() {
        if (this.whatsappNumber()) return;
        this.settingsPromise ??= fetch(`${API_URL}/api/catalog/settings`)
            .then(async (response) => {
                if (!response.ok) throw new Error('api');
                const settings = (await response.json()) as ApiSettings;
                this.whatsappNumber.set(settings.whatsappNumber ?? '');
            })
            .finally(() => (this.settingsPromise = undefined));
        return this.settingsPromise;
    }

    private async fetchPage<T>(resource: 'products' | 'affiliates', params: Record<string, string | number | boolean | undefined>) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== '') search.set(key, String(value));
        }
        const response = await fetch(`${API_URL}/api/catalog/${resource}?${search}`);
        if (!response.ok) throw new Error('api');
        return (await response.json()) as ApiPage<T>;
    }
}
