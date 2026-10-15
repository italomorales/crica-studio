import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, language, localizedPrice } from './services/language';
import { ContentPipe, contentField } from './services/catalog-translations';
import { PublicCatalogService } from './services/public-catalog.service';
import { PlatformService, type CatalogPlatform } from './services/platform.service';
import { currentSiteMarket } from './services/site-market';
import { productPath } from './services/product-url';
import { externalUrl, whatsappUrl } from './services/contact';
import { platformLogo } from './services/platform-logos';
import { BlogApi } from './blog/blog-api';
import { blogPath, type BlogPost, type BlogLocale } from './blog/blog-data';
import { ProductImageComponent } from './components/shared';
import { homeCopy } from './home-copy';
import template from './home.html?raw';
import './home.css';

@Component({
    selector: 'crica-home',
    standalone: true,
    imports: [RouterLink, TranslatePipe, ContentPipe, ProductImageComponent],
    providers: [PublicCatalogService],
    template,
})
export class HomeComponent {
    readonly catalog = inject(PublicCatalogService);
    private readonly blog = inject(BlogApi);
    private readonly platforms = inject(PlatformService);
    readonly showShop = currentSiteMarket() === 'br';
    readonly posts = signal<BlogPost[]>([]);
    readonly storefronts = signal<CatalogPlatform[]>([]);
    readonly newsLoading = signal(true);
    readonly storefrontsLoading = signal(true);
    readonly newsError = signal(false);
    readonly storefrontsError = signal(false);
    readonly products = computed(() =>
        this.selected(this.catalog.featuredProducts(), this.catalog.products(), 3),
    );
    readonly suppliers = computed(() =>
        this.selected(this.catalog.featuredAffiliates(), this.catalog.affiliates(), 3),
    );
    readonly heroImage = '/assets/home-atelier-canecas-bottons-v3.webp';
    readonly price = localizedPrice;
    readonly productPath = productPath;
    readonly platformLogo = platformLogo;
    readonly externalUrl = externalUrl;
    private newsRequest = 0;
    private storefrontRequest = 0;
    constructor() {
        effect(() => {
            const locale = this.locale;
            untracked(() => {
                void this.loadNews(locale);
                void this.loadStorefronts(locale);
                void this.loadSuppliers();
            });
        });
        if (this.showShop) void this.loadShop();
    }
    get locale(): BlogLocale {
        return language() === 'es' ? 'es' : language() === 'en' ? 'en' : 'pt';
    }
    t(key: keyof typeof homeCopy) {
        return homeCopy[key][this.locale === 'en' ? 1 : this.locale === 'es' ? 2 : 0];
    }
    get contactUrl() {
        return whatsappUrl(
            this.catalog.whatsappNumber() || '5511963136152',
            this.t('contactMessage'),
        );
    }
    version(post: BlogPost) {
        return post.versions[this.locale];
    }
    postPath(post: BlogPost) {
        return blogPath(post, this.locale);
    }
    supplierName(product: Parameters<typeof contentField>[0]) {
        return contentField(product, 'name');
    }
    private selected<T extends { id: string }>(featured: T[], items: T[], limit: number): T[] {
        return [...new Map([...featured, ...items].map((item) => [item.id, item])).values()].slice(
            0,
            limit,
        );
    }
    async loadShop() {
        await Promise.all([
            this.catalog.loadFeaturedProducts(),
            this.catalog.loadShop({ query: '' }),
        ]);
    }
    async loadSuppliers() {
        await Promise.all([
            this.catalog.loadFeaturedAffiliates(),
            this.catalog.loadAffiliates({ query: '' }),
        ]);
    }
    async loadNews(locale = this.locale) {
        const request = ++this.newsRequest;
        this.newsLoading.set(true);
        this.newsError.set(false);
        this.posts.set([]);
        try {
            const result = await this.blog.list(false, { locale, page: 1, pageSize: 3 });
            if (request === this.newsRequest)
                this.posts.set(
                    result.items
                        .filter((p) => p.versions[locale]?.status === 'published')
                        .sort((a, b) => Number(b.featured) - Number(a.featured)),
                );
        } catch {
            if (request === this.newsRequest) this.newsError.set(true);
        } finally {
            if (request === this.newsRequest) this.newsLoading.set(false);
        }
    }
    async loadStorefronts(locale = this.locale) {
        const request = ++this.storefrontRequest;
        this.storefrontsLoading.set(true);
        this.storefrontsError.set(false);
        this.storefronts.set([]);
        try {
            const result = await this.platforms.publicPlatforms(
                locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US',
                this.showShop ? 'BR' : locale === 'es' ? 'ES' : 'US',
                true,
                true,
            );
            if (request === this.storefrontRequest)
                this.storefronts.set(
                    result
                        .filter(
                            (p) => p.active && p.status === 'published' && externalUrl(p.url || ''),
                        )
                        .slice(0, 4),
                );
        } catch {
            if (request === this.storefrontRequest) this.storefrontsError.set(true);
        } finally {
            if (request === this.storefrontRequest) this.storefrontsLoading.set(false);
        }
    }
}
