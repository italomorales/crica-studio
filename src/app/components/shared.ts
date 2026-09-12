import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import headerTemplate from './header.html?raw';
import footerTemplate from './footer.html?raw';
import filtersTemplate from './filters.html?raw';
import productImageTemplate from './product-image.html?raw';

@Component({
    selector: 'crica-header',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    template: headerTemplate,
})
export class HeaderComponent {}
@Component({
    selector: 'crica-footer',
    standalone: true,
    imports: [RouterLink],
    template: footerTemplate,
})
export class FooterComponent {}
@Component({
    selector: 'crica-filters',
    standalone: true,
    template: filtersTemplate,
})
export class FiltersComponent {
    @Input() options: string[] = [];
    @Input() selected = 'Todos';
    @Input() query = '';
    @Input() label = 'Categorias';
    @Input() searchLabel = 'Buscar produtos';
    @Output() selection = new EventEmitter<string>();
    @Output() search = new EventEmitter<string>();
}
@Component({
    selector: 'crica-product-image',
    standalone: true,
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
