import { Component, ViewChild, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Product, AffiliateProduct } from '../data/models';
import { ProductImageComponent } from './shared';
import { buildMessage, validQuantity, whatsappUrl } from '../services/contact';
import { PublicCatalogService } from '../services/public-catalog.service';
import { priceLabel } from '../services/local-store';
import detailsTemplate from './details.html?raw';

@Component({
    selector: 'crica-details',
    standalone: true,
    imports: [FormsModule, ProductImageComponent],
    template: detailsTemplate,
})
export class DetailsComponent {
    catalog = inject(PublicCatalogService);
    price = priceLabel;
    @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
    @ViewChild('messageField') messageField?: ElementRef<HTMLTextAreaElement>;
    product?: Product;
    affiliate?: AffiliateProduct;
    quantity = 1;
    idea = '';
    preview = false;
    message = '';
    copied = false;
    copyStatus = '';
    imageIndex = 0;
    private origin?: HTMLElement;
    get valid() {
        return validQuantity(this.quantity);
    }
    open(product: Product, order = false) {
        this.origin = document.activeElement as HTMLElement;
        this.product = product;
        this.affiliate = undefined;
        this.quantity = 1;
        this.idea = '';
        this.preview = false;
        this.copied = false;
        this.copyStatus = '';
        this.imageIndex = 0;
        this.dialog.nativeElement.showModal();
        document.body.style.overflow = 'hidden';
        if (order) this.order();
    }
    openAffiliate(product: AffiliateProduct) {
        this.origin = document.activeElement as HTMLElement;
        this.product = undefined;
        this.affiliate = product;
        this.dialog.nativeElement.showModal();
        document.body.style.overflow = 'hidden';
    }
    order() {
        if (!this.product || !this.valid) return;
        this.message = buildMessage(this.product.name, this.quantity, this.idea);
        const url = whatsappUrl(this.catalog.whatsappNumber(), this.message);
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            this.preview = true;
            this.copied = false;
            this.copyStatus = '';
            setTimeout(() =>
                this.dialog.nativeElement.querySelector<HTMLElement>('#contact-title')?.focus(),
            );
        }
    }
    async copy() {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(this.message);
            } else {
                const field = this.messageField?.nativeElement;
                field?.focus();
                field?.select();
                if (!document.execCommand('copy')) throw new Error('copy');
            }
            this.copied = true;
            this.copyStatus = 'Mensagem copiada. Nenhuma mensagem foi enviada.';
        } catch {
            this.copyStatus = 'Selecione e copie o texto da prévia manualmente.';
            this.messageField?.nativeElement.select();
        }
    }
    backdrop(event: MouseEvent) {
        if (event.target !== this.dialog.nativeElement) return;
        const r = this.dialog.nativeElement.getBoundingClientRect();
        if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
        )
            this.close();
    }
    trapFocus(event: KeyboardEvent) {
        if (event.key !== 'Tab') return;
        const items = Array.from(
            this.dialog.nativeElement.querySelectorAll<HTMLElement>(
                'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
            ),
        ).filter((el) => el.getClientRects().length > 0);
        const first = items[0],
            last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    }
    close() {
        this.dialog.nativeElement.close();
        this.restore();
    }
    restore() {
        document.body.style.overflow = '';
        this.origin?.focus();
    }
}
