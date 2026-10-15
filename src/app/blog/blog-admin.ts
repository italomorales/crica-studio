import { ChangeDetectorRef, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { combineLatest } from 'rxjs';
import {
    BLOG_CATEGORIES,
    BLOG_LOCALES,
    blogPath,
    canPublish,
    versionComplete,
    type BlogLocale,
    type BlogPost,
} from './blog-data';
import { BlogStore } from './blog-store';
import { BlogEditorComponent } from './blog-editor';
import { BlogApi, emptyVersion, type Category, type Author } from './blog-api';
import { BlogGridComponent } from './blog-grid';
import { AdminShellComponent } from '../admin/admin-shell';
import { BlogRecordGridComponent } from './blog-record-grid';
import type { BlogActivity } from './blog-interactions-api';
import template from './blog-admin.html?raw';
import './blog.css';

@Component({
    selector: 'crica-blog-admin',
    standalone: true,
    imports: [
        FormsModule,
        RouterLink,
        RouterLinkActive,
        BlogEditorComponent,
        BlogGridComponent,
        AdminShellComponent,
        BlogRecordGridComponent,
    ],
    template,
})
export class BlogAdminComponent {
    readonly store = inject(BlogStore);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly cd = inject(ChangeDetectorRef);
    readonly locales = BLOG_LOCALES;
    readonly api = inject(BlogApi);
    @ViewChild('deleteDialog', { static: true }) deleteDialog!: ElementRef<HTMLDialogElement>;
    deletionTarget?: BlogPost;
    deletionTitle = '';
    deletionError = '';
    deleting = false;
    requestDeletion(post: BlogPost) {
        if (this.busy || this.deleting) return;
        this.deletionTarget = post;
        this.deletionTitle =
            post.versions[this.mode() === 'edit' ? this.editLocale : this.localeFilter]?.title ||
            Object.values(post.versions).find((v) => v.title)?.title ||
            'Matéria sem título';
        this.deletionError = '';
        this.cd.detectChanges();
        this.deleteDialog.nativeElement.showModal();
    }
    cancelDeletion() {
        if (this.deleting) return;
        this.deleteDialog.nativeElement.close();
        this.deletionTarget = undefined;
        this.deletionError = '';
    }
    onDeleteCancel(event: Event) {
        event.preventDefault();
        this.cancelDeletion();
    }
    onDeleteBackdrop(event: MouseEvent) {
        if (event.target === this.deleteDialog.nativeElement) this.cancelDeletion();
    }
    async confirmDeletion() {
        if (!this.deletionTarget || this.deleting) return;
        this.deleting = true;
        this.deletionError = '';
        const id = this.deletionTarget.id;
        try {
            await this.api.request('/api/admin/blog/posts/' + id, { method: 'DELETE' });
            this.store.posts.update((posts) => posts.filter((post) => post.id !== id));
            if (this.store.preview()?.id === id) this.store.preview.set(undefined);
            this.deleteDialog.nativeElement.close();
            this.deletionTarget = undefined;
            if (this.mode() === 'edit') await this.router.navigate(['/admin/blog']);
            else this.reload();
            this.notice.set('Matéria e todas as suas versões excluídas.');
        } catch (e) {
            this.deletionError = (e as Error).message;
        } finally {
            this.deleting = false;
            this.cd.markForCheck();
        }
    }
    categoryRows: Category[] = [];
    authorRows: Author[] = [];
    selectAuthor(id: string) {
        if (!this.editing) return;
        const author = this.authorRows.find((item) => item.id === id);
        this.editing.authorId = id || null;
        this.editing.author = author?.name || '';
        this.editing.authorProfile = author;
    }
    get categories() {
        return this.categoryRows.map((c) => c.name);
    }
    rows: BlogPost[] = [];
    private requestId = 0;
    total = 0;
    page = 1;
    pageSize = 20;
    isNew = false;
    busy = false;
    categoryName = '';
    categoryQuery = '';
    categoryStatus = '';
    categoryDraft?: Category;
    categoryIsNew = false;
    get filteredCategories() {
        return this.categoryRows.filter(
            (c) =>
                c.name.toLowerCase().includes(this.categoryQuery.toLowerCase()) &&
                (!this.categoryStatus || c.active === (this.categoryStatus === 'active')),
        );
    }
    editCategory(item?: Category) {
        this.categoryIsNew = !item;
        this.categoryDraft = item
            ? structuredClone(item)
            : {
                  id: crypto.randomUUID(),
                  name: '',
                  slug: '',
                  active: true,
                  translations: { en: '', es: '' },
              };
    }
    categoryAction(event: { kind: string; row: any }) {
        if (event.kind === 'edit') this.editCategory(event.row);
        else if (event.kind === 'delete') void this.deleteCategory(event.row);
        else if (event.kind === 'toggle')
            void this.saveCategory({ ...event.row, active: !event.row.active });
    }

    async addCategory() {
        try {
            const name = this.categoryName.trim();
            if (!name) return;
            await this.api.request('/api/admin/blog/categories/' + crypto.randomUUID(), {
                method: 'PUT',
                body: JSON.stringify({
                    name,
                    slug: name
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, ''),
                    active: true,
                    translations: {},
                }),
            });
            this.categoryRows = await this.api.categories(true);
            this.categoryName = '';
            this.cd.markForCheck();
        } catch (e) {
            this.notice.set((e as Error).message);
        }
    }
    async saveCategory(category: Category) {
        try {
            await this.api.request('/api/admin/blog/categories/' + category.id, {
                method: 'PUT',
                body: JSON.stringify(category),
            });
            this.categoryRows = await this.api.categories(true);
            this.categoryDraft = undefined;
            this.notice.set('Categoria salva.');
        } catch (e) {
            this.notice.set((e as Error).message);
        }
        this.cd.markForCheck();
    }
    async deleteCategory(category: Category) {
        try {
            await this.api.request('/api/admin/blog/categories/' + category.id, {
                method: 'DELETE',
            });
            this.categoryRows = await this.api.categories(true);
            this.notice.set('Categoria sem matérias removida.');
        } catch (e) {
            this.notice.set((e as Error).message);
        }
        this.cd.markForCheck();
    }
    refreshToken = 0;
    get filterCategoryId() {
        return this.categoryRows.find((c) => c.name === this.category)?.id || '';
    }
    reload() {
        this.refreshToken++;
    }
    gridLoaded(data: { items: BlogPost[]; total: number }) {
        this.total = data.total;
        this.rows = data.items;
        this.store.posts.set(data.items);
        this.cd.markForCheck();
    }
    moderationRows: BlogActivity[] = [];
    moderationPage = 1;
    moderationTotal = 0;
    moderationPending = 0;
    moderationLoading = false;
    get moderationPages(){return Math.max(1,Math.ceil(this.moderationTotal/this.pageSize));}
    @ViewChild('moderationDialog',{static:true}) moderationDialog!:ElementRef<HTMLDialogElement>;
    reviewActivity?:BlogActivity;
    private moderationRequest = 0;
    async loadModeration(page=1) {
        const request=++this.moderationRequest;this.moderationLoading=true;this.moderationPage=page;
        try {
            const params=new URLSearchParams({status:this.moderationFilter,kind:'comment',page:String(page),pageSize:String(this.pageSize)});
            const [data,pending]=await Promise.all([
                this.api.request<{items:BlogActivity[];total:number}>('/api/admin/blog/activity?'+params),
                this.api.request<{total:number}>('/api/admin/blog/activity?status=pending&pageSize=1'),
            ]);
            if(request!==this.moderationRequest)return;
            this.moderationRows=data.items;this.moderationTotal=data.total;this.moderationPending=pending.total;
        } catch(e){if(request===this.moderationRequest)this.notice.set((e as Error).message);}
        finally{if(request===this.moderationRequest)this.moderationLoading=false;this.cd.markForCheck();}
    }
    async moderateAction(event: { kind: string; row: any }) {
        if(this.busy)return;
        if(event.kind==='inspect'){this.reviewActivity=event.row;this.cd.detectChanges();this.moderationDialog.nativeElement.showModal();return;}
        const status = {
            approve: 'approved',
            reject: 'rejected',
            spam: 'spam',
            pending: 'pending',
        }[event.kind] as 'approved' | 'rejected' | 'spam' | 'pending';
        if(!status)return;
        this.busy=true;
        try{await this.api.request('/api/admin/blog/activity/'+event.row.id,{method:'PUT',body:JSON.stringify({status})});await this.loadModeration(this.moderationPage);this.notice.set('Interação atualizada.');this.moderationDialog.nativeElement.close();this.reviewActivity=undefined;}
        catch(e){this.notice.set((e as Error).message);}
        finally{this.busy=false;this.cd.markForCheck();}
    }
    edit(id: string) {
        void this.router.navigate(['/admin/blog/editar', id]);
    }
    async load(id: string | null) {
        try {
            this.categoryRows = await this.api.categories(true);
            if (this.mode() === 'edit') {
                this.authorRows = await this.api.authors();
                if (this.editing?.id === id) return;
                this.isNew = id === 'novo';
                this.editing =
                    this.store.preview()?.id === id
                        ? structuredClone(this.store.preview()!)
                        : this.isNew
                          ? this.newPost()
                          : await this.api.get(id!);
            } else if (this.mode() === 'list') await this.reload();
            else if (this.mode() === 'moderation') await this.loadModeration();
        } catch (e) {
            this.notice.set((e as Error).message);
        }
        this.cd.markForCheck();
    }
    readonly mode = signal('list');
    readonly notice = signal('');
    readonly statusLabels = {
        draft: 'Rascunho',
        published: 'Publicada',
        scheduled: 'Agendada',
        archived: 'Arquivada',
    };
    query = '';
    category = '';
    localeFilter: BlogLocale = 'pt';
    statusFilter = '';
    moderationFilter = 'pending';
    editLocale: BlogLocale = 'pt';
    editing?: BlogPost;
    private readonly subscription = combineLatest([this.route.data, this.route.paramMap]).subscribe(
        ([data, params]) => {
            this.mode.set(data['mode'] || 'list');
            this.notice.set('');
            void this.load(params.get('id'));
            if (this.mode() === 'edit') {
                const locale = this.route.snapshot.queryParamMap.get('idioma');
                this.editLocale = locale === 'en' || locale === 'es' ? locale : 'pt';
                const id = params.get('id');
            }
        },
    );
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    get version() {
        return this.editing!.versions[this.editLocale];
    }
    get scheduleLocal() {
        const value = this.version.publishAt;
        if (!value) return '';
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return '';
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
    }
    set scheduleLocal(value: string) {
        this.version.publishAt = value ? new Date(value).toISOString() : null;
    }
    get posts() {
        return this.rows;
    }
    get comments() {
        return this.moderationRows;
    }
    get pendingCount() {
        return this.moderationPending;
    }
    complete = versionComplete;
    postTitle(id: string) {
        return this.store.posts().find((post) => post.id === id)?.versions.pt.title || 'Matéria';
    }
    private newPost(): BlogPost {
        const versions = Object.fromEntries(
            this.locales.map((locale) => [
                locale.code,
                {
                    title: '',
                    summary: '',
                    slug: '',
                    html: '<p></p>',
                    document: { type: 'doc', content: [] },
                    seoTitle: '',
                    seoDescription: '',
                    status: 'draft',
                },
            ]),
        ) as BlogPost['versions'];
        return {
            id: 'novo',
            category: this.categoryRows[0]?.name || '',
            categoryId: this.categoryRows[0]?.id,
            author: '',
            authorId: null,
            date: new Date().toISOString().slice(0, 10),
            featured: false,
            cover: '/assets/product-1.webp',
            versions,
        };
    }
    slugFromTitle() {
        this.version.slug = this.version.title
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    async save(status?: 'draft' | 'published' | 'scheduled' | 'archived') {
        if (!this.editing || this.busy) return;
        this.busy = true;
        const prior = this.version.status;
        try {
            this.version.status = status || this.version.status;
            this.editing.categoryId = this.categoryRows.find(
                (c) => c.name === this.editing!.category,
            )?.id;
            if (this.version.status === 'scheduled' && this.version.publishAt)
                this.version.publishAt = new Date(this.version.publishAt).toISOString();
            const saved = await this.api.save(this.editing, this.editLocale, this.isNew);
            this.editing.id = saved.id;
            this.isNew = false;
            this.editing.products = saved.products;
            this.editing.author = saved.author;
            this.editing.authorId = saved.authorId;
            this.editing.authorProfile = saved.authorProfile;
            this.editing.versions[this.editLocale] = saved.versions[this.editLocale];
            this.store.preview.set(undefined);
            await this.router.navigate(['/admin/blog/editar', saved.id], {
                queryParams: { idioma: this.editLocale },
                replaceUrl: true,
            });
            this.notice.set('Versão ' + this.editLocale.toUpperCase() + ' salva no banco.');
        } catch (e) {
            this.version.status = prior;
            this.notice.set((e as Error).message);
        } finally {
            this.busy = false;
            this.cd.markForCheck();
        }
    }
    async preview() {
        if (!this.editing) return;
        try {
            this.editing.categoryId = this.categoryRows.find(
                (c) => c.name === this.editing!.category,
            )?.id;
            const content = await this.api.preview(this.editing, this.editLocale);
            const post = structuredClone(this.editing);
            post.versions[this.editLocale].html = content.html;
            this.store.preview.set(post);
            void this.router.navigate(['/blog', this.editLocale, this.version.slug || 'previa'], {
                queryParams: { preview: 1 },
            });
        } catch (e) {
            this.notice.set((e as Error).message);
        }
    }
    publicPath(post: BlogPost) {
        return blogPath(post, 'pt');
    }
    async uploadCover(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !this.editing) return;
        try {
            this.editing.cover = await this.api.upload(file);
            this.notice.set('Capa enviada. Salve a versão para associar à matéria.');
        } catch (e) {
            this.notice.set((e as Error).message);
        } finally {
            input.value = '';
            this.cd.markForCheck();
        }
    }
}
