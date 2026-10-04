import { ContentPipe, contentField } from '../services/catalog-translations';
import { TranslatePipe, translate, localizedPrice } from '../services/language';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { Product, AffiliateProduct } from '../data/models';
import { ProductImageComponent } from './shared';
import { SITE_CONFIG } from '../data/site.config';
import { externalUrl } from '../services/contact';
import { shareLink } from '../services/share';
import productCardTemplate from './product-card.html?raw';
import affiliateCardTemplate from './affiliate-card.html?raw';

@Component({
    selector: 'crica-product-card',
    standalone: true,
    imports: [ContentPipe, TranslatePipe, ProductImageComponent],
    template: productCardTemplate,
})
export class ProductCardComponent {
    price = localizedPrice;
    @Input({ required: true }) product!: Product;
    @Output() details = new EventEmitter<Product>();
    @Output() order = new EventEmitter<Product>();
}
@Component({
    selector: 'crica-affiliate-card',
    standalone: true,
    imports: [ContentPipe, TranslatePipe, ProductImageComponent],
    template: affiliateCardTemplate,
})
export class AffiliateCardComponent {
    @Input({ required: true }) product!: AffiliateProduct;
    @Output() demo = new EventEmitter<AffiliateProduct>();
    get url() {
        return externalUrl(SITE_CONFIG.affiliateLinks[this.product.id] ?? this.product.url);
    }
    get preposition() {
        return this.product.platform === 'Shopee' ? 'na' : 'no';
    }
    async share() {
        const url = this.url ?? window.location.href;
        await shareLink(contentField(this.product,"name"), translate('Confira esta indicação da Crica Studio: {name}', {name: contentField(this.product,"name")}), url);
    }
}
