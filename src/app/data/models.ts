export type Category = string;
export type Platform = 'Shopee' | 'Mercado Livre' | 'TikTok Shop' | 'AliExpress' | 'Outra';
export type ItemStatus = 'draft' | 'published' | 'inactive';
export type PriceMode = 'consult' | 'fixed' | 'from';
export interface CatalogType {
    id: string;
    name: string;
    scope: 'shop' | 'suppliers' | 'both';
    active: boolean;
}
export interface ManagedFields {
    typeId?: string;
    status?: ItemStatus;
    order?: number;
}
export interface Product extends ManagedFields {
    id: string;
    name: string;
    category: Category;
    description: string;
    fullDescription?: string;
    images: string[];
    characteristics: string[];
    personalization: string[];
    demo: boolean;
    priceMode?: PriceMode;
    price?: number;
}
export interface AffiliateProduct extends ManagedFields {
    id: string;
    name: string;
    description: string;
    image?: string;
    platform: Platform;
    category: string;
    url?: string;
    seller?: string;
    demoListing?: boolean;
}
export interface CatalogState {
    version: 1;
    products: Product[];
    affiliates: AffiliateProduct[];
    types: CatalogType[];
    settings: { whatsappNumber: string };
}
