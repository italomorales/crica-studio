import {Component,Input,Output,EventEmitter} from '@angular/core';
import {RouterLink,RouterLinkActive} from '@angular/router';
@Component({selector:'crica-header',standalone:true,imports:[RouterLink,RouterLinkActive],template:`
<a class="skip" href="#main">Pular para o conteúdo</a><header class="site-header"><div class="container header-inner">
<a routerLink="/loja" aria-label="Crica Studio — Loja Crica" class="brand"><img src="/assets/crica-studio-logo.png" alt="Crica Studio" width="140" height="76"></a>
<nav aria-label="Navegação principal"><a routerLink="/loja" routerLinkActive="active" ariaCurrentWhenActive="page">Loja Crica</a><a routerLink="/fornecedores" routerLinkActive="active" ariaCurrentWhenActive="page">Fornecedores</a></nav>
<span class="header-note">Ideias que ganham forma.</span></div></header>`})
export class HeaderComponent {}
@Component({selector:'crica-footer',standalone:true,imports:[RouterLink],template:`<footer><div class="container footer-inner"><a routerLink="/loja" aria-label="Crica Studio — início"><img src="/assets/crica-studio-logo.png" alt="Crica Studio" width="140" height="76"></a><p>Ideias que ganham forma.</p><span>Catálogo demonstrativo · Imagens ilustrativas</span><a class="admin-entry" routerLink="/login">Administração</a></div></footer>`})
export class FooterComponent{}
@Component({selector:'crica-filters',standalone:true,template:`<div class="filterbar"><div class="chips" [attr.aria-label]="label" role="group">@for(option of options;track option){<button type="button" [class.selected]="selected===option" [attr.aria-pressed]="selected===option" (click)="selection.emit(option)">{{option}}</button>}</div><label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span class="sr-only">{{searchLabel}}</span><input type="search" [placeholder]="searchLabel" [value]="query" (input)="search.emit($any($event.target).value)"></label></div>`})
export class FiltersComponent{
 @Input()options:string[]=[];@Input()selected='Todos';@Input()query='';@Input()label='Categorias';@Input()searchLabel='Buscar produtos';
 @Output()selection=new EventEmitter<string>();@Output()search=new EventEmitter<string>();
}
@Component({selector:'crica-product-image',standalone:true,template:`<div class="product-visual">@if(src&&!failed){<img [src]="src" [alt]="alt+' — imagem ilustrativa'" (error)="failed=true" loading="lazy" width="640" height="640">}@else{<div class="image-placeholder"><span>{{label}}</span><small>Imagem em preparação</small></div>}</div>`})
export class ProductImageComponent{@Input()src?:string;@Input()alt='Produto';@Input()label='CRICA / SELEÇÃO';failed=false;ngOnChanges(){this.failed=false;}}
