import { Injectable, inject, effect } from '@angular/core';
import { language, translate } from './language';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import type { Product } from '../data/models';
import { productPath } from './product-url';
import { publicSiteUrl } from './site-market';

const SITE_URL = publicSiteUrl();

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
        title: 'Vitrines da Crica Studio — Produtos Personalizados | Crica Studio',
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
    private product?: Product;

    constructor() {
        effect(() => { language(); this.update(this.router.url); });
        this.update(this.router.url);
        this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event) => this.update(event.urlAfterRedirects));
    }

    setProduct(product: Product) {
        this.product = product;
        const page: PageSeo = {
            title: `${product.name} | Crica Studio`,
            description: product.fullDescription || product.description,
            path: productPath(product),
        };
        this.apply(page, product.images[0]);
    }

    private update(url: string) {
        const path = '/' + url.split(/[?#]/)[0].replace(/^\/+/, '');
        document.documentElement.lang = path.startsWith('/admin') || path === '/login' ? 'pt-BR' : language() === 'pt' ? 'pt-BR' : language();
        if (this.product && path === productPath(this.product)) { this.setProduct(this.product); return; }
        this.product = undefined;
        const page = path.startsWith('/admin')
            ? {
                  title: 'Administração | Crica Studio',
                  description: 'Área administrativa da Crica Studio.',
                  path,
                  indexable: false,
              }
            : PAGES[path] ?? DEFAULT_PAGE;
        this.apply(page.indexable === false ? page : {
            ...page,
            title: translate(page.title.split(' | ')[0]) + ' | Crica Studio',
            description: translate(page.description),
        });
    }

    private apply(page: PageSeo, image?: string) {
        const canonical = `${SITE_URL}${page.path}`;
        const robots = page.indexable === false ? 'noindex,nofollow' : 'index,follow';

        this.title.setTitle(page.title);
        this.setName('description', page.description);
        this.setName('robots', robots);
        this.setProperty('og:type', 'website');
        this.setProperty('og:locale', language() === 'pt' ? 'pt_BR' : language() === 'en' ? 'en_US' : 'es_ES');
        this.setProperty('og:site_name', 'Crica Studio');
        this.setProperty('og:title', page.title);
        this.setProperty('og:description', page.description);
        this.setProperty('og:url', canonical);
        this.setProperty('og:image', image?.startsWith('http') ? image : `${SITE_URL}${image || '/assets/hero.webp'}`);
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
