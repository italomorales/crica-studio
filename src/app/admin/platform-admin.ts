import { Component, ElementRef, OnInit, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { PlatformLogoPickerComponent } from './platform-logo-picker';
import { FormsModule } from '@angular/forms';
import { CatalogPlatform, PlatformService } from '../services/platform.service';
import { normalize } from '../services/contact';
import template from './platform-admin.html?raw';
import { PlatformGridComponent, type PlatformGridAction } from './platform-grid';

@Component({ selector: 'crica-platform-admin', standalone: true, imports: [FormsModule, PlatformGridComponent, PlatformLogoPickerComponent], template })
export class PlatformAdminComponent implements OnInit {
    private service = inject(PlatformService);
    private cd = inject(ChangeDetectorRef);
    platforms: CatalogPlatform[] = [];
    uploadingLogo = false;
    loading = true; saving = false; editing = false; query = ''; error = ''; notice = ''; baseline = '';
    filterStatus = 'all'; pageSize = 20;
    @ViewChild('deleteDialog', { static: true }) deleteDialog!: ElementRef<HTMLDialogElement>;
    deletionTarget?: CatalogPlatform;
    deletionError = '';
    draft: CatalogPlatform = this.newPlatform();
    get dirty() { return this.editing && JSON.stringify(this.draft) !== this.baseline; }
    get rows() {
        return this.platforms.filter(item => normalize(`${item.name} ${item.code} ${item.locale} ${item.countryCode}`).includes(normalize(this.query))
            && (this.filterStatus === 'all' || (item.active ? 'active' : 'inactive') === this.filterStatus));
    }
    clear() { this.query = ''; this.filterStatus = 'all'; }
    gridAction(event: PlatformGridAction) {
        if (this.saving || this.uploadingLogo) return;
        if (event.kind === 'edit') this.edit(event.item);
        else if (event.kind === 'delete') { this.deletionTarget = event.item; this.deletionError = ''; this.deleteDialog.nativeElement.showModal(); }
        else void this.toggle(event.item);
    }
    async toggle(item: CatalogPlatform) {
        if (this.saving || this.uploadingLogo) return;
        this.saving = true; this.error = ''; this.notice = '';
        try {
            const saved = await this.service.save({ ...item, active: !item.active });
            this.platforms = this.platforms.map(row => row.id === saved.id ? saved : row);
            this.notice = saved.active ? 'Plataforma ativada.' : 'Plataforma desativada. Os vínculos dos produtos foram preservados.';
        } catch (error) { this.error = (error as Error).message; }
        finally { this.saving = false; this.cd.markForCheck(); }
    }
    cancelDeletion() { if (!this.saving) this.deleteDialog.nativeElement.close(); }
    deletionClosed() { this.deletionTarget = undefined; this.deletionError = ''; }
    deletionCancel(event: Event) { if (this.saving || this.uploadingLogo) event.preventDefault(); }
    deletionBackdrop(event: MouseEvent) {
        if (event.target !== this.deleteDialog.nativeElement || this.saving) return;
        const bounds = this.deleteDialog.nativeElement.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.cancelDeletion();
    }
    ngOnInit() { void this.load(); }
    newPlatform(): CatalogPlatform { return { id: '', name: '', code: '', description: '', url: null, logoUrl: null, locale: 'pt-BR', countryCode: 'BR', status: 'draft', order: 0, active: true, mobileOnly: false }; }
    async load() {
        this.loading = true; this.error = '';
        try { this.platforms = await this.service.all(); }
        catch (error) { this.error = (error as Error).message; }
        finally { this.loading = false; this.cd.markForCheck(); }
    }
    edit(item?: CatalogPlatform) {
        if (this.saving || this.uploadingLogo || (this.dirty && !window.confirm('Descartar alterações não salvas?'))) return;
        this.draft = item ? structuredClone(item) : this.newPlatform();
        this.editing = true; this.baseline = JSON.stringify(this.draft); this.error = ''; this.notice = '';
    }
    cancel() {
        if (this.saving || this.uploadingLogo || (this.dirty && !window.confirm('Descartar alterações não salvas?'))) return;
        this.editing = false; this.error = '';
    }
    async save() {
        if (this.saving || this.uploadingLogo) return;
        this.saving = true; this.error = '';
        try {
            const item = await this.service.save({ ...this.draft, name: this.draft.name.trim(), code: this.draft.code.trim().toLowerCase(),
                description: this.draft.description.trim(), url: this.draft.url?.trim() || null, logoUrl: this.draft.logoUrl?.trim() || null,
                locale: this.draft.locale.trim(), countryCode: this.draft.countryCode.trim().toUpperCase() });
            this.platforms = [...this.platforms.filter(row => row.id !== item.id), item].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
            this.editing = false; this.notice = 'Plataforma salva com sucesso.'; this.clear();
        } catch (error) { this.error = (error as Error).message; }
        finally { this.saving = false; this.cd.markForCheck(); }
    }
    async remove(item: CatalogPlatform) {
        if (this.saving || this.uploadingLogo) return;
        this.saving = true; this.deletionError = ''; this.notice = '';
        try {
            await this.service.request(`platforms/${item.id}`, 'DELETE');
            this.platforms = this.platforms.filter(row => row.id !== item.id);
            this.notice = 'Plataforma excluída.'; this.deleteDialog.nativeElement.close();
        } catch (error) { this.deletionError = (error as Error).message; }
        finally { this.saving = false; this.cd.markForCheck(); }
    }
}
