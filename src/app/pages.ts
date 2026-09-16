import { Component, inject, ViewChild } from '@angular/core';
import { PublicCatalogService } from './services/public-catalog.service';
import { normalize } from './services/contact';
import { FiltersComponent } from './components/shared';
import { ProductCardComponent, AffiliateCardComponent } from './components/cards';
import { DetailsComponent } from './components/details';
import shopTemplate from './shop.html?raw';
import suppliersTemplate from './suppliers.html?raw';
import storefrontTemplate from './storefront.html?raw';
import { SITE_CONFIG } from './data/site.config';

@Component({
    selector: 'crica-shop',
    standalone: true,
    imports: [FiltersComponent, ProductCardComponent, DetailsComponent],
    template: shopTemplate,
})
export class ShopComponent {
    catalog = inject(PublicCatalogService);
    category = 'Todos';
    query = '';
    get categories() {
        return ['Todos', ...new Set(this.catalog.products().map((p) => p.category))];
    }
    get filtered() {
        const q = normalize(this.query);
        return this.catalog.products().filter(
            (p) =>
                (this.category === 'Todos' || p.category === this.category) &&
                normalize(p.name + ' ' + p.description).includes(q),
        );
    }
    clear() {
        this.category = 'Todos';
        this.query = '';
    }
}
@Component({
    selector: 'crica-suppliers',
    standalone: true,
    imports: [FiltersComponent, AffiliateCardComponent, DetailsComponent],
    template: suppliersTemplate,
})
export class SuppliersComponent {
    catalog = inject(PublicCatalogService);
    platform = 'Todos';
    query = '';
    get filtered() {
        const q = normalize(this.query);
        return this.catalog.affiliates().filter(
            (p) =>
                (this.platform === 'Todos' || p.platform === this.platform) &&
                normalize(p.name).includes(q),
        );
    }
    clear() {
        this.platform = 'Todos';
        this.query = '';
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
