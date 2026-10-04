import {
    Component,
    ChangeDetectorRef,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    NgZone,
    inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createGrid, type GridApi, type ICellRendererParams } from 'ag-grid-community';
import { catalogGridLocale, catalogGridTheme } from './catalog-grid';
import { LanguageAdminService } from '../services/language-admin.service';
import type { CatalogLanguage } from '../services/catalog-translations';
import template from './language-admin.html?raw';

@Component({ selector: 'crica-language-admin', standalone: true, imports: [FormsModule], template })
export class LanguageAdminComponent implements AfterViewInit, OnDestroy {
    private service = inject(LanguageAdminService);
    private cd = inject(ChangeDetectorRef);
    private zone = inject(NgZone);
    @ViewChild('grid') host?: ElementRef<HTMLElement>;
    @ViewChild('deleteDialog', { static: true }) deleteDialog!: ElementRef<HTMLDialogElement>;
    deletionTarget?: CatalogLanguage;
    deletionError = '';
    private grid?: GridApi<CatalogLanguage>;
    items: CatalogLanguage[] = [];
    loading = true;
    saving = false;
    editing = false;
    isNew = false;
    error = '';
    notice = '';
    query = '';
    baseline = '';
    draft: CatalogLanguage = this.newLanguage();
    get dirty() {
        return this.editing && JSON.stringify(this.draft) !== this.baseline;
    }
    ngAfterViewInit() {
        void this.load();
    }
    ngOnDestroy() {
        this.grid?.destroy();
    }
    newLanguage(): CatalogLanguage {
        return {
            code: '',
            name: '',
            nativeName: '',
            flagCode: null,
            active: false,
            order: 30,
        };
    }
    async load() {
        this.loading = true;
        this.error = '';
        try {
            this.items = await this.service.all();
        } catch (e) {
            this.error = (e as Error).message;
        } finally {
            this.loading = false;
            this.cd.detectChanges();
            this.renderGrid();
        }
    }
    renderGrid() {
        if (this.editing || !this.host) return;
        this.grid?.destroy();
        this.grid = createGrid(this.host.nativeElement, {
            theme: catalogGridTheme,
            rowData: this.items,
            getRowId: (p) => p.data.code,
            rowHeight: 78,
            headerHeight: 46,
            pagination: true,
            paginationPageSize: 20,
            paginationPageSizeSelector: [20, 50, 100],
            localeText: catalogGridLocale,
            defaultColDef: { sortable: true, resizable: true, suppressMovable: true },
            columnDefs: [
                {
                    headerName: 'Idioma',
                    field: 'name',
                    flex: 2,
                    minWidth: 220,
                    cellRenderer: (p: ICellRendererParams<CatalogLanguage>) => {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = 'catalog-product-name';
                        button.textContent = p.data!.name;
                        button.setAttribute('aria-label', 'Editar idioma ' + p.data!.name);
                        button.onclick = () => this.zone.run(() => this.edit(p.data));
                        return button;
                    },
                },
                { headerName: 'Nome no menu', field: 'nativeName', flex: 1, minWidth: 160 },
                { headerName: 'Código', field: 'code', width: 110 },
                {
                    headerName: 'Situação',
                    field: 'active',
                    cellDataType: false,
                    width: 120,
                    valueFormatter: (p) => (p.value ? 'Ativo' : 'Inativo'),
                },
                { headerName: 'Ordem', field: 'order', width: 100 },
                {
                    headerName: 'Ações',
                    colId: 'actions',
                    width: 116,
                    minWidth: 116,
                    sortable: false,
                    resizable: false,
                    cellRenderer: (p: ICellRendererParams<CatalogLanguage>) => {
                        const group = document.createElement('div');
                        group.className = 'catalog-actions';
                        for (const kind of ['edit', 'delete'] as const) {
                            const button = document.createElement('button');
                            button.type = 'button';
                            button.className = 'catalog-icon ' + kind;
                            button.disabled =
                                this.saving || (kind === 'delete' && p.data!.code === 'pt');
                            button.title = kind === 'edit' ? 'Editar' : 'Excluir';
                            button.setAttribute(
                                'aria-label',
                                `${button.title} idioma ${p.data!.name}`,
                            );
                            const svg = document.createElementNS(
                                'http://www.w3.org/2000/svg',
                                'svg',
                            );
                            svg.setAttribute('viewBox', '0 0 24 24');
                            svg.setAttribute('aria-hidden', 'true');
                            const path = document.createElementNS(svg.namespaceURI, 'path');
                            path.setAttribute(
                                'd',
                                kind === 'edit'
                                    ? 'm16 3 5 5-12 12H4v-5L16 3Zm-2 2 5 5'
                                    : 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
                            );
                            svg.append(path);
                            button.append(svg);
                            button.onclick = () =>
                                this.zone.run(() =>
                                    kind === 'edit'
                                        ? this.edit(p.data)
                                        : this.requestDeletion(p.data!),
                                );
                            group.append(button);
                        }
                        return group;
                    },
                },
            ],
        });
        this.filter();
    }
    filter() {
        this.grid?.setGridOption('quickFilterText', this.query);
    }
    edit(item?: CatalogLanguage) {
        if (this.saving || (this.dirty && !window.confirm('Descartar alterações não salvas?')))
            return;
        this.grid?.destroy();
        this.grid = undefined;
        this.draft = item ? structuredClone(item) : this.newLanguage();
        this.isNew = !item;
        this.editing = true;
        this.error = '';
        this.notice = '';
        this.baseline = JSON.stringify(this.draft);
        this.cd.markForCheck();
    }
    requestDeletion(item: CatalogLanguage) {
        if (this.saving || item.code === 'pt') return;
        this.deletionTarget = item;
        this.deletionError = '';
        this.cd.detectChanges();
        this.deleteDialog.nativeElement.showModal();
    }
    cancelDeletion() {
        if (!this.saving) this.deleteDialog.nativeElement.close();
    }
    deletionClosed() {
        this.deletionTarget = undefined;
        this.deletionError = '';
    }
    deletionCancel(event: Event) {
        if (this.saving) event.preventDefault();
    }
    async remove(item: CatalogLanguage) {
        if (this.saving || item.code === 'pt') return;
        this.saving = true;
        this.deletionError = '';
        try {
            await this.service.remove(item.code);
            this.items = this.items.filter((row) => row.code !== item.code);
            this.notice = 'Idioma excluído.';
            this.deleteDialog.nativeElement.close();
        } catch (e) {
            this.deletionError = (e as Error).message;
        } finally {
            this.saving = false;
            this.cd.detectChanges();
            this.renderGrid();
        }
    }
    cancel() {
        if (this.saving || (this.dirty && !window.confirm('Descartar alterações não salvas?')))
            return;
        this.editing = false;
        this.cd.detectChanges();
        this.renderGrid();
    }
    async save() {
        if (this.saving) return;
        this.saving = true;
        this.error = '';
        try {
            const saved = await this.service.save(
                {
                    ...this.draft,
                    code: this.draft.code.trim(),
                    name: this.draft.name.trim(),
                    nativeName: this.draft.nativeName.trim(),
                    flagCode: this.draft.flagCode?.trim().toUpperCase() || null,
                },
                this.isNew,
            );
            this.items = [...this.items.filter((i) => i.code !== saved.code), saved].sort(
                (a, b) => a.order - b.order,
            );
            this.editing = false;
            this.notice =
                'Idioma salvo. As traduções dos cadastros são publicadas quando marcadas como revisadas.';
        } catch (e) {
            this.error = (e as Error).message;
        } finally {
            this.saving = false;
            this.cd.detectChanges();
            this.renderGrid();
        }
    }
}
