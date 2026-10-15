import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { language, setLanguage } from '../services/language';
import {
    BLOG_CATEGORIES,
    blogPath,
    searchBlog,
    type BlogLocale,
    type BlogPost,
} from './blog-data';
import { BlogStore } from './blog-store';
import { BlogApi, type Category } from './blog-api';
import type { ResolvedArticle } from './blog-article-resolver';
import { SeoService } from '../services/seo.service';
import { BlogInteractionsComponent } from './blog-interactions';
import template from './blog-public.html?raw';
import './blog.css';

@Component({
    selector: 'crica-blog',
    standalone: true,
    imports: [FormsModule, RouterLink, BlogInteractionsComponent],
    template,
})
export class BlogPublicComponent {
    readonly store = inject(BlogStore);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private api = inject(BlogApi);
    private seo = inject(SeoService);
    categoryRows: Category[] = [];
    get categories() {
        return this.categoryRows.map((c) => c.name);
    }
    total = signal(0);
    currentPost = signal<BlogPost | undefined>(undefined);
    loading = signal(true);
    private readonly resolvedArticle = signal<ResolvedArticle>({});
    private requestId = 0;
    async load() {
        const id = ++this.requestId;
        this.loading.set(true);
        this.currentPost.set(undefined);
        try {
            if (this.slug()) {
                const { post, error } = this.resolvedArticle();
                if (!this.previewMode() && post) {
                    this.currentPost.set(post);
                    const v = post.versions[this.locale()];
                    this.seo.setBlog(
                        v.seoTitle || v.title, v.seoDescription || v.summary,
                        blogPath(post, this.locale()), post.cover, post.versions,
                        {
                            headline: v.title, description: v.summary, image: post.cover,
                            inLanguage: this.locale(), datePublished: v.publishedAt || v.publishAt,
                            dateModified: v.updatedAt,
                            author: { '@type': 'Person', name: post.author, image: post.authorProfile?.photo || undefined },
                        },
                    );
                }
                if (error) this.notice.set(error);
                this.loading.set(false);
                // Suggestions are optional and must never delay or hide the article.
                const data = await this.api.list(false, { locale: this.locale(), page: 1, pageSize: 6 });
                if (id === this.requestId) this.store.posts.set(data.items);
                return;
            }
            const categories = await this.api.categories(false, this.locale());
            if (id !== this.requestId) return;
            this.categoryRows = categories;
            const categoryId = categories.find(
                (c) => c.name === this.category() || c.id === this.category(),
            )?.id;
            const data = await this.api.list(false, {
                locale: this.locale(),
                page: this.page(),
                pageSize: 6,
                query: this.query(),
                ...(categoryId ? { categoryId } : {}),
            });
            if (id !== this.requestId) return;
            this.store.posts.set(data.items);
            this.total.set(data.total);
            this.seo.setBlog(
                    'Crica News',
                    'Inspiração, histórias e detalhes para criar algo que tenha a sua essência.',
                    '/blog',
                );
        } catch (e) {
            if (id === this.requestId && !this.slug()) {
                this.notice.set((e as Error).message);
            }
        } finally {
            if (id === this.requestId) this.loading.set(false);
        }
    }
    readonly locale = signal<BlogLocale>('pt');
    readonly slug = signal('');
    readonly previewMode = signal(false);
    readonly query = signal('');
    readonly category = signal('');
    readonly page = signal(1);
    commentText = '';
    readonly notice = signal('');
    private readonly subscriptions = new Subscription();
    constructor() {
        this.subscriptions.add(this.route.data.subscribe(data => {
            this.resolvedArticle.set(data['article'] || {});
        }));
        this.subscriptions.add(
            this.route.paramMap.subscribe((params) => {
                this.slug.set(params.get('slug') || '');
                const locale = params.get('locale');
                if (locale === 'pt' || locale === 'en' || locale === 'es') {
                    this.locale.set(locale);
                    setLanguage(locale, false);
                }
                this.commentText = '';
                this.notice.set('');
            }),
        );
        this.subscriptions.add(
            this.route.queryParamMap.subscribe((params) => {
                this.previewMode.set(params.get('preview') === '1');
                if (!this.slug()) {
                    const locale = params.get('idioma') || language();
                    this.locale.set(locale === 'en' || locale === 'es' ? locale : 'pt');
                    setLanguage(this.locale(), false);
                    this.query.set(params.get('q') || '');
                    this.category.set(params.get('categoria') || '');
                    this.page.set(Math.max(1, Number(params.get('pagina')) || 1));
                }
            }),
        );
        effect(() => {
            this.locale();
            this.slug();
            this.previewMode();
            this.query();
            this.category();
            this.page();
            this.resolvedArticle();
            untracked(() => void this.load());
        });
        effect(() => {
            const locale = language();
            if ((locale === 'pt' || locale === 'en' || locale === 'es') && locale !== this.locale())
                this.selectLocale(locale);
        });
    }
    ngOnDestroy() {
        ++this.requestId;
        this.subscriptions.unsubscribe();
    }
    get results() {
        return this.store.posts();
    }
    get featured() {
        return this.results.find((post) => post.featured) || this.results[0];
    }
    get pages() {
        const count = Math.ceil(this.total() / 6);
        const start = Math.max(1, Math.min(this.page() - 3, count - 6));
        return Array.from({ length: Math.min(7, count) }, (_, i) => start + i);
    }
    get visiblePosts() {
        return this.results;
    }
    get post() {
        const preview = this.store.preview();
        if (
            this.previewMode() &&
            preview &&
            (preview.versions[this.locale()].slug || 'previa') === this.slug()
        )
            return preview;
        return this.currentPost();
    }
    get version() {
        return this.post?.versions[this.locale()];
    }
    get related() {
        return this.results.filter((post) => post.id !== this.post?.id).slice(0, 3);
    }
    path(post: BlogPost) {
        return blogPath(post, this.locale());
    }
    get articleUrl() {
        return this.post ? location.origin + this.path(this.post) : '';
    }
    date(value: string) {
        return new Date(value + 'T12:00:00').toLocaleDateString(
            this.locale() === 'pt' ? 'pt-BR' : this.locale(),
            { day: 'numeric', month: 'long', year: 'numeric' },
        );
    }
    minutes(html: string) {
        return Math.max(1, Math.ceil(html.replace(/<[^>]*>/g, '').split(/\s+/).length / 200));
    }
    filters(query = this.query(), category = this.category(), page = 1) {
        this.query.set(query);
        this.category.set(category);
        this.page.set(page);
        if (page > 1) document.querySelector('.blog-feed')?.scrollIntoView({ behavior: 'smooth' });
    }
    selectLocale(locale: BlogLocale) {
        if (this.post) {
            const post = this.post;
            const version = post.versions[locale];
            if (!version.title || (!this.previewMode() && version.status !== 'published')) {
                this.notice.set('Esta versão ainda está aguardando tradução ou publicação.');
                setLanguage(this.locale());
                return;
            }
            void this.router.navigate(['/blog', locale, version.slug || 'previa'], {
                queryParams: this.previewMode() ? { preview: 1 } : {},
            });
        } else {
            setLanguage(locale);
            void this.router.navigate(['/blog'], { queryParams: { idioma: locale } });
        }
    }
}
