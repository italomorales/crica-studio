import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { Product, AffiliateProduct } from '../data/models';
import { ProductImageComponent } from './shared';
import { SITE_CONFIG } from '../data/site.config';
import { priceLabel } from '../services/local-store';
import { externalUrl } from '../services/contact';
import productCardTemplate from './product-card.html?raw';
import affiliateCardTemplate from './affiliate-card.html?raw';

@Component({
    selector: 'crica-product-card',
    standalone: true,
    imports: [ProductImageComponent],
    template: productCardTemplate,
})
export class ProductCardComponent {
    price = priceLabel;
    @Input({ required: true }) product!: Product;
    @Output() details = new EventEmitter<Product>();
    @Output() order = new EventEmitter<Product>();
}
@Component({
    selector: 'crica-affiliate-card',
    standalone: true,
    imports: [ProductImageComponent],
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
        const text = `Confira esta indicação da Crica Studio: ${this.product.name}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: this.product.name, text, url });
            } catch {
                // Cancelar o painel de compartilhamento não exige nenhuma ação adicional.
            }
            return;
        }
        window.open(
            `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
            '_blank',
            'noopener,noreferrer',
        );
    }
}
