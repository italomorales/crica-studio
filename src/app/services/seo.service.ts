import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const SITE_URL = 'https://cricastudio.com';

type PageSeo = {
    title: string;
    description: string;
    path: string;
    indexable?: boolean;
};

const DEFAULT_PAGE: PageSeo = {
    title: 'Canecas e Bottons Personalizados | Crica Studio',
    description:
        'Conheça canecas e bottons personalizados da Crica Studio para pessoas, empresas, eventos e pedidos em quantidade.',
    path: '/loja',
};

const PAGES: Record<string, PageSeo> = {
    '/loja': DEFAULT_PAGE,
    '/fornecedores': {
        title: 'Máquinas de Bottons e Canecas para Personalizar | Crica Studio',
        description:
            'Confira indicações de canecas para personalizar, máquinas de fazer bottons e materiais para sua produção.',
        path: '/fornecedores',
    },
    '/vitrine': {
        title: 'Vitrines da Crica Studio | Produtos Personalizados',
        description:
            'Encontre os produtos personalizados da Crica Studio nas plataformas parceiras de sua preferência.',
        path: '/vitrine',
    },
    '/login': {
        title: 'Entrar | Crica Studio',
        description: 'Acesso à administração da Crica Studio.',
        path: '/login',
        indexable: false,
    },
};

@Injectable({ providedIn: 'root' })
export class SeoService {
    private readonly router = inject(Router);
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);

    constructor() {
        this.update(this.router.url);
        this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event) => this.update(event.urlAfterRedirects));
    }

    private update(url: string) {
        const path = '/' + url.split(/[?#]/)[0].replace(/^\/+/, '');
        const page = path.startsWith('/admin')
            ? {
                  title: 'Administração | Crica Studio',
                  description: 'Área administrativa da Crica Studio.',
                  path,
                  indexable: false,
              }
            : PAGES[path] ?? DEFAULT_PAGE;
        const canonical = `${SITE_URL}${page.path}`;
        const robots = page.indexable === false ? 'noindex,nofollow' : 'index,follow';

        this.title.setTitle(page.title);
        this.setName('description', page.description);
        this.setName('robots', robots);
        this.setProperty('og:type', 'website');
        this.setProperty('og:site_name', 'Crica Studio');
        this.setProperty('og:title', page.title);
        this.setProperty('og:description', page.description);
        this.setProperty('og:url', canonical);
        this.setProperty('og:image', `${SITE_URL}/assets/hero.webp`);
        this.setName('twitter:card', 'summary_large_image');

        let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.append(link);
        }
        link.href = canonical;
    }

    private setName(name: string, content: string) {
        this.meta.updateTag({ name, content }, `name='${name}'`);
    }

    private setProperty(property: string, content: string) {
        this.meta.updateTag({ property, content }, `property='${property}'`);
    }
}
