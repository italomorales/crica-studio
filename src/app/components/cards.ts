import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { Product, AffiliateProduct } from '../data/models';
import { ProductImageComponent } from './shared';
import { SITE_CONFIG } from '../data/site.config';
import { priceLabel } from '../services/local-store';
import { externalUrl } from '../services/contact';
@Component({
  selector: 'crica-product-card',
  standalone: true,
  imports: [ProductImageComponent],
  template: `<article class="product-card">
    <button
      class="image-button"
      type="button"
      (click)="details.emit(product)"
      [attr.aria-label]="'Ver detalhes de ' + product.name"
    >
      <crica-product-image [src]="product.images[0]" [alt]="product.name" /><span
        class="image-link"
        aria-hidden="true"
        >↗</span
      >
    </button>
    <div class="card-body">
      <span class="eyebrow category">{{ product.category }}</span>
      <h3>
        <button (click)="details.emit(product)">{{ product.name }}</button>
      </h3>
      <p>{{ product.description }}</p>
      <div class="card-bottom">
        <span class="price">{{ price(product) }}</span
        ><button class="text-action" (click)="order.emit(product)">
          Pedir pelo WhatsApp <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  </article>`,
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
  template: `<article class="product-card affiliate-card">
    <crica-product-image [src]="product.image" [alt]="product.name" [label]="product.category" />
    <div class="card-body">
      <span
        class="platform"
        [class.shopee]="product.platform === 'Shopee'"
        [class.mercado]="product.platform === 'Mercado Livre'"
        >{{ product.platform }}</span
      >
      <h3>{{ product.name }}</h3>
      <p>{{ product.description }}</p>
      @if (url) {
        <a class="text-action" [href]="url" target="_blank" rel="sponsored noopener noreferrer"
          >Ver {{ preposition }} {{ product.platform }} <span aria-hidden="true">↗</span
          ><span class="sr-only"> (link de afiliado, abre em nova aba)</span></a
        >
      } @else {
        <button class="text-action" (click)="demo.emit(product)">
          Ver {{ preposition }} {{ product.platform }} <span aria-hidden="true">↗</span>
        </button>
      }
    </div>
  </article>`,
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
}
