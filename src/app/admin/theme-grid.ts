import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    ViewChild,
    inject,
} from '@angular/core';
import { createGrid, type ColDef, type GridApi, type ICellRendererParams } from 'ag-grid-community';
import type { CatalogTheme } from '../data/models';
import { catalogGridLocale, catalogGridTheme } from './catalog-grid';

export type ThemeAction = { kind: 'edit' | 'toggle' | 'delete'; item: CatalogTheme };
export type ThemeGridRow = CatalogTheme & { usage: number };

@Component({
    selector: 'crica-theme-grid',
    standalone: true,
    template: '<div #host class="catalog-grid" aria-label="Temas da loja"></div>',
})
export class ThemeGridComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
    @Input() rows: ThemeGridRow[] = [];
    @Input() pageSize = 20;
    @Input() readOnly = false;
    @Output() action = new EventEmitter<ThemeAction>();
    private zone = inject(NgZone);
    private api?: GridApi<ThemeGridRow>;
    private displayed: ThemeGridRow[] = [];

    ngAfterViewInit() {
        this.api = createGrid(this.host.nativeElement, {
            theme: catalogGridTheme,
            columnDefs: this.columns(),
            rowData: this.rows,
            getRowId: (p) => p.data.id,
            defaultColDef: { sortable: true, resizable: true, suppressMovable: true },
            rowHeight: 78,
            headerHeight: 46,
            animateRows: false,
            suppressScrollOnNewData: true,
            pagination: true,
            paginationPageSize: this.pageSize,
            paginationPageSizeSelector: false,
            localeText: {
                ...catalogGridLocale,
                noRowsToShow: 'Nenhum tema encontrado. Ajuste os filtros.',
            },
        });
        this.displayed = this.rows;
    }
    ngOnChanges(changes: SimpleChanges) {
        if (!this.api) return;
        // Usage is derived from linked products; getters can recreate rows on each Angular pass.
        if (
            this.rows.length !== this.displayed.length ||
            this.rows.some((row, i) => {
                const old = this.displayed[i];
                return (
                    row.id !== old.id ||
                    row.name !== old.name ||
                    row.active !== old.active ||
                    row.usage !== old.usage
                );
            })
        ) {
            this.displayed = this.rows;
            this.api.setGridOption('rowData', this.rows);
        }
        if (changes['pageSize']) this.api.setGridOption('paginationPageSize', this.pageSize);
        if (changes['readOnly']) this.api.setGridOption('columnDefs', this.columns());
    }
    ngOnDestroy() {
        this.api?.destroy();
    }
    private emit(kind: ThemeAction['kind'], row: ThemeGridRow) {
        // Keep grid-only usage metadata out of persistence operations.
        const { usage, ...item } = row;
        this.zone.run(() => this.action.emit({ kind, item }));
    }
    private columns(): ColDef<ThemeGridRow>[] {
        const columns: ColDef<ThemeGridRow>[] = [
            {
                headerName: 'Tema',
                field: 'name',
                minWidth: 240,
                flex: 2,
                cellRenderer: (p: ICellRendererParams<ThemeGridRow>) => {
                    const cell = document.createElement('div');
                    cell.className = 'catalog-product';
                    const name = document.createElement(this.readOnly ? 'span' : 'button');
                    name.className = 'catalog-product-name';
                    name.textContent = p.data!.name;
                    name.title = p.data!.name;
                    if (name instanceof HTMLButtonElement) {
                        name.type = 'button';
                        name.setAttribute('aria-label', 'Editar tema ' + p.data!.name);
                        name.onclick = () => this.emit('edit', p.data!);
                    }
                    cell.append(name);
                    return cell;
                },
            },
            { headerName: 'Produtos vinculados', field: 'usage', width: 180, minWidth: 170 },
        ];
        if (!this.readOnly)
            columns.push(
                {
                    headerName: 'Ativo',
                    colId: 'toggle',
                    width: 88,
                    sortable: false,
                    resizable: false,
                    cellRenderer: (p: ICellRendererParams<ThemeGridRow>) => {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = 'catalog-switch';
                        button.setAttribute('role', 'switch');
                        button.setAttribute('aria-checked', String(p.data!.active));
                        button.title = p.data!.active ? 'Desativar' : 'Ativar';
                        button.setAttribute('aria-label', button.title + ' tema ' + p.data!.name);
                        const track = document.createElement('span');
                        track.setAttribute('aria-hidden', 'true');
                        button.append(track);
                        button.onclick = () => this.emit('toggle', p.data!);
                        return button;
                    },
                },
                {
                    headerName: 'Ações',
                    colId: 'actions',
                    width: 116,
                    minWidth: 116,
                    sortable: false,
                    resizable: false,
                    cellRenderer: (p: ICellRendererParams<ThemeGridRow>) => {
                        const group = document.createElement('div');
                        group.className = 'catalog-actions';
                        for (const kind of ['edit', 'delete'] as const) {
                            const button = document.createElement('button');
                            button.type = 'button';
                            button.className = 'catalog-icon ' + kind;
                            button.title = kind === 'edit' ? 'Editar' : 'Excluir';
                            button.setAttribute(
                                'aria-label',
                                button.title + ' tema ' + p.data!.name,
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
                            if (kind === 'delete' && p.data!.usage > 0) {
                                button.disabled = true;
                                button.title = 'Tema em uso: desative para preservar os vínculos.';
                            }
                            button.onclick = () => this.emit(kind, p.data!);
                            group.append(button);
                        }
                        return group;
                    },
                },
            );
        return columns;
    }
}
