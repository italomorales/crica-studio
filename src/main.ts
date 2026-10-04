import '@angular/compiler';
import { TranslatePipe, translate, initializeLanguage } from './app/services/language';
import 'zone.js';

import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet, withInMemoryScrolling } from '@angular/router';
import { HeaderComponent, FooterComponent } from './app/components/shared';
import { ShopComponent, SuppliersComponent, StorefrontComponent } from './app/pages';
import { ProductDetailComponent } from './app/product-detail';
import './styles.css';
import './admin.css';
import { LoginComponent } from './app/admin/login';
import type { AdminComponent } from './app/admin/admin';
import { authGuard } from './app/services/auth.service';
import { ConstructionComponent } from './app/construction';
import { SeoService } from './app/services/seo.service';
import { whatsappUrl } from './app/services/contact';
import { installWhatsAppTracking } from './app/services/whatsapp-tracking';
import appTemplate from './app.html?raw';
import { currentSiteMarket, publicHomePath } from './app/services/site-market';

const shopGuard = () =>
    currentSiteMarket() === 'international' ? inject(Router).parseUrl('/fornecedores') : true;

@Component({
    selector: 'crica-app',
    standalone: true,
    imports: [TranslatePipe, RouterOutlet, HeaderComponent, FooterComponent, ConstructionComponent],
    template: appTemplate,
})
class AppComponent {
    readonly seo = inject(SeoService);
    readonly showConstruction = false;

    router = inject(Router);
    get floatingWhatsappUrl() {
        const path = this.router.url.split(/[?#]/)[0];
        const context =
            path === '/fornecedores'
                ? 'Estou vendo as indicações de fornecedores no site'
                : path === '/vitrine'
                  ? 'Estou vendo as vitrines no site'
                  : 'Estou vendo os produtos personalizados no site';
        return whatsappUrl(
            '5511963136152',
            translate(`Olá! ${context} da Crica Studio e gostaria de tirar uma dúvida.`),
        );
    }
    get isAdmin() {
        return this.router.url.startsWith('/admin') || this.router.url.startsWith('/login');
    }
}
installWhatsAppTracking();
initializeLanguage()
    .then(() =>
        bootstrapApplication(AppComponent, {
            providers: [
                provideRouter(
                    [
                        { path: '', redirectTo: publicHomePath().slice(1), pathMatch: 'full' },
                        {
                            path: 'loja',
                            canMatch: [shopGuard],
                            component: ShopComponent,
                        },
                        {
                            path: 'loja/:slug',
                            canMatch: [shopGuard],
                            component: ProductDetailComponent,
                        },
                        {
                            path: 'fornecedores',
                            component: SuppliersComponent,
                        },
                        {
                            path: 'vitrine',
                            component: StorefrontComponent,
                        },
                        {
                            path: 'login',
                            component: LoginComponent,
                            title: 'Entrar | Crica Studio',
                        },
                        { path: 'admin', redirectTo: 'admin/loja', pathMatch: 'full' },
                        {
                            path: 'admin/marketplaces',
                            redirectTo: 'admin/plataformas',
                            pathMatch: 'full',
                        },
                        {
                            path: 'admin/vitrines',
                            redirectTo: 'admin/plataformas',
                            pathMatch: 'full',
                        },
                        ...[
                            'loja',
                            'fornecedores',
                            'tipos',
                            'temas',
                            'plataformas',
                            'idiomas',
                            'configuracoes',
                        ].map((section) => ({
                            path: 'admin/' + section,
                            loadComponent: () =>
                                import('./app/admin/admin').then((module) => module.AdminComponent),
                            canActivate: [authGuard],
                            canDeactivate: [(component: AdminComponent) => component.canLeave()],
                            data: { section },
                            title: 'Administração | Crica Studio',
                        })),
                        { path: '**', redirectTo: publicHomePath().slice(1) },
                    ],
                    withInMemoryScrolling({
                        scrollPositionRestoration: 'enabled',
                        anchorScrolling: 'enabled',
                    }),
                ),
            ],
        }),
    )
    .catch(console.error);
