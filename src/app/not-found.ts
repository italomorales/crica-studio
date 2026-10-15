import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from './services/language';

@Component({selector:'crica-not-found',standalone:true,imports:[RouterLink,TranslatePipe],template:`
    <main id="main" class="container" style="padding-block:80px;min-height:50vh">
        <span class="eyebrow">404</span><h1>{{ 'Esta página não foi encontrada.' | translate }}</h1>
        <p style="margin-block:24px">{{ 'Você pode continuar explorando a Crica.' | translate }}</p>
        <a class="home-button" routerLink="/">{{ 'Voltar para a Home' | translate }}</a>
    </main>`})
export class NotFoundComponent {}
