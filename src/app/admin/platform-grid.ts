import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { createGrid, type ColDef, type GridApi, type ICellRendererParams } from 'ag-grid-community';
import { catalogGridLocale, catalogGridTheme } from './catalog-grid';
import type { CatalogPlatform } from '../services/platform.service';
export type PlatformGridAction = { kind: 'edit' | 'toggle' | 'delete'; item: CatalogPlatform };
@Component({ selector: 'crica-platform-grid', standalone: true, template: '<div #host class="catalog-grid" aria-label="Plataformas"></div>' })
export class PlatformGridComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
    @Input() rows: CatalogPlatform[] = [];
    @Input() pageSize = 20;
    @Input() busy = false;
    @Output() action = new EventEmitter<PlatformGridAction>();
    private zone = inject(NgZone);
    private api?: GridApi<CatalogPlatform>;
    private displayed = '';
    ngAfterViewInit() {
        this.api = createGrid(this.host.nativeElement, {
            theme: catalogGridTheme, columnDefs: this.columns(), rowData: this.rows, getRowId: p => p.data.id,
            defaultColDef: { sortable: true, resizable: true, suppressMovable: true },
            rowHeight: 78, headerHeight: 46, animateRows: false, suppressScrollOnNewData: true,
            pagination: true, paginationPageSize: this.pageSize, paginationPageSizeSelector: false,
            localeText: { ...catalogGridLocale, noRowsToShow: 'Nenhuma plataforma encontrada. Ajuste os filtros.' },
        });
        this.displayed = JSON.stringify(this.rows);
    }
    ngOnChanges(changes: SimpleChanges) {
        if (!this.api) return;
        const snapshot = JSON.stringify(this.rows);
        if (snapshot !== this.displayed) { this.displayed = snapshot; this.api.setGridOption('rowData', this.rows); }
        if (changes['pageSize']) this.api.setGridOption('paginationPageSize', this.pageSize);
        if (changes['busy']) this.api.refreshCells({ force: true, columns: ['toggle', 'actions', 'name'] });
    }
    ngOnDestroy() { this.api?.destroy(); }
    private emit(kind: PlatformGridAction['kind'], item: CatalogPlatform) {
        if (!this.busy) this.zone.run(() => this.action.emit({ kind, item }));
    }
    private columns(): ColDef<CatalogPlatform>[] {
        return [
            { headerName: 'Plataforma', field: 'name', minWidth: 220, flex: 2, cellRenderer: (p: ICellRendererParams<CatalogPlatform>) => {
                const cell = document.createElement('div'); cell.className = 'catalog-product';
                const name = document.createElement('button'); name.type = 'button'; name.className = 'catalog-product-name';
                name.textContent = p.data!.name; name.title = p.data!.name; name.disabled = this.busy;
                name.setAttribute('aria-label', `Editar plataforma ${p.data!.name}`); name.onclick = () => this.emit('edit', p.data!); cell.append(name); return cell;
            } },
            { headerName: 'Código', field: 'code', minWidth: 140, flex: 1 },
            { headerName: 'Idioma', field: 'locale', width: 120 },
            { headerName: 'País', field: 'countryCode', width: 100, valueFormatter: p => p.value === '*' ? 'Todos' : p.value },
            { headerName: 'Produtos vinculados', field: 'productCount', width: 175 },
            { headerName: 'Vitrine pública', field: 'status', width: 145, valueFormatter: p => p.value === 'published' ? 'Publicada' : p.value === 'inactive' ? 'Inativa' : 'Rascunho' },
            { headerName: 'Ordem', field: 'order', width: 100 },
            { headerName: 'Ativo', colId: 'toggle', width: 88, sortable: false, resizable: false, cellRenderer: (p: ICellRendererParams<CatalogPlatform>) => {
                const button = document.createElement('button'); button.type = 'button'; button.className = 'catalog-switch'; button.disabled = this.busy;
                button.setAttribute('role', 'switch'); button.setAttribute('aria-checked', String(p.data!.active));
                button.title = p.data!.active ? 'Desativar' : 'Ativar'; button.setAttribute('aria-label', `${button.title} plataforma ${p.data!.name}`);
                const track = document.createElement('span'); track.setAttribute('aria-hidden', 'true'); button.append(track);
                button.onclick = () => this.emit('toggle', p.data!); return button;
            } },
            { headerName: 'Ações', colId: 'actions', width: 116, minWidth: 116, sortable: false, resizable: false, cellRenderer: (p: ICellRendererParams<CatalogPlatform>) => {
                const group = document.createElement('div'); group.className = 'catalog-actions';
                for (const kind of ['edit', 'delete'] as const) {
                    const button = document.createElement('button'); button.type = 'button'; button.className = 'catalog-icon ' + kind; button.disabled = this.busy;
                    button.title = kind === 'edit' ? 'Editar' : 'Excluir'; button.setAttribute('aria-label', `${button.title} plataforma ${p.data!.name}`);
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
                    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', kind === 'edit' ? 'm16 3 5 5-12 12H4v-5L16 3Zm-2 2 5 5' : 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7');
                    svg.append(path); button.append(svg); button.onclick = () => this.emit(kind, p.data!); group.append(button);
                }
                return group;
            } },
        ];
    }
}
