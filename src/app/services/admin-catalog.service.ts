import { Injectable, inject, signal } from '@angular/core';
import type {
    AffiliateProduct,
    CatalogState,
    CatalogType,
    CatalogTheme,
    Product,
} from '../data/models';
import { API_URL, AuthService } from './auth.service';
import { catalogTypeRequest, catalogWriteMethod, isExistingCatalogId } from './catalog-id';

type ApiProduct = Omit<Product, 'category' | 'typeId' | 'status' | 'order'> & {
    typeId: string;
    status: NonNullable<Product['status']>;
    order: number;
};
type ApiAffiliate = Omit<AffiliateProduct, 'category' | 'typeId' | 'status' | 'order'> & {
    typeId: string;
    status: NonNullable<AffiliateProduct['status']>;
    order: number;
};
type ApiSettings = { whatsappNumber: string };

const emptyState = (): CatalogState => ({
    version: 1,
    products: [],
    affiliates: [],
    types: [],
    settings: { whatsappNumber: '' },
});

@Injectable({ providedIn: 'root' })
export class AdminCatalogService {
    private auth = inject(AuthService);
    readonly state = signal<CatalogState>(emptyState());
    readonly loading = signal(true);
    readonly error = signal('');

    constructor() {
        void this.load();
    }

    get themes() {
        return this.state().themes ?? [];
    }
    get types() {
        return this.state().types;
    }
    typeName(id?: string) {
        return this.types.find((type) => type.id === id)?.name || 'Sem tipo';
    }
    get allProducts() {
        return [...this.state().products].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    get allAffiliates() {
        return [...this.state().affiliates].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    get whatsappNumber() {
        return this.state().settings.whatsappNumber;
    }

    async load(showLoading = true) {
        const token = this.auth.accessToken();
        if (!token) {
            if (showLoading) this.loading.set(false);
            return;
        }

        if (showLoading) this.loading.set(true);
        this.error.set('');
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [
                typesResponse,
                productsResponse,
                affiliatesResponse,
                settingsResponse,
                themesResponse,
            ] = await Promise.all(
                ['types', 'products', 'affiliates', 'settings', 'themes'].map((resource) =>
                    fetch(`${API_URL}/api/admin/catalog/${resource}`, { headers }),
                ),
            );
            if (
                [
                    typesResponse,
                    productsResponse,
                    affiliatesResponse,
                    settingsResponse,
                    themesResponse,
                ].some((r) => r.status === 401)
            ) {
                this.auth.logout();
                throw new Error('session');
            }
            if (
                ![
                    typesResponse,
                    productsResponse,
                    affiliatesResponse,
                    settingsResponse,
                    themesResponse,
                ].every((r) => r.ok)
            )
                throw new Error('api');

            const [types, products, affiliates, settings, themes] = (await Promise.all([
                typesResponse.json(),
                productsResponse.json(),
                affiliatesResponse.json(),
                settingsResponse.json(),
                themesResponse.json(),
            ])) as [CatalogType[], ApiProduct[], ApiAffiliate[], ApiSettings, CatalogTheme[]];
            const typeNames = new Map(types.map((type) => [type.id, type.name]));
            this.state.set({
                version: 1,
                types,
                themes,
                products: products.map((product) => ({
                    ...product,
                    category: typeNames.get(product.typeId) ?? 'Sem tipo',
                })),
                affiliates: affiliates.map((affiliate) => ({
                    ...affiliate,
                    category: typeNames.get(affiliate.typeId) ?? 'Sem tipo',
                })),
                settings: { whatsappNumber: settings.whatsappNumber ?? '' },
            });
        } catch (error) {
            this.error.set(
                error instanceof Error && error.message === 'session'
                    ? 'Sua sessão expirou. Entre novamente para continuar.'
                    : 'Não foi possível carregar os dados administrativos. Tente novamente.',
            );
        } finally {
            if (showLoading) this.loading.set(false);
        }
    }

    async reorder(
        resource: 'products' | 'affiliates',
        ids: string[],
        expected: { id: string; order: number }[],
    ) {
        const token = this.auth.accessToken();
        if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
        const response = await fetch(`${API_URL}/api/admin/catalog/${resource}/order`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, expected }),
        });
        if (response.status === 401) {
            this.auth.logout();
            throw new Error('Sua sessão expirou. Entre novamente.');
        }
        if (!response.ok) {
            const problem = await response.json().catch(() => null);
            throw new Error(problem?.detail || 'Não foi possível salvar a ordem. Tente novamente.');
        }
        const positions = new Map(ids.map((id, index) => [id, index + 1]));
        this.state.update((state) => ({
            ...state,
            [resource]: state[resource].map((item) => ({
                ...item,
                order: positions.get(item.id) ?? item.order,
            })),
        }));
    }
    async saveProduct(product: Product) {
        await this.write('products', product.id, {
            typeId: product.typeId,
            themeIds: product.themeIds ?? [],
            name: product.name,
            slug: product.slug,
            description: product.description,
            fullDescription: product.fullDescription,
            priceMode: product.priceMode,
            price: product.price,
            demo: product.demo,
            featured: product.featured ?? false,
            characteristics: product.characteristics,
            personalization: product.personalization,
            images: product.images,
            status: product.status,
            order: product.order,
        });
    }
    async saveAffiliate(product: AffiliateProduct) {
        await this.write('affiliates', product.id, {
            typeId: product.typeId,
            name: product.name,
            description: product.description,
            platform: product.platform,
            image: product.image,
            images: product.images ?? (product.image ? [product.image] : []),
            url: product.url,
            seller: product.seller,
            demoListing: product.demoListing,
            status: product.status,
            order: product.order,
            featured: product.featured ?? false,
        });
    }
    async saveTheme(theme: CatalogTheme) {
        await this.write('themes', theme.id, { name: theme.name.trim(), active: theme.active });
    }
    async deleteTheme(id: string) {
        await this.remove('themes', id);
    }
    async saveType(type: CatalogType) {
        await this.write('types', type.id, catalogTypeRequest(type));
    }
    async saveSettings(number: string) {
        await this.write('settings', undefined, { whatsappNumber: number }, 'PUT');
    }
    async deleteProduct(id: string) {
        await this.remove('products', id);
    }
    async deleteAffiliate(id: string) {
        await this.remove('affiliates', id);
    }
    async deleteType(id: string) {
        await this.remove('types', id);
    }
    async uploadImage(file: Blob, category: 'products' | 'affiliates') {
        const token = this.auth.accessToken();
        if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
        const form = new FormData();
        form.append(
            'file',
            file,
            `catalog-image.${file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp'}`,
        );
        const response = await fetch(`${API_URL}/api/admin/catalog/media/${category}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        if (response.status === 401) {
            this.auth.logout();
            throw new Error('Sua sessão expirou. Entre novamente.');
        }
        if (!response.ok) {
            const problem = (await response.json().catch(() => null)) as {
                errors?: Record<string, string[]>;
                detail?: string;
            } | null;
            throw new Error(
                problem?.errors
                    ? Object.values(problem.errors).flat().join(' ')
                    : problem?.detail || 'Não foi possível enviar a imagem.',
            );
        }
        return ((await response.json()) as { url: string }).url;
    }
    private async write(
        resource: string,
        id: string | undefined,
        body: unknown,
        fixedMethod?: string,
    ) {
        const token = this.auth.accessToken();
        if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
        const known = isExistingCatalogId(id);
        const response = await fetch(
            `${API_URL}/api/admin/catalog/${resource}${known ? '/' + id : ''}`,
            {
                method: catalogWriteMethod(id, fixedMethod),
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            },
        );
        if (response.status === 401) {
            this.auth.logout();
            throw new Error('Sua sessão expirou. Entre novamente.');
        }
        if (!response.ok) {
            const problem = (await response.json().catch(() => null)) as {
                errors?: Record<string, string[]>;
                detail?: string;
            } | null;
            throw new Error(
                problem?.errors
                    ? Object.values(problem.errors).flat().join(' ')
                    : problem?.detail || 'Não foi possível salvar.',
            );
        }
        await this.load(false);
    }
    private async remove(resource: string, id: string) {
        const token = this.auth.accessToken();
        if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
        if (!isExistingCatalogId(id))
            throw new Error('Este cadastro não possui uma identificação válida para exclusão.');
        const response = await fetch(`${API_URL}/api/admin/catalog/${resource}/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
            this.auth.logout();
            throw new Error('Sua sessão expirou. Entre novamente.');
        }
        if (!response.ok) {
            const problem = (await response.json().catch(() => null)) as {
                errors?: Record<string, string[]>;
                detail?: string;
            } | null;
            throw new Error(
                problem?.errors
                    ? Object.values(problem.errors).flat().join(' ')
                    : problem?.detail || 'Não foi possível excluir.',
            );
        }
        await this.load(false);
    }
}
