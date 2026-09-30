import { Component, ElementRef, ViewChild, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductImageComponent } from './components/shared';
import { PublicCatalogService } from './services/public-catalog.service';
import { buildMessage, validQuantity, whatsappUrl } from './services/contact';
import { trackWhatsAppClick } from './services/whatsapp-tracking';
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
export class ProductDetailComponent implements OnDestroy {
    readonly catalog = inject(PublicCatalogService);
    private readonly route = inject(ActivatedRoute);
    private readonly seo = inject(SeoService);
    price = priceLabel;
    product?: Product;
    loading = true;
    showSkeleton = false;
    loadError = false;
    private loadRequest = 0;
    private skeletonTimer?: ReturnType<typeof setTimeout>;
    unavailable = false;
    quantity = 1;
    idea = '';
    preview = false;
    message = '';
    copied = false;
    copyStatus = '';
    imageIndex = 0;
    @ViewChild('messageField') messageField?: ElementRef<HTMLTextAreaElement>;

    private routeSubscription = this.route.paramMap.subscribe((params) => void this.load(params.get('slug') || ''));

    ngOnDestroy() {
        this.routeSubscription.unsubscribe();
        clearTimeout(this.skeletonTimer);
        ++this.loadRequest;
    }

    retry() {
        void this.load(this.route.snapshot.paramMap.get('slug') || '');
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
        const request = ++this.loadRequest;
        clearTimeout(this.skeletonTimer);
        this.product = this.catalog.cachedProduct(slug);
        this.loading = !this.product;
        this.showSkeleton = false;
        this.loadError = false;
        this.unavailable = false;
        this.preview = false;
        this.imageIndex = 0;
        this.quantity = 1;
        this.idea = '';
        if (this.product) this.seo.setProduct(this.product);
        else this.skeletonTimer = setTimeout(() => {
            if (request === this.loadRequest) this.showSkeleton = true;
        }, 200);
        try {
            const product = await this.catalog.getProduct(slug);
            if (request !== this.loadRequest) return;
            const selectedImage = this.product?.images[this.imageIndex];
            this.product = product;
            this.imageIndex = Math.max(0, product?.images.indexOf(selectedImage || '') ?? 0);
            this.unavailable = !this.product;
            if (this.product) this.seo.setProduct(this.product);
        } catch {
            if (request !== this.loadRequest) return;
            // Preserve the visible product during a temporary connection failure.
            this.loadError = !this.product;
        } finally {
            if (request === this.loadRequest) {
                clearTimeout(this.skeletonTimer);
                this.showSkeleton = false;
                this.loading = false;
            }
        }
    }

    order() {
        if (!this.product || !this.valid) return;
        this.message = buildMessage(this.product.name, this.quantity, this.idea);
        const url = whatsappUrl(this.catalog.whatsappNumber(), this.message);
        if (url) {
            trackWhatsAppClick(url, { source: 'product', productId: this.product.id, quantity: this.quantity });
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
