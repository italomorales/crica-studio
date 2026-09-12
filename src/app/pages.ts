import { Component, inject, ViewChild } from '@angular/core';
import { CatalogService } from './services/catalog.service';
import { normalize } from './services/contact';
import { FiltersComponent } from './components/shared';
import { ProductCardComponent, AffiliateCardComponent } from './components/cards';
import { DetailsComponent } from './components/details';
@Component({
  selector: 'crica-shop',
  standalone: true,
  imports: [FiltersComponent, ProductCardComponent, DetailsComponent],
  template: ` <main id="main">
      <section class="hero container">
        <div class="hero-copy">
          <span class="eyebrow hero-kicker"><i></i> PERSONALIZADOS COM A SUA ESSÊNCIA</span>
          <h1>Sua ideia merece<br /><span>ganhar forma.</span></h1>
          <p>
            Criamos canecas e bottons personalizados para pessoas, empresas e eventos. Você traz a
            ideia. A gente cria com você.
          </p>
          <a class="primary" href="#catalogo"
            >Explorar produtos <span aria-hidden="true">↓</span></a
          >
        </div>
        <div class="hero-art">
          <img
            src="/assets/hero.webp"
            alt="Caneca com estampa botânica — composição ilustrativa"
            width="640"
            height="640"
          /><span class="hero-label">Feito para você.</span
          ><span class="hero-caption">Sua arte. Seu jeito.</span>
        </div>
      </section>
      <section id="catalogo" class="catalog container" aria-labelledby="catalog-title">
        <div class="section-heading">
          <div>
            <span class="eyebrow">LOJA CRICA</span>
            <h2 id="catalog-title">Escolha o começo da sua ideia.</h2>
          </div>
          <span class="demo-note"><i></i> Catálogo demonstrativo</span>
        </div>
        <crica-filters
          [options]="categories"
          [selected]="category"
          [query]="query"
          (selection)="category = $event"
          (search)="query = $event"
        />
        <div class="results-row">
          <p aria-live="polite">
            {{ filtered.length }} {{ filtered.length === 1 ? 'modelo' : 'modelos' }} para
            personalizar
          </p>
          @if (query || category !== 'Todos') {
            <button class="clear" (click)="clear()">Limpar filtros ×</button>
          }
        </div>
        <div class="product-grid">
          @for (product of filtered; track product.id) {
            <crica-product-card
              [product]="product"
              (details)="details.open($event)"
              (order)="details.open($event, true)"
            />
          } @empty {
            <div class="empty">
              <h3>Nenhum produto encontrado</h3>
              <p>Tente outra palavra ou explore todos os modelos.</p>
              <button class="secondary" (click)="clear()">Limpar filtros</button>
            </div>
          }
        </div>
        <p class="catalog-note">
          As estampas são exemplos ilustrativos. Sua ideia é o ponto de partida para a
          personalização.
        </p>
      </section>
      <section class="how-section">
        <div class="container">
          <div class="how-title">
            <span class="eyebrow">DO SEU JEITO, EM TRÊS PASSOS</span>
            <h2>Vamos criar juntos?</h2>
          </div>
          <div class="steps">
            <article>
              <span>01</span>
              <h3>Escolha seu modelo</h3>
              <p>Encontre a caneca ou o botton que combina com o que você imagina.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Conte sua ideia</h3>
              <p>Converse com a Crica pelo WhatsApp sobre a arte e a quantidade.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Combine os detalhes</h3>
              <p>Confirme as possibilidades, o orçamento e os próximos passos no atendimento.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
    <crica-details #details />`,
})
export class ShopComponent {
  catalog = inject(CatalogService);
  category = 'Todos';
  query = '';
  get categories() {
    return ['Todos', ...new Set(this.catalog.products.map((p) => p.category))];
  }
  get filtered() {
    const q = normalize(this.query);
    return this.catalog.products.filter(
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
  template: `<main id="main" class="suppliers container">
      <section class="supplier-intro">
        <span class="eyebrow"><i></i> PARA QUEM TAMBÉM CRIA</span>
        <h1>Fornecedores<span class="small-lime"></span></h1>
        <h2>Materiais e produtos indicados pela Crica</h2>
        <p>
          Explore materiais, embalagens e acessórios para suas ideias. <br />Aqui, a compra acontece
          em outras plataformas.
        </p>
      </section>
      <aside class="affiliate-notice">
        <span aria-hidden="true">↗</span>
        <p>
          Esta página contém links de afiliado. Podemos receber comissão pelas compras realizadas
          por esses links. A compra acontece na plataforma indicada.
        </p>
      </aside>
      <section aria-label="Produtos indicados">
        <crica-filters
          [options]="['Todos', 'Shopee', 'Mercado Livre', 'TikTok Shop', 'AliExpress', 'Outra']"
          label="Plataformas"
          searchLabel="Buscar indicações"
          [selected]="platform"
          [query]="query"
          (selection)="platform = $event"
          (search)="query = $event"
        />
        <div class="results-row">
          <p aria-live="polite">
            {{ filtered.length }} {{ filtered.length === 1 ? 'indicação' : 'indicações' }}
          </p>
          <span class="demo-note">Seleção demonstrativa</span>
          @if (query || platform !== 'Todos') {
            <button class="clear" (click)="clear()">Limpar filtros ×</button>
          }
        </div>
        <div class="product-grid suppliers-grid">
          @for (product of filtered; track product.id) {
            <crica-affiliate-card [product]="product" (demo)="details.openAffiliate($event)" />
          } @empty {
            <div class="empty">
              <h3>Nenhum produto encontrado</h3>
              <p>Tente outro nome ou escolha outra plataforma.</p>
              <button class="secondary" (click)="clear()">Limpar filtros</button>
            </div>
          }
        </div>
        <p class="catalog-note">
          Seleção demonstrativa. Consulte condições e disponibilidade na plataforma indicada.
        </p>
      </section>
    </main>
    <crica-details #details />`,
})
export class SuppliersComponent {
  catalog = inject(CatalogService);
  platform = 'Todos';
  query = '';
  get filtered() {
    const q = normalize(this.query);
    return this.catalog.affiliates.filter(
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
