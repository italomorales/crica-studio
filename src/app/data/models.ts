export type Category = string;
import type { TranslatableContent } from '../services/catalog-translations';
export type Platform = string;
export type ItemStatus = 'draft' | 'published' | 'inactive';
export type PriceMode = 'consult' | 'fixed' | 'from';
export type SupplierManagementField = 'lastStorePrice' | 'linkStatus' | 'stockStatus';
export interface CatalogType extends TranslatableContent {
    id: string;
    name: string;
    scope: 'shop' | 'suppliers' | 'both';
    active: boolean;
}
export interface CatalogTheme extends TranslatableContent {
    id: string;
    name: string;
    active: boolean;
    productCount?: number;
}
export interface ManagedFields {
    categoryType?: CatalogType;
    typeId?: string;
    status?: ItemStatus;
    order?: number;
}
export interface Product extends ManagedFields {
    themeIds?: string[];
    id: string;
    name: string;
    slug?: string;
    category: Category;
    description: string;
    fullDescription?: string;
    images: string[];
    characteristics: string[];
    personalization: string[];
    demo: boolean;
    featured?: boolean;
    priceMode?: PriceMode;
    price?: number;
}
export interface AffiliateProduct extends ManagedFields, TranslatableContent {
    lastStorePrice?: number | null;
    linkStatus?: 'unchecked' | 'ok' | 'broken';
    stockStatus?: 'unchecked' | 'in_stock' | 'out_of_stock';
    platformContent?: TranslatableContent;
    id: string;
    name: string;
    description: string;
    image?: string;
    images?: string[];
    platform: Platform;
    platformId?: string;
    international?: boolean;
    category: string;
    url?: string;
    seller?: string;
    demoListing?: boolean;
    featured?: boolean;
}
export interface CatalogState {
    version: 1;
    products: Product[];
    affiliates: AffiliateProduct[];
    types: CatalogType[];
    themes?: CatalogTheme[];
    settings: { whatsappNumber: string };
}
