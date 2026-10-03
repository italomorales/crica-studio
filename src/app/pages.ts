import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, Scroll } from '@angular/router';
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
import { shareLink } from './services/share';
import { productPath } from './services/product-url';
import { ThemeFilterComponent } from './components/theme-filter';
import { Subscription } from 'rxjs';
import { parseShopFilters, shopFilterParams } from './services/theme-filters';

@Component({
    selector: 'crica-shop',
    standalone: true,
    imports: [FiltersComponent, ProductCardComponent, ThemeFilterComponent],
    template: shopTemplate,
})
export class ShopComponent implements OnInit, OnDestroy {
    catalog = inject(PublicCatalogService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private routeSubscription?: Subscription;
    private scrollSubscription?: Subscription;
    private filterScroll?: [number, number];
    themeIds: string[] = [];
    typeId?: string;
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
        this.scrollSubscription = this.router.events.subscribe((event) => {
            if (event instanceof Scroll && this.filterScroll) {
                const position = this.filterScroll;
                this.filterScroll = undefined;
                // Apply after the router's default scroll handling for this navigation.
                requestAnimationFrame(() => window.scrollTo(...position));
            }
        });
        this.routeSubscription = this.route.queryParamMap.subscribe((params) => {
            const filters = parseShopFilters(
                params.get('q'),
                params.get('tipo'),
                params.get('temas'),
            );
            this.query = filters.query;
            this.typeId = filters.typeId;
            this.themeIds = filters.themeIds;
            clearTimeout(this.searchTimer);
            void this.refresh().then(() => {
                this.category =
                    this.catalog.types().find((type) => type.id === this.typeId)?.name ?? 'Todos';
            });
        });
        void this.catalog.loadFeaturedProducts().then(() => this.startCarousel());
    }
    ngOnDestroy() {
        clearTimeout(this.searchTimer);
        this.routeSubscription?.unsubscribe();
        this.scrollSubscription?.unsubscribe();
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
        clearTimeout(this.searchTimer);
        this.category = category;
        this.typeId = this.catalog.types().find((type) => type.name === category)?.id;
        this.updateFilters();
    }
    openProduct(product: Product) {
        void this.router.navigateByUrl(productPath(product), {
            state: { shopUrl: this.router.url },
        });
    }
    orderProduct(product: Product) {
        this.openProduct(product);
    }
    search(query: string) {
        this.query = query;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => this.updateFilters(), 300);
    }
    selectThemes(ids: string[]) {
        clearTimeout(this.searchTimer);
        this.themeIds = ids;
        this.updateFilters();
    }
    private updateFilters() {
        this.filterScroll = [window.scrollX, window.scrollY];
        void this.router
            .navigate([], {
                relativeTo: this.route,
                queryParams: shopFilterParams({
                    query: this.query,
                    typeId: this.typeId,
                    themeIds: this.themeIds,
                }),
                queryParamsHandling: 'merge',
                preserveFragment: true,
            })
            .then((changed) => {
                if (!changed) this.filterScroll = undefined;
            });
    }
    refresh() {
        return this.catalog.loadShop({
            query: this.query,
            typeId: this.typeId,
            themeIds: this.themeIds,
        });
    }
    loadMore() {
        return this.catalog.loadShop(
            { query: this.query, typeId: this.typeId, themeIds: this.themeIds },
            true,
        );
    }
    clear() {
        clearTimeout(this.searchTimer);
        this.category = 'Todos';
        this.query = '';
        this.typeId = undefined;
        this.themeIds = [];
        this.updateFilters();
    }
}
@Component({
    selector: 'crica-suppliers',
    standalone: true,
    imports: [FiltersComponent, ProductImageComponent, AffiliateCardComponent, DetailsComponent, ThemeFilterComponent],
    template: suppliersTemplate,
})
export class SuppliersComponent implements OnInit, OnDestroy {
    catalog = inject(PublicCatalogService);
    typeIds: string[] = [];
    get supplierTypes() {
        return this.catalog.types().filter(type => type.active && (type.scope === 'suppliers' || type.scope === 'both'));
    }
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
    async shareFeatured(product: AffiliateProduct) {
        const url = this.featuredUrl(product) ?? window.location.href;
        await shareLink(
            product.name,
            `Confira esta indicação da Crica Studio: ${product.name}`,
            url,
        );
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
        clearTimeout(this.searchTimer);
        this.platform = platform;
        void this.refresh();
    }
    selectTypes(ids: string[]) {
        clearTimeout(this.searchTimer);
        this.typeIds = ids;
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
            typeIds: this.typeIds,
        });
    }
    loadMore() {
        return this.catalog.loadAffiliates(
            { query: this.query, platform: this.platform === 'Todos' ? undefined : this.platform, typeIds: this.typeIds },
            true,
        );
    }
    clear() {
        clearTimeout(this.searchTimer);
        this.platform = 'Todos';
        this.typeIds = [];
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
    async shareStorefront(storefront: (typeof SITE_CONFIG.storefronts)[number]) {
        const url = storefront.url ?? window.location.href;
        await shareLink(
            storefront.name,
            `Confira a vitrine da Crica Studio na ${storefront.name}.`,
            url,
        );
    }
}
