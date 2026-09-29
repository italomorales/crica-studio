import type { Product } from '../data/models';

export function friendlySlug(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 180);
}

export function productPath(product: Pick<Product, 'name' | 'slug'>) {
    return `/loja/${product.slug || friendlySlug(product.name)}`;
}
