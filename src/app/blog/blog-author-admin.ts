import { Component, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../admin/admin-shell';
import { BlogRecordGridComponent } from './blog-record-grid';
import { BlogApi, type Author } from './blog-api';
import template from './blog-author-admin.html?raw';
import './blog.css';
@Component({
    selector: 'crica-blog-author-admin',
    standalone: true,
    imports: [FormsModule, AdminShellComponent, BlogRecordGridComponent],
    template,
})
export class BlogAuthorAdminComponent {
    private api = inject(BlogApi);
    private cd = inject(ChangeDetectorRef);
    @ViewChild('deleteDialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
    rows: Author[] = [];
    draft?: Author;
    isNew = false;
    query = '';
    status = '';
    pageSize = 20;
    loading = true;
    busy = false;
    uploading = false;
    notice = '';
    error = '';
    deleteError = '';
    deletionTarget?: Author;
    constructor() {
        void this.load();
    }
    get filtered() {
        return this.rows.filter(
            (a) =>
                a.name.toLowerCase().includes(this.query.toLowerCase()) &&
                (!this.status || a.active === (this.status === 'active')),
        );
    }
    async load() {
        try {
            this.rows = await this.api.authors();
        } catch (e) {
            this.error = (e as Error).message;
        } finally {
            this.loading = false;
            this.cd.markForCheck();
        }
    }
    edit(author?: Author) {
        if (this.busy) return;
        this.isNew = !author;
        this.draft = author
            ? structuredClone(author)
            : { id: crypto.randomUUID(), name: '', photo: '', bio: '', active: true };
        this.error = '';
        this.notice = '';
    }
    async save(author = this.draft) {
        if (!author || this.busy || this.uploading) return;
        this.busy = true;
        this.error = '';
        try {
            await this.api.request('/api/admin/blog/authors/' + author.id, {
                method: 'PUT',
                body: JSON.stringify(author),
            });
            this.rows = await this.api.authors();
            this.draft = undefined;
            this.notice = 'Autor salvo.';
        } catch (e) {
            this.error = (e as Error).message;
        } finally {
            this.busy = false;
            this.cd.markForCheck();
        }
    }
    async upload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !this.draft || this.uploading) return;
        this.uploading = true;
        this.error = '';
        try {
            this.draft.photo = await this.api.upload(file);
        } catch (e) {
            this.error = (e as Error).message;
        } finally {
            input.value = '';
            this.uploading = false;
            this.cd.markForCheck();
        }
    }
    action(event: { kind: string; row: Author }) {
        if (this.busy) return;
        if (event.kind === 'edit') this.edit(event.row);
        else if (event.kind === 'toggle')
            void this.save({ ...event.row, active: !event.row.active });
        else if (event.kind === 'delete') {
            this.deletionTarget = event.row;
            this.deleteError = '';
            this.cd.detectChanges();
            this.dialog.nativeElement.showModal();
        }
    }
    cancelDeletion() {
        if (this.busy) return;
        this.dialog.nativeElement.close();
        this.deletionTarget = undefined;
    }
    onCancel(event: Event) {
        event.preventDefault();
        this.cancelDeletion();
    }
    async confirmDeletion() {
        if (!this.deletionTarget || this.busy) return;
        this.busy = true;
        try {
            await this.api.request('/api/admin/blog/authors/' + this.deletionTarget.id, {
                method: 'DELETE',
            });
            this.dialog.nativeElement.close();
            if (this.draft?.id === this.deletionTarget.id) this.draft = undefined;
            this.deletionTarget = undefined;
            this.rows = await this.api.authors();
            this.notice = 'Autor excluído.';
        } catch (e) {
            this.deleteError = (e as Error).message;
        } finally {
            this.busy = false;
            this.cd.markForCheck();
        }
    }
}
