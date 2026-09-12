import { Injectable, signal } from '@angular/core';
import { seedState } from '../data/seed';
import type { CatalogState, Product, AffiliateProduct, CatalogType } from '../data/models';
import { persist, readState, STORAGE_KEY, validateItem, validateType } from './local-store';
@Injectable({ providedIn: 'root' })
export class CatalogService {
    readonly state = signal<CatalogState>(seedState());
    readonly storageWarning = signal('');
    constructor() {
        try {
            const saved = readState(localStorage);
            if (saved) this.state.set(saved);
        } catch {
            this.storageWarning.set(
                'Não foi possível ler os dados locais. Os exemplos foram carregados em memória.',
            );
        }
        window.addEventListener('storage', (event) => {
            if (event.key === STORAGE_KEY) {
                try {
                    const s = readState(localStorage);
                    if (s) this.state.set(s);
                } catch {
                    this.storageWarning.set(
                        'Os dados alterados em outra aba não puderam ser lidos.',
                    );
                }
            }
        });
    }
    private ordered<T extends { order?: number }>(items: T[]): T[] {
        return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    get types() {
        return this.state().types;
    }
    typeName(id?: string) {
        return this.types.find((t) => t.id === id)?.name || 'Sem tipo';
    }
    get allProducts() {
        return this.ordered(this.state().products).map((p) => ({
            ...p,
            category: this.typeName(p.typeId),
        }));
    }
    get allAffiliates() {
        return this.ordered(this.state().affiliates).map((p) => ({
            ...p,
            category: this.typeName(p.typeId),
        }));
    }
    get products() {
        return this.allProducts.filter((p) => p.status === 'published');
    }
    get affiliates() {
        return this.allAffiliates.filter((p) => p.status === 'published');
    }
    get whatsappNumber() {
        return this.state().settings.whatsappNumber;
    }
    private commit(next: CatalogState) {
        try {
            persist(localStorage, next);
        } catch {
            throw new Error(
                'Não foi possível salvar neste navegador. O armazenamento pode estar cheio ou bloqueado. Reduza as fotos e tente novamente.',
            );
        }
        this.state.set(next);
        this.storageWarning.set('');
    }
    saveProduct(p: Product) {
        const s = structuredClone(this.state());
        const errors = validateItem(
            p,
            'shop',
            s.types,
            s.products.find((x) => x.id === p.id),
        );
        if (errors.length) throw new Error(errors.join(' '));
        p = { ...p, name: p.name.trim(), price: p.priceMode === 'consult' ? undefined : p.price };
        const i = s.products.findIndex((x) => x.id === p.id);
        i < 0 ? s.products.push(p) : (s.products[i] = p);
        this.commit(s);
    }
    saveAffiliate(p: AffiliateProduct) {
        const s = structuredClone(this.state());
        const errors = validateItem(
            p,
            'suppliers',
            s.types,
            s.affiliates.find((x) => x.id === p.id),
        );
        if (errors.length) throw new Error(errors.join(' '));
        p = { ...p, name: p.name.trim() };
        const i = s.affiliates.findIndex((x) => x.id === p.id);
        i < 0 ? s.affiliates.push(p) : (s.affiliates[i] = p);
        this.commit(s);
    }
    saveType(t: CatalogType) {
        const s = structuredClone(this.state());
        const errors = validateType(t, s);
        if (errors.length) throw new Error(errors.join(' '));
        t = { ...t, name: t.name.trim() };
        const i = s.types.findIndex((x) => x.id === t.id);
        i < 0 ? s.types.push(t) : (s.types[i] = t);
        this.commit(s);
    }
    saveSettings(number: string) {
        if (number && !/^[1-9]\d{7,14}$/.test(number))
            throw new Error(
                'Use somente os dígitos do número internacional, incluindo país e DDD, ou deixe em branco.',
            );
        const s = structuredClone(this.state());
        s.settings.whatsappNumber = number;
        this.commit(s);
    }
    reset() {
        this.commit(seedState());
    }
}
