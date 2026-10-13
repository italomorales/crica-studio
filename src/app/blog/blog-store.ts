import { Injectable, signal } from '@angular/core';
import {
    mergeBlogVersion,
    seedBlog,
    type BlogComment,
    type BlogLocale,
    type BlogPost,
} from './blog-data';

/** Phase-one session only: no storage, authentication or network writes. */
@Injectable({ providedIn: 'root' })
export class BlogStore {
    readonly posts = signal<BlogPost[]>([]);
    readonly preview = signal<BlogPost | undefined>(undefined);
    readonly user = signal<{ name: string; provider: string } | undefined>(undefined);
    readonly liked = signal<string[]>([]);
    readonly comments = signal<BlogComment[]>([
        {
            id: 'c1',
            postId: 'blog-1',
            locale: 'pt',
            name: 'Marina · exemplo',
            text: 'A ideia de transformar uma memória em presente é muito bonita!',
            date: '09/10/2026',
            status: 'approved',
        },
        {
            id: 'c2',
            postId: 'blog-1',
            locale: 'pt',
            name: 'Rafael · exemplo',
            text: 'Gostaria de ver mais ideias para presentes de equipe.',
            date: '10/10/2026',
            status: 'pending',
        },
        {
            id: 'c3',
            postId: 'blog-2',
            locale: 'pt',
            name: 'Conta de exemplo',
            text: 'Uma divulgação que não tem relação com a matéria.',
            date: '10/10/2026',
            status: 'pending',
        },
    ]);
    login(provider: string) {
        this.user.set({ name: 'Visitante de demonstração', provider });
    }
    toggleLike(key: string) {
        this.liked.update((keys) =>
            keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key],
        );
    }
    comment(postId: string, locale: BlogLocale, text: string) {
        if (!this.user() || !text.trim() || text.length > 1500) return;
        this.comments.update((items) => [
            ...items,
            {
                id: crypto.randomUUID(),
                postId,
                locale,
                text: text.trim(),
                name: this.user()!.name,
                date: 'Nesta sessão',
                status: 'pending',
            },
        ]);
    }
    moderate(id: string, status: BlogComment['status']) {
        this.comments.update((items) =>
            items.map((item) => (item.id === id ? { ...item, status } : item)),
        );
    }
    save(post: BlogPost, locale: BlogLocale) {
        const saved = mergeBlogVersion(
            this.posts().find((item) => item.id === post.id),
            post,
            locale,
        );
        this.posts.update((items) =>
            items.some((item) => item.id === post.id)
                ? items.map((item) => (item.id === post.id ? saved : item))
                : [saved, ...items],
        );
    }
}
