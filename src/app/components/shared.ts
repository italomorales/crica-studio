import { TranslatePipe, language, setLanguage, LANGUAGE_OPTIONS } from '../services/language';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { currentSiteMarket, publicHomePath } from '../services/site-market';
import headerTemplate from './header.html?raw';
import footerTemplate from './footer.html?raw';
import filtersTemplate from './filters.html?raw';
import productImageTemplate from './product-image.html?raw';

@Component({
    selector: 'crica-header',
    standalone: true,
    imports: [TranslatePipe, RouterLink, RouterLinkActive],
    template: headerTemplate,
})
export class HeaderComponent {
    readonly language = language;
    readonly languages = LANGUAGE_OPTIONS;
    readonly setLanguage = setLanguage;
    readonly showShop = currentSiteMarket() === 'br';
    readonly homePath = publicHomePath();
}
@Component({
    selector: 'crica-footer',
    standalone: true,
    imports: [TranslatePipe, RouterLink],
    template: footerTemplate,
})
export class FooterComponent { readonly homePath = publicHomePath(); }
@Component({
    selector: 'crica-filters',
    standalone: true,
    imports: [TranslatePipe],
    template: filtersTemplate,
})
export class FiltersComponent {
    @Input() options: string[] = [];
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
    imports: [TranslatePipe],
    template: productImageTemplate,
})
export class ProductImageComponent {
    @Input() src?: string;
    @Input() alt = 'Produto';
    @Input() label = 'CRICA / SELEÇÃO';
    failed = false;
    ngOnChanges() {
        this.failed = false;
    }
}
