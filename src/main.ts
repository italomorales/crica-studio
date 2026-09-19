import 'zone.js';
import '@angular/compiler';
import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet, withInMemoryScrolling } from '@angular/router';
import { HeaderComponent, FooterComponent } from './app/components/shared';
import { ShopComponent, SuppliersComponent, StorefrontComponent } from './app/pages';
import './styles.css';
import './admin.css';
import { LoginComponent } from './app/admin/login';
import { AdminComponent, unsavedGuard } from './app/admin/admin';
import { authGuard } from './app/services/auth.service';
import { ConstructionComponent } from './app/construction';
import { SeoService } from './app/services/seo.service';
import { whatsappUrl } from './app/services/contact';
import appTemplate from './app.html?raw';

@Component({
    selector: 'crica-app',
    standalone: true,
    imports: [RouterOutlet, HeaderComponent, FooterComponent, ConstructionComponent],
    template: appTemplate,
})
class AppComponent {
    readonly seo = inject(SeoService);
    // Keep the public routes available in production. The temporary landing page can be enabled
    // only for an intentional deployment with VITE_SHOW_CONSTRUCTION=true.
    // readonly showConstruction = import.meta.env.VITE_SHOW_CONSTRUCTION === 'true';
    readonly showConstruction = false;
    
    router = inject(Router);
    get floatingWhatsappUrl() {
        const path = this.router.url.split(/[?#]/)[0];
        const context = path === '/fornecedores'
            ? 'Estou vendo as indicações de fornecedores no site'
            : path === '/vitrine'
              ? 'Estou vendo as vitrines no site'
              : 'Estou vendo os produtos personalizados no site';
        return whatsappUrl('5511963136152', `Olá! ${context} da Crica Studio e gostaria de tirar uma dúvida.`);
    }
    get isAdmin() {
        return this.router.url.startsWith('/admin') || this.router.url.startsWith('/login');
    }
}
bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(
            [
                { path: '', redirectTo: 'loja', pathMatch: 'full' },
                {
                    path: 'loja',
                    component: ShopComponent,
                    title: 'Canecas e Bottons Personalizados | Crica Studio',
                },
                {
                    path: 'fornecedores',
                    component: SuppliersComponent,
                    title: 'Máquinas de Bottons e Canecas para Personalizar | Crica Studio',
                },
                {
                    path: 'vitrine',
                    component: StorefrontComponent,
                    title: 'Vitrines da Crica Studio | Produtos Personalizados',
                },
                { path: 'login', component: LoginComponent, title: 'Entrar | Crica Studio' },
                { path: 'admin', redirectTo: 'admin/loja', pathMatch: 'full' },
                ...['loja', 'fornecedores', 'tipos', 'configuracoes'].map((section) => ({
                    path: 'admin/' + section,
                    component: AdminComponent,
                    canActivate: [authGuard],
                    canDeactivate: [unsavedGuard],
                    data: { section },
                    title: 'Administração | Crica Studio',
                })),
                { path: '**', redirectTo: 'loja' },
            ],
            withInMemoryScrolling({
                scrollPositionRestoration: 'enabled',
                anchorScrolling: 'enabled',
            }),
        ),
    ],
}).catch(console.error);
