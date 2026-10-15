import { ContentPipe, contentField } from '../services/catalog-translations';
import { TranslatePipe, language, setLanguage, availableLanguages, languageFlag } from '../services/language';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { currentSiteMarket, publicHomePath } from '../services/site-market';
import headerTemplate from './header.html?raw';
import footerTemplate from './footer.html?raw';
import filtersTemplate from './filters.html?raw';
import productImageTemplate from './product-image.html?raw';

@Component({
    selector: 'crica-header',
    standalone: true,
    imports: [ContentPipe, TranslatePipe, RouterLink, RouterLinkActive],
    template: headerTemplate,
})
export class HeaderComponent {
    readonly showShop = currentSiteMarket() === 'br';
    readonly homePath = publicHomePath();
    @ViewChild('mobileMenu', { static: true }) mobileMenu!: ElementRef<HTMLDialogElement>;
    readonly links = [
        { path: '/', label: 'Home', detail: 'O universo Crica começa aqui' },
        { path: '/blog', label: 'News', detail: 'Histórias e ideias para inspirar' },
        ...(this.showShop ? [{ path: '/loja', label: 'Loja', detail: 'Presentes com a sua essência' }] : []),
        { path: '/fornecedores', label: 'Fornecedores', detail: 'Achadinhos para suas criações' },
        { path: '/vitrine', label: 'Vitrines', detail: 'A Crica nas suas plataformas favoritas' },
    ];
    openMenu() { this.mobileMenu.nativeElement.showModal(); }
    closeMenu() { this.mobileMenu.nativeElement.close(); }
    onBackdrop(event: MouseEvent) { if (event.target === this.mobileMenu.nativeElement) this.closeMenu(); }
}
@Component({
    selector: 'crica-footer',
    standalone: true,
    imports: [ContentPipe, TranslatePipe, RouterLink],
    template: footerTemplate,
})
export class FooterComponent {
    readonly language = language;
    get languages() { return availableLanguages(); }
    readonly languageFlag=languageFlag;
    readonly setLanguage = setLanguage;
    readonly homePath = publicHomePath();
}
@Component({
    selector: 'crica-filters',
    standalone: true,
    imports: [ContentPipe, TranslatePipe],
    template: filtersTemplate,
})
export class FiltersComponent {
    @Input() options: string[] = [];
    @Input() optionLabels: Record<string,string> = {};
    @Input() selected = 'Todos';
    @Input() query = '';
    @Input() label = 'Categorias';
    @Input() searchLabel = 'Buscar produtos';
    @Output() selection = new EventEmitter<string>();
    @Output() queryChange = new EventEmitter<string>();
}
@Component({
    selector: 'crica-product-image',
    standalone: true,
    imports: [ContentPipe, TranslatePipe],
    template: productImageTemplate,
})
export class ProductImageComponent {
    @Input() src?: string;
    @Input() alt = 'Produto';
    @Input() label = 'CRICA / SELEÇÃO';
    @Input() loading: 'lazy' | 'eager' = 'lazy';
    failed = false;
    ngOnChanges() {
        this.failed = false;
    }
}
