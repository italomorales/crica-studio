import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BlogInteractionsApi, type BlogActivity, type Engagement } from './blog-interactions-api';
import { interactionCopy } from './blog-interaction-copy';
import type { BlogLocale } from './blog-data';
import template from './blog-interactions.html?raw';
import './blog-interactions.css';

@Component({
    selector: 'crica-blog-interactions',
    standalone: true,
    imports: [FormsModule],
    template,
})
export class BlogInteractionsComponent {
    @Input({ required: true }) postId = '';
    @Input({ required: true }) locale: BlogLocale = 'pt';
    @Input() title = '';
    @Input() url = '';
    @Input() preview = false;
    @ViewChild('loginDialog', { static: true }) loginDialog!: ElementRef<HTMLDialogElement>;
    @ViewChild('shareDialog', { static: true }) shareDialog!: ElementRef<HTMLDialogElement>;
    readonly api = inject(BlogInteractionsApi);
    private cd = inject(ChangeDetectorRef);
    engagement: Engagement = { likes: 0, comments: 0, myLikeStatus: null };
    expanded = false;
    comments: BlogActivity[] = [];
    commentsTotal = 0;
    page = 1;
    loading = false;
    busy = false;
    error = '';
    message = '';
    loginError = '';
    shareError = '';
    text = '';
    replyTo: BlogActivity | null = null;
    private request = 0;
    private intent: 'like' | 'share' | 'comment' = 'comment';
    t(key: keyof typeof interactionCopy) {
        return interactionCopy[key][this.locale === 'en' ? 1 : this.locale === 'es' ? 2 : 0];
    }
    get liked() {
        return this.engagement.myLikeStatus === 'approved';
    }
    get likeLabel() {
        return this.t(this.liked ? 'liked' : 'like');
    }
    get shareWhatsApp() {
        return 'https://wa.me/?text=' + encodeURIComponent(this.title + ' ' + this.url);
    }
    get shareFacebook() {
        return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(this.url);
    }
    get storageKey() {
        return 'crica.blog.draft.' + this.postId + '.' + this.locale;
    }
    async ngOnChanges() {
        const request = ++this.request;
        this.loading = false;
        this.busy = false;
        this.expanded = false;
        this.comments = [];
        this.replyTo = null;
        this.error = '';
        this.message = '';
        this.text = '';
        this.engagement = { likes: 0, comments: 0, myLikeStatus: null };
        if (this.preview) return;
        try {
            await this.api.session();
            const result = await this.api.engagement(this.postId, this.locale);
            if (request !== this.request) return;
            this.engagement = result;
            const draft = sessionStorage.getItem(this.storageKey);
            if (draft) {
                const saved = JSON.parse(draft);
                this.text = typeof saved.text === 'string' ? saved.text.slice(0, 1500) : '';
                this.expanded = !!saved.expanded;
                if (
                    saved.replyTo?.id &&
                    typeof saved.replyTo.text === 'string' &&
                    typeof saved.replyTo.name === 'string'
                )
                    this.replyTo = saved.replyTo;
                sessionStorage.removeItem(this.storageKey);
                if (this.expanded) await this.loadComments();
                if (this.api.user()) {
                    if (saved.intent === 'like') await this.like();
                    else if (saved.intent === 'share') this.share();
                    else {
                        this.expanded = true;
                        await this.loadComments();
                        this.cd.detectChanges();
                        document.getElementById('crica-comment-text')?.focus();
                    }
                }
            }
            if (new URLSearchParams(location.search).get('blogLogin') === 'failed')
                this.message = this.t('failed');
        } catch (e) {
            if (request === this.request) this.error = (e as Error).message;
        } finally {
            this.cd.markForCheck();
        }
    }
    requireLogin(intent: 'like' | 'share' | 'comment') {
        if (this.preview) {
            this.message = this.t('preview');
            return false;
        }
        if (this.api.user()) return true;
        this.intent = intent;
        this.loginError = '';
        this.loginDialog.nativeElement.showModal();
        return false;
    }
    login(provider: 'google' | 'facebook') {
        if (!this.api.providers()[provider]) {
            this.loginError = this.t('soon');
            return;
        }
        try {
            sessionStorage.setItem(
                this.storageKey,
                JSON.stringify({
                    text: this.text,
                    expanded: this.expanded,
                    intent: this.intent,
                    replyTo: this.replyTo,
                }),
            );
        } catch {
            /* Draft stays in memory if storage is disabled. */
        }
        const returnUrl = new URL(location.href);
        returnUrl.searchParams.delete('blogLogin');
        returnUrl.hash = '';
        this.api.login(provider, returnUrl.href);
    }
    dismiss(dialog: HTMLDialogElement) {
        dialog.close();
    }
    backdrop(event: MouseEvent, dialog: HTMLDialogElement) {
        if (event.target === dialog) dialog.close();
    }
    async like() {
        if (this.busy || !this.requireLogin('like')) return;
        this.busy = true;
        this.error = '';
        try {
            await this.api.like(this.postId, this.locale, this.liked);
            this.engagement = await this.api.engagement(this.postId, this.locale);
            this.message = '';
        } catch (e) {
            this.error = (e as Error).message;
        } finally {
            this.busy = false;
            this.cd.markForCheck();
        }
    }
    share() {
        if (this.requireLogin('share')) {
            this.shareError = '';
            this.shareDialog.nativeElement.showModal();
        }
    }
    async recordShare() {
        try {
            await this.api.share(this.postId, this.locale);
        } catch (e) {
            this.error = (e as Error).message;
            this.cd.markForCheck();
        }
    }
    async copyLink() {
        try {
            await navigator.clipboard.writeText(this.url);
            this.message = this.t('copied');
            this.shareDialog.nativeElement.close();
            await this.recordShare();
        } catch {
            this.shareError = this.t('copyFailed');
        }
        this.cd.markForCheck();
    }
    async nativeShare() {
        try {
            await navigator.share({ title: this.title, url: this.url });
            this.shareDialog.nativeElement.close();
            await this.recordShare();
        } catch (e) {
            if ((e as Error).name !== 'AbortError') this.error = this.t('failed');
        }
        this.cd.markForCheck();
    }
    get nativeAvailable() {
        return typeof navigator.share === 'function';
    }
    async toggleComments() {
        this.expanded = !this.expanded;
        if (this.expanded && this.comments.length === 0) await this.loadComments();
    }
    async loadComments(more = false) {
        if (this.loading || this.preview) return;
        this.loading = true;
        this.error = '';
        const request = this.request;
        const page = more ? this.page + 1 : 1;
        try {
            const result = await this.api.comments(this.postId, this.locale, page);
            if (request !== this.request) return;
            this.comments = more ? [...this.comments, ...result.items] : result.items;
            this.commentsTotal = result.total;
            this.page = page;
        } catch (e) {
            if (request === this.request) this.error = (e as Error).message;
        } finally {
            if (request === this.request) this.loading = false;
            this.cd.markForCheck();
        }
    }
    reply(comment: BlogActivity) {
        this.replyTo = comment;
        if (!this.requireLogin('comment')) return;
        this.cd.detectChanges();
        document.getElementById('crica-comment-text')?.focus();
    }
    async send() {
        if (this.busy || !this.text.trim() || !this.requireLogin('comment')) return;
        this.busy = true;
        this.error = '';
        try {
            await this.api.comment(this.postId, this.locale, this.text, this.replyTo?.id ?? null);
            this.text = '';
            this.replyTo = null;
            this.message = this.t('sent');
            await this.loadComments();
        } catch (e) {
            this.error = (e as Error).message;
        } finally {
            this.busy = false;
            this.cd.markForCheck();
        }
    }
    async logout() {
        try {
            await this.api.logout();
            this.replyTo = null;
            this.engagement = await this.api.engagement(this.postId, this.locale);
            if (this.expanded) await this.loadComments();
        } catch (e) {
            this.error = (e as Error).message;
        }
        this.cd.markForCheck();
    }
    date(date: string) {
        return new Date(date).toLocaleDateString(this.locale === 'pt' ? 'pt-BR' : this.locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }
}
