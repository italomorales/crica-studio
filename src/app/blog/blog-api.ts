import { Injectable, inject } from '@angular/core';
import { API_URL, AuthService } from '../services/auth.service';
import { BLOG_LOCALES, type BlogPost, type BlogLocale } from './blog-data';
export type Category = {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    translations: Record<string, string>;
};
export type Product = {
    id: string;
    kind: string;
    name: string;
    description: string;
    image: string;
    href: string;
    type: string;
};
export const emptyVersion = () => ({
    title: '',
    summary: '',
    slug: '',
    html: '<p></p>',
    document: { type: 'doc', content: [] },
    seoTitle: '',
    seoDescription: '',
    status: 'draft' as const,
});
export function normalizePost(post: BlogPost): BlogPost {
    for (const { code } of BLOG_LOCALES) post.versions[code] ??= emptyVersion();
    return post;
}
@Injectable({ providedIn: 'root' })
export class BlogApi {
    private auth = inject(AuthService);
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
        const headers = new Headers(init.headers);
        if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
        if (path.startsWith('/api/admin')) {
            const token = this.auth.accessToken();
            if (!token) throw new Error('Entre na administração para continuar.');
            headers.set('Authorization', `Bearer ${token}`);
        }
        const response = await fetch(API_URL + path, { ...init, headers });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(
                Object.values(data.errors || {})
                    .flat()
                    .join(' ') ||
                    data.title ||
                    `Falha ao acessar o blog (${response.status}).`,
            );
        }
        return response.status === 204 ? (undefined as T) : response.json();
    }
    async list(admin: boolean, params: Record<string, string | number>) {
        const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
        const data = await this.request<{ items: BlogPost[]; total: number }>(
            `/api/${admin ? 'admin/' : ''}blog/posts?${query}`,
        );
        data.items.forEach(normalizePost);
        return data;
    }
    async get(id: string) {
        return normalizePost(await this.request<BlogPost>(`/api/admin/blog/posts/${id}`));
    }
    async article(locale: string, slug: string) {
        return normalizePost(
            await this.request<BlogPost>(`/api/blog/posts/${locale}/${encodeURIComponent(slug)}`),
        );
    }
    payload(post: BlogPost, locale: BlogLocale) {
        return {
            categoryId: post.categoryId,
            cover: post.cover,
            author: post.author,
            date: post.date,
            featured: post.featured,
            version: post.versions[locale],
        };
    }
    async save(post: BlogPost, locale: BlogLocale, isNew: boolean) {
        return normalizePost(
            await this.request<BlogPost>(
                isNew
                    ? `/api/admin/blog/posts?locale=${locale}`
                    : `/api/admin/blog/posts/${post.id}/versions/${locale}`,
                {
                    method: isNew ? 'POST' : 'PUT',
                    body: JSON.stringify(this.payload(post, locale)),
                },
            ),
        );
    }
    async preview(post: BlogPost, locale: BlogLocale) {
        return this.request<{ html: string }>(`/api/admin/blog/preview?locale=${locale}`, {
            method: 'POST',
            body: JSON.stringify(this.payload(post, locale)),
        });
    }
    async upload(file: File) {
        const body = new FormData();
        body.append('file', file);
        return (
            await this.request<{ url: string }>('/api/admin/blog/images', { method: 'POST', body })
        ).url;
    }
    categories(admin = false, locale = 'pt') {
        return this.request<Category[]>(
            `/api/${admin ? 'admin/' : ''}blog/categories?locale=${locale}`,
        );
    }
}
