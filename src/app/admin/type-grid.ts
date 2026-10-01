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
import type { CatalogType } from '../data/models';
import { catalogGridLocale, catalogGridTheme } from './catalog-grid';

export type TypeAction = { kind: 'edit' | 'toggle' | 'delete'; item: CatalogType };
export type TypeGridRow = CatalogType & { usage: number };

@Component({
    selector: 'crica-type-grid',
    standalone: true,
    template: '<div #host class="catalog-grid" aria-label="Tipos de produto"></div>',
})
export class TypeGridComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
    @Input() rows: TypeGridRow[] = [];
    @Input() pageSize = 20;
    @Input() readOnly = false;
    @Output() action = new EventEmitter<TypeAction>();
    private zone = inject(NgZone);
    private api?: GridApi<TypeGridRow>;
    private displayed: TypeGridRow[] = [];

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
                noRowsToShow: 'Nenhum tipo encontrado. Ajuste os filtros.',
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
                    row.scope !== old.scope ||
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
    private emit(kind: TypeAction['kind'], row: TypeGridRow) {
        // Keep grid-only usage metadata out of persistence operations.
        const { usage, ...item } = row;
        this.zone.run(() => this.action.emit({ kind, item }));
    }
    private columns(): ColDef<TypeGridRow>[] {
        const columns: ColDef<TypeGridRow>[] = [
            {
                headerName: 'Tipo',
                field: 'name',
                minWidth: 240,
                flex: 2,
                cellRenderer: (p: ICellRendererParams<TypeGridRow>) => {
                    const cell = document.createElement('div');
                    cell.className = 'catalog-product';
                    const name = document.createElement(this.readOnly ? 'span' : 'button');
                    name.className = 'catalog-product-name';
                    name.textContent = p.data!.name;
                    name.title = p.data!.name;
                    if (name instanceof HTMLButtonElement) {
                        name.type = 'button';
                        name.setAttribute('aria-label', 'Editar tipo ' + p.data!.name);
                        name.onclick = () => this.emit('edit', p.data!);
                    }
                    cell.append(name);
                    return cell;
                },
            },
            {
                headerName: 'Aplicação',
                field: 'scope',
                minWidth: 180,
                flex: 1,
                valueFormatter: (p) =>
                    p.value === 'shop'
                        ? 'Loja'
                        : p.value === 'suppliers'
                          ? 'Fornecedores'
                          : 'Loja e Fornecedores',
            },
            { headerName: 'Itens vinculados', field: 'usage', width: 160, minWidth: 150 },
        ];
        if (!this.readOnly)
            columns.push(
                {
                    headerName: 'Ativo',
                    colId: 'toggle',
                    width: 88,
                    sortable: false,
                    resizable: false,
                    cellRenderer: (p: ICellRendererParams<TypeGridRow>) => {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = 'catalog-switch';
                        button.setAttribute('role', 'switch');
                        button.setAttribute('aria-checked', String(p.data!.active));
                        button.title = p.data!.active ? 'Desativar' : 'Ativar';
                        button.setAttribute('aria-label', button.title + ' tipo ' + p.data!.name);
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
                    cellRenderer: (p: ICellRendererParams<TypeGridRow>) => {
                        const group = document.createElement('div');
                        group.className = 'catalog-actions';
                        for (const kind of ['edit', 'delete'] as const) {
                            const button = document.createElement('button');
                            button.type = 'button';
                            button.className = 'catalog-icon ' + kind;
                            button.title = kind === 'edit' ? 'Editar' : 'Excluir';
                            button.setAttribute(
                                'aria-label',
                                button.title + ' tipo ' + p.data!.name,
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
