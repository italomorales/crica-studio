import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductImageComponent } from './components/shared';
import { PublicCatalogService } from './services/public-catalog.service';
import { buildMessage, validQuantity, whatsappUrl } from './services/contact';
import { priceLabel } from './services/local-store';
import { SeoService } from './services/seo.service';
import { shareLink } from './services/share';
import { productPath } from './services/product-url';
import type { Product } from './data/models';
import productDetailTemplate from './product-detail.html?raw';

@Component({
    selector: 'crica-product-detail',
    standalone: true,
    imports: [FormsModule, RouterLink, ProductImageComponent],
    template: productDetailTemplate,
})
export class ProductDetailComponent {
    readonly catalog = inject(PublicCatalogService);
    private readonly route = inject(ActivatedRoute);
    private readonly seo = inject(SeoService);
    price = priceLabel;
    product?: Product;
    loading = true;
    unavailable = false;
    quantity = 1;
    idea = '';
    preview = false;
    message = '';
    copied = false;
    copyStatus = '';
    imageIndex = 0;
    @ViewChild('messageField') messageField?: ElementRef<HTMLTextAreaElement>;

    constructor() {
        this.route.paramMap.subscribe((params) => void this.load(params.get('slug') || ''));
    }

    get valid() {
        return validQuantity(this.quantity);
    }

    async share() {
        if (!this.product) return;
        const url = new URL(productPath(this.product), window.location.origin).href;
        await shareLink(this.product.name, `Confira este produto da Crica Studio: ${this.product.name}`, url);
    }

    async load(slug: string) {
        this.loading = true;
        this.unavailable = false;
        this.product = undefined;
        this.preview = false;
        this.imageIndex = 0;
        try {
            this.product = await this.catalog.getProduct(slug);
            this.unavailable = !this.product;
            if (this.product) this.seo.setProduct(this.product);
        } catch {
            this.unavailable = true;
        } finally {
            this.loading = false;
        }
    }

    order() {
        if (!this.product || !this.valid) return;
        this.message = buildMessage(this.product.name, this.quantity, this.idea);
        const url = whatsappUrl(this.catalog.whatsappNumber(), this.message);
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }
        this.preview = true;
        this.copied = false;
        this.copyStatus = '';
        setTimeout(() => document.getElementById('contact-title')?.focus());
    }

    async copy() {
        try {
            if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(this.message);
            else {
                this.messageField?.nativeElement.focus();
                this.messageField?.nativeElement.select();
                if (!document.execCommand('copy')) throw new Error('copy');
            }
            this.copied = true;
            this.copyStatus = 'Mensagem copiada. Nenhuma mensagem foi enviada.';
        } catch {
            this.copyStatus = 'Selecione e copie o texto da prévia manualmente.';
            this.messageField?.nativeElement.select();
        }
    }
}
