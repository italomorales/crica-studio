import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { PublicCatalogService } from './services/public-catalog.service';
import { FiltersComponent, ProductImageComponent } from './components/shared';
import { ProductCardComponent, AffiliateCardComponent } from './components/cards';
import { DetailsComponent } from './components/details';
import shopTemplate from './shop.html?raw';
import suppliersTemplate from './suppliers.html?raw';
import storefrontTemplate from './storefront.html?raw';
import { SITE_CONFIG } from './data/site.config';
import type { AffiliateProduct, Product } from './data/models';
import { externalUrl } from './services/contact';

@Component({
    selector: 'crica-shop',
    standalone: true,
    imports: [FiltersComponent, ProductCardComponent, DetailsComponent],
    template: shopTemplate,
})
export class ShopComponent implements OnInit, OnDestroy {
    catalog = inject(PublicCatalogService);
    category = 'Todos';
    query = '';
    private searchTimer?: ReturnType<typeof setTimeout>;
    private carouselTimer?: ReturnType<typeof setInterval>;
    get categories() {
        return [
            'Todos',
            ...this.catalog
                .types()
                .filter((type) => type.scope === 'shop' || type.scope === 'both')
                .map((type) => type.name),
        ];
    }
    ngOnInit() {
        void this.refresh();
        void this.catalog.loadFeaturedProducts().then(() => this.startCarousel());
    }
    ngOnDestroy() {
        clearTimeout(this.searchTimer);
        this.stopCarousel();
    }
    featuredIndex = 0;
    get featuredProduct(): Product | undefined {
        return this.catalog.featuredProducts()[this.featuredIndex];
    }
    previousFeatured() {
        const products = this.catalog.featuredProducts();
        this.featuredIndex = (this.featuredIndex - 1 + products.length) % products.length;
    }
    nextFeatured() {
        const products = this.catalog.featuredProducts();
        this.featuredIndex = (this.featuredIndex + 1) % products.length;
    }
    selectFeatured(index: number) {
        this.featuredIndex = index;
    }
    startCarousel() {
        this.stopCarousel();
        if (this.catalog.featuredProducts().length > 1)
            this.carouselTimer = setInterval(() => this.nextFeatured(), 6000);
    }
    stopCarousel() {
        clearInterval(this.carouselTimer);
        this.carouselTimer = undefined;
    }
    select(category: string) {
        this.category = category;
        void this.refresh();
    }
    search(query: string) {
        this.query = query;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => void this.refresh(), 300);
    }
    refresh() {
        const typeId = this.catalog.types().find((type) => type.name === this.category)?.id;
        return this.catalog.loadShop({ query: this.query, typeId });
    }
    loadMore() {
        const typeId = this.catalog.types().find((type) => type.name === this.category)?.id;
        return this.catalog.loadShop({ query: this.query, typeId }, true);
    }
    clear() {
        clearTimeout(this.searchTimer);
        this.category = 'Todos';
        this.query = '';
        void this.refresh();
    }
}
@Component({
    selector: 'crica-suppliers',
    standalone: true,
    imports: [FiltersComponent, ProductImageComponent, AffiliateCardComponent, DetailsComponent],
    template: suppliersTemplate,
})
export class SuppliersComponent implements OnInit, OnDestroy {
    catalog = inject(PublicCatalogService);
    platform = 'Todos';
    query = '';
    private searchTimer?: ReturnType<typeof setTimeout>;
    private carouselTimer?: ReturnType<typeof setInterval>;
    ngOnInit() {
        void this.refresh();
        void this.catalog.loadFeaturedAffiliates().then(() => this.startCarousel());
    }
    ngOnDestroy() {
        clearTimeout(this.searchTimer);
        this.stopCarousel();
    }
    featuredIndex = 0;
    get featuredAffiliate() {
        return this.catalog.featuredAffiliates()[this.featuredIndex];
    }
    featuredUrl(product: AffiliateProduct) {
        return externalUrl(SITE_CONFIG.affiliateLinks[product.id] ?? product.url);
    }
    previousFeatured() {
        const products = this.catalog.featuredAffiliates();
        this.featuredIndex = (this.featuredIndex - 1 + products.length) % products.length;
    }
    nextFeatured() {
        const products = this.catalog.featuredAffiliates();
        this.featuredIndex = (this.featuredIndex + 1) % products.length;
    }
    selectFeatured(index: number) {
        this.featuredIndex = index;
    }
    startCarousel() {
        this.stopCarousel();
        if (this.catalog.featuredAffiliates().length > 1)
            this.carouselTimer = setInterval(() => this.nextFeatured(), 6000);
    }
    stopCarousel() {
        clearInterval(this.carouselTimer);
        this.carouselTimer = undefined;
    }
    select(platform: string) {
        this.platform = platform;
        void this.refresh();
    }
    search(query: string) {
        this.query = query;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => void this.refresh(), 300);
    }
    refresh() {
        return this.catalog.loadAffiliates({
            query: this.query,
            platform: this.platform === 'Todos' ? undefined : this.platform,
        });
    }
    loadMore() {
        return this.catalog.loadAffiliates(
            { query: this.query, platform: this.platform === 'Todos' ? undefined : this.platform },
            true,
        );
    }
    clear() {
        clearTimeout(this.searchTimer);
        this.platform = 'Todos';
        this.query = '';
        void this.refresh();
    }
}
@Component({
    selector: 'crica-storefront',
    standalone: true,
    template: storefrontTemplate,
})
export class StorefrontComponent {
    readonly storefronts = SITE_CONFIG.storefronts;
}
