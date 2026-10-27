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
import './app/components/navigation.css';
import './admin.css';
import { LoginComponent } from './app/admin/login';
import type { AdminComponent } from './app/admin/admin';
import { authGuard } from './app/services/auth.service';
import { ConstructionComponent } from './app/construction';
import { SeoService } from './app/services/seo.service';
import { whatsappUrl } from './app/services/contact';
import { installWhatsAppTracking } from './app/services/whatsapp-tracking';
import { installStatisticClickTracking } from './app/services/statistics';
import appTemplate from './app.html?raw';
import { currentSiteMarket, publicHomePath } from './app/services/site-market';
import { HomeComponent } from './app/home';
import { NotFoundComponent } from './app/not-found';
import { resolveBlogArticle } from './app/blog/blog-article-resolver';

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
installStatisticClickTracking();
initializeLanguage()
    .then(() =>
        bootstrapApplication(AppComponent, {
            providers: [
                provideRouter(
                    [
                        { path: '', component: HomeComponent, pathMatch: 'full' },
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
                        { path: 'blog', loadComponent: () => import('./app/blog/blog-public').then(module => module.BlogPublicComponent) },
                        { path: 'blog/:locale/:slug', resolve: { article: resolveBlogArticle }, runGuardsAndResolvers: 'paramsOrQueryParamsChange', loadComponent: () => import('./app/blog/blog-public').then(module => module.BlogPublicComponent) },
                        { path: 'admin/estatisticas', canActivate: [authGuard], loadComponent: () => import('./app/admin/statistics-page').then(module => module.StatisticsPageComponent), title: 'Estatísticas | Crica Studio' },
                        { canActivate: [authGuard], path: 'admin/blog/autores', loadComponent: () => import('./app/blog/blog-author-admin').then(module => module.BlogAuthorAdminComponent) },
                        { canActivate: [authGuard], path: 'admin/blog/categorias', loadComponent: () => import('./app/blog/blog-admin').then(module => module.BlogAdminComponent), data: { mode: 'categories' } },
                        { canActivate: [authGuard], path: 'admin/blog/comentarios', loadComponent: () => import('./app/blog/blog-admin').then(module => module.BlogAdminComponent), data: { mode: 'moderation' } },
                        { canActivate: [authGuard], path: 'admin/blog/editar/:id', loadComponent: () => import('./app/blog/blog-admin').then(module => module.BlogAdminComponent), data: { mode: 'edit' } },
                        { canActivate: [authGuard], path: 'admin/blog', loadComponent: () => import('./app/blog/blog-admin').then(module => module.BlogAdminComponent), data: { mode: 'list' } },
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
                        { path: '**', component: NotFoundComponent },
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
