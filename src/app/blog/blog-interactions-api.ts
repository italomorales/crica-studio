import { Injectable, signal } from '@angular/core';
import { API_URL } from '../services/auth.service';
export type BlogVisitor = { id: string; name: string; provider: string };
export type BlogActivity = {
    id: string;
    postId: string;
    locale: string;
    visitorId: string;
    name: string;
    kind: 'comment' | 'like' | 'share';
    text: string;
    parentId: string | null;
    parentText: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'spam';
    date: string;
    postTitle: string;
};
export type Engagement = { likes: number; comments: number; myLikeStatus: string | null };
export type CommentPage = { items: BlogActivity[]; total: number; page: number; pageSize: number };
const base =
    import.meta.env.DEV || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? API_URL
        : '';
@Injectable({ providedIn: 'root' })
export class BlogInteractionsApi {
    readonly user = signal<BlogVisitor | null>(null);
    readonly providers = signal({ google: false, facebook: false });
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
        const response = await fetch(base + '/api/blog' + path, {
            ...init,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Crica-Interaction': '1',
                ...init.headers,
            },
        });
        if (response.status === 401) {
            this.user.set(null);
            throw new Error('Sua sessão terminou. Entre novamente para participar.');
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                Object.values(error.errors || {})
                    .flat()
                    .join(' ') ||
                    error.title ||
                    'Não foi possível concluir. Tente novamente.',
            );
        }
        return response.status === 204 ? (undefined as T) : response.json();
    }
    async session() {
        const session = await this.request<{
            user: BlogVisitor | null;
            providers: { google: boolean; facebook: boolean };
        }>('/auth/session');
        this.user.set(session.user);
        this.providers.set(session.providers);
    }
    login(provider: 'google' | 'facebook', returnUrl: string) {
        location.assign(
            base +
                '/api/blog/auth/start/' +
                provider +
                '?returnUrl=' +
                encodeURIComponent(returnUrl),
        );
    }
    async logout() {
        await this.request('/auth/logout', { method: 'POST' });
        this.user.set(null);
    }
    engagement(id: string, locale: string) {
        return this.request<Engagement>(`/posts/${id}/${locale}/engagement`);
    }
    comments(id: string, locale: string, page = 1) {
        return this.request<CommentPage>(`/posts/${id}/${locale}/comments?page=${page}`);
    }
    comment(id: string, locale: string, text: string, parentId: string | null) {
        return this.request<BlogActivity>(`/posts/${id}/${locale}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text, parentId }),
        });
    }
    like(id: string, locale: string, remove = false) {
        return this.request(`/posts/${id}/${locale}/like`, { method: remove ? 'DELETE' : 'PUT' });
    }
    share(id: string, locale: string) {
        return this.request(`/posts/${id}/${locale}/share`, { method: 'POST' });
    }
}
