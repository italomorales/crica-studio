import { Component, ViewChild, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Product, AffiliateProduct } from '../data/models';
import { ProductImageComponent } from './shared';
import { buildMessage, validQuantity, whatsappUrl } from '../services/contact';
import { CatalogService } from '../services/catalog.service';
import { priceLabel } from '../services/local-store';
@Component({
  selector: 'crica-details',
  standalone: true,
  imports: [FormsModule, ProductImageComponent],
  template: ` <dialog
    #dialog
    class="detail-dialog"
    aria-labelledby="detail-title"
    (keydown)="trapFocus($event)"
    (cancel)="close()"
    (click)="backdrop($event)"
    (close)="restore()"
  >
    <div class="dialog-shell">
      <button
        type="button"
        class="close-button"
        aria-label="Fechar detalhes"
        (click)="close()"
        autofocus
      >
        ×
      </button>
      @if (product) {
        <div class="detail-grid">
          <div class="detail-photo">
            <crica-product-image [src]="product.images[imageIndex]" [alt]="product.name" /><small
              >Imagem ilustrativa · Modelo de demonstração</small
            >
            @if (product.images.length > 1) {
              <div class="thumbs">
                @for (src of product.images; track src; let i = $index) {
                  <button [attr.aria-label]="'Ver imagem ' + (i + 1)" (click)="imageIndex = i">
                    <img [src]="src" alt="" />
                  </button>
                }
              </div>
            }
          </div>
          <div class="detail-content">
            <span class="eyebrow category">{{ product.category }}</span>
            <h2 id="detail-title">{{ product.name }}</h2>
            <p>{{ product.fullDescription || product.description }}</p>
            <strong class="consult">{{ price(product) }}</strong>
            @if (!preview) {
              <div class="detail-info">
                <h3>Sobre o modelo</h3>
                <ul>
                  @for (item of product.characteristics; track item) {
                    <li>{{ item }}</li>
                  }
                </ul>
                <h3>Possibilidades de personalização</h3>
                <p>{{ product.personalization.join(' · ') }}</p>
                <small
                  >Materiais, medidas, cores e disponibilidade serão confirmados no
                  atendimento.</small
                >
              </div>
              <form (ngSubmit)="order()">
                <label for="quantity">Quantidade desejada</label
                ><input
                  id="quantity"
                  name="quantity"
                  class="quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  [(ngModel)]="quantity"
                  [attr.aria-invalid]="!valid"
                  aria-describedby="quantity-hint"
                /><small id="quantity-hint">Informe um número inteiro a partir de 1.</small
                ><label for="idea">Conte sua ideia <span>(opcional)</span></label
                ><textarea
                  id="idea"
                  name="idea"
                  maxlength="1500"
                  rows="3"
                  placeholder="Uma frase, uma ocasião, as cores que você imagina…"
                  [(ngModel)]="idea"
                ></textarea
                ><button class="primary full" type="submit" [disabled]="!valid">
                  Pedir pelo WhatsApp <span aria-hidden="true">↗</span>
                </button>
              </form>
            } @else {
              <section class="message-preview" aria-labelledby="contact-title">
                <span class="demo-badge">Contato em configuração</span>
                <h3 id="contact-title" tabindex="-1">Sua ideia já tem um começo.</h3>
                <p>
                  O WhatsApp da Crica ainda está em configuração. Você pode copiar a mensagem abaixo
                  para guardar seu pedido de orçamento.
                </p>
                <label for="message">Prévia da mensagem</label
                ><textarea #messageField id="message" rows="6" readonly [value]="message"></textarea
                ><button type="button" class="primary full" (click)="copy()">
                  {{ copied ? 'Mensagem copiada' : 'Copiar mensagem' }}
                </button>
                <p class="copy-status" role="status">{{ copyStatus }}</p>
                <button class="secondary full" (click)="preview = false">
                  Voltar aos detalhes
                </button>
              </section>
            }
          </div>
        </div>
      }
      @if (affiliate) {
        <div class="affiliate-dialog">
          <span class="demo-badge">Indicação de demonstração</span>
          <h2 id="detail-title">{{ affiliate.name }}</h2>
          <p>
            O link deste produto na plataforma {{ affiliate.platform }} ainda não foi configurado.
          </p>
          <p>
            Quando estiver disponível, você poderá abrir o anúncio e concluir a compra diretamente
            na plataforma indicada.
          </p>
          <button class="primary" (click)="close()">Voltar às indicações</button>
        </div>
      }
    </div>
  </dialog>`,
})
export class DetailsComponent {
  catalog = inject(CatalogService);
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
    const url = whatsappUrl(this.catalog.whatsappNumber, this.message);
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
