import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    OnChanges,
    SimpleChanges,
    OnDestroy,
    Output,
    ViewChild,
    inject,
} from '@angular/core';
import {
    AllCommunityModule,
    ModuleRegistry,
    createGrid,
    themeQuartz,
    type GridApi,
    type ColDef,
    type ICellRendererParams,
} from 'ag-grid-community';
import type { Product, AffiliateProduct } from '../data/models';
import { priceLabel } from '../services/local-store';
ModuleRegistry.registerModules([AllCommunityModule]);
export type CatalogRow = Product | AffiliateProduct;
export type CatalogAction = {
    kind: 'edit' | 'duplicate' | 'delete' | 'toggle' | 'feature';
    item: CatalogRow;
};
const paths = {
    edit: 'm16 3 5 5-12 12H4v-5L16 3Zm-2 2 5 5',
    duplicate: 'M9 9h12v12H9zM15 9V3H3v12h6',
    delete: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
    feature: 'm12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.5l6.2-.9Z',
};
@Component({
    selector: 'crica-catalog-grid',
    standalone: true,
    template:
        '<div #host class="catalog-grid" [class.organizing]="organizing" [attr.aria-label]="organizing ? \'Organizar exibição do catálogo\' : \'Cadastros do catálogo\'"></div>',
})
export class CatalogGridComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
    @Input() rows: CatalogRow[] = [];
    @Input() suppliers = false;
    @Input() organizing = false;
    @Input() busy = false;
    @Input() pageSize = 20;
    @Input() selectedId = '';
    @Output() action = new EventEmitter<CatalogAction>();
    @Output() reordered = new EventEmitter<CatalogRow[]>();
    @Output() selected = new EventEmitter<string>();
    private zone = inject(NgZone);
    private api?: GridApi<CatalogRow>;
    private displayed: CatalogRow[] = [];
    ngAfterViewInit() {
        this.api = createGrid<CatalogRow>(this.host.nativeElement, {
            theme: themeQuartz.withParams({
                accentColor: '#0865aa',
                backgroundColor: '#ffffff',
                foregroundColor: '#26384c',
                headerBackgroundColor: '#f6f8fb',
                headerTextColor: '#596a7e',
                borderColor: '#e4eaf1',
                rowHoverColor: '#f5f9fd',
                fontFamily: 'inherit',
                fontSize: 13,
                headerFontSize: 12,
                wrapperBorderRadius: 12,
                cellHorizontalPadding: 16,
            }),
            columnDefs: this.columns(),
            rowData: this.rows,
            getRowId: (p) => p.data.id,
            defaultColDef: { sortable: !this.organizing, resizable: true, suppressMovable: true },
            rowHeight: 78,
            headerHeight: 46,
            animateRows: false,
            suppressScrollOnNewData: true,
            pagination: !this.organizing,
            paginationPageSize: this.pageSize,
            paginationPageSizeSelector: false,
            rowDragManaged: this.organizing,
            suppressMoveWhenRowDragging: true,
            suppressDragLeaveHidesColumns: true,
            rowClassRules: {
                'catalog-row-selected': (p) => this.organizing && p.data?.id === this.selectedId,
            },
            onRowClicked: (e) => {
                if (this.organizing && e.data) this.zone.run(() => this.selected.emit(e.data!.id));
            },
            onCellKeyDown: (e) => {
                if (this.organizing && e.data && (e.event as KeyboardEvent)?.key === 'Enter')
                    this.zone.run(() => this.selected.emit(e.data!.id));
            },
            onRowDragEnd: (e) => {
                const rows: CatalogRow[] = [];
                e.api.forEachNodeAfterFilterAndSort((n) => {
                    if (n.data) rows.push(n.data);
                });
                this.zone.run(() => {
                    this.selected.emit(e.node.data!.id);
                    this.reordered.emit(rows);
                });
            },
            localeText: {
                noRowsToShow: 'Nenhum cadastro encontrado. Ajuste os filtros.',
                page: 'Página',
                of: 'de',
                to: 'a',
                more: 'mais',
                nextPage: 'Próxima página',
                lastPage: 'Última página',
                firstPage: 'Primeira página',
                previousPage: 'Página anterior',
                pageSizeSelectorLabel: 'Por página',
                ariaRowDrag: 'Arraste para alterar a posição',
                ariaPageSizeSelectorLabel: 'Cadastros por página',
            },
        });
        this.displayed = this.rows;
    }
    ngOnChanges(changes: SimpleChanges) {
        if (!this.api) return;
        // Parent getters can return new arrays on each change-detection pass.
        if (
            this.displayed.length !== this.rows.length ||
            this.displayed.some((row, i) => row !== this.rows[i])
        ) {
            this.displayed = this.rows;
            this.api.setGridOption('rowData', this.rows);
            if (this.organizing) this.api.refreshCells({ columns: ['position'], force: true });
        }
        if (changes['pageSize']) this.api.setGridOption('paginationPageSize', this.pageSize);
        if (changes['busy']) this.api.setGridOption('suppressRowDrag', this.busy);
        if (changes['selectedId']) this.api.redrawRows();
    }
    reveal(id: string) {
        const node = this.api?.getRowNode(id);
        if (node) this.api?.ensureNodeVisible(node, 'middle');
    }
    ngOnDestroy() {
        this.api?.destroy();
    }
    private columns(): ColDef<CatalogRow>[] {
        const columns: ColDef<CatalogRow>[] = [];
        if (this.organizing)
            columns.push({
                headerName: 'Posição',
                colId: 'position',
                width: 108,
                sortable: false,
                resizable: false,
                rowDrag: true,
                valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
            });
        columns.push({
            headerName: this.suppliers ? 'Fornecedor' : 'Produto',
            field: 'name',
            minWidth: 260,
            flex: 2,
            cellRenderer: (p: ICellRendererParams<CatalogRow>) => this.productCell(p.data!),
        });
        if (!this.organizing)
            columns.push({
                headerName: this.suppliers ? 'Plataforma' : 'Preço',
                colId: 'detail',
                width: 150,
                minWidth: 135,
                valueGetter: (p) =>
                    p.data
                        ? this.suppliers
                            ? (p.data as AffiliateProduct).platform
                            : priceLabel(p.data as Product)
                        : '',
                comparator: (a, b, nodeA, nodeB) =>
                    this.suppliers
                        ? String(a).localeCompare(String(b))
                        : ((nodeA.data as Product)?.price ?? 0) -
                          ((nodeB.data as Product)?.price ?? 0),
            });
        columns.push({
            headerName: 'Status',
            field: 'status',
            width: 124,
            minWidth: 114,
            sortable: !this.organizing,
            cellRenderer: (p: ICellRendererParams<CatalogRow>) => {
                const span = document.createElement('span');
                span.className = 'catalog-status ' + p.data!.status;
                span.textContent =
                    p.data!.status === 'published'
                        ? 'Publicado'
                        : p.data!.status === 'inactive'
                          ? 'Inativo'
                          : 'Rascunho';
                return span;
            },
        });
        if (!this.organizing) {
            columns.push({
                headerName: 'Ativo',
                colId: 'active',
                width: 88,
                sortable: false,
                resizable: false,
                cellRenderer: (p: ICellRendererParams<CatalogRow>) => {
                    const item = p.data!;
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'catalog-switch';
                    button.setAttribute('role', 'switch');
                    button.setAttribute('aria-checked', String(item.status !== 'inactive'));
                    button.setAttribute(
                        'aria-label',
                        (item.status === 'inactive' ? 'Ativar ' : 'Desativar ') + item.name,
                    );
                    button.title =
                        item.status === 'inactive' ? 'Ativar como rascunho' : 'Desativar';
                    const track = document.createElement('span');
                    track.setAttribute('aria-hidden', 'true');
                    button.append(track);
                    button.onclick = (e) => {
                        e.stopPropagation();
                        this.zone.run(() => this.action.emit({ kind: 'toggle', item }));
                    };
                    return button;
                },
            });
            columns.push({
                headerName: 'Ações',
                colId: 'actions',
                width: 202,
                minWidth: 202,
                sortable: false,
                resizable: false,
                cellRenderer: (p: ICellRendererParams<CatalogRow>) => {
                    const item = p.data!;
                    const group = document.createElement('div');
                    group.className = 'catalog-actions';
                    for (const kind of ['feature', 'edit', 'duplicate', 'delete'] as const) {
                        const labels = {
                            feature: item.featured ? 'Remover dos destaques' : 'Destacar',
                            edit: 'Editar',
                            duplicate: 'Duplicar',
                            delete: 'Excluir',
                        };
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className =
                            'catalog-icon ' +
                            kind +
                            (kind === 'feature' && item.featured ? ' is-featured' : '');
                        button.title = labels[kind];
                        button.setAttribute('aria-label', labels[kind] + ' ' + item.name);
                        if (kind === 'feature')
                            button.setAttribute('aria-pressed', String(!!item.featured));
                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svg.setAttribute('viewBox', '0 0 24 24');
                        svg.setAttribute('aria-hidden', 'true');
                        const path = document.createElementNS(svg.namespaceURI, 'path');
                        path.setAttribute('d', paths[kind]);
                        svg.append(path);
                        button.append(svg);
                        button.onclick = (e) => {
                            e.stopPropagation();
                            this.zone.run(() => this.action.emit({ kind, item }));
                        };
                        group.append(button);
                    }
                    return group;
                },
            });
        }
        return columns;
    }
    private productCell(item: CatalogRow) {
        const cell = document.createElement('div');
        cell.className = 'catalog-product';
        const image = document.createElement('img');
        image.alt = '';
        image.loading = 'lazy';
        image.src =
            item.images?.[0] ||
            (item as AffiliateProduct).image ||
            '/assets/crica-studio-logo-transparent.png';
        image.onerror = () => {
            image.onerror = null;
            image.src = '/assets/crica-studio-logo-transparent.png';
            image.classList.add('fallback');
        };
        cell.append(image);
        const text = document.createElement('div');
        const title = document.createElement(this.organizing ? 'span' : 'button');
        title.textContent = item.name;
        title.className = 'catalog-product-name';
        title.title = item.name;
        if (title instanceof HTMLButtonElement) {
            title.type = 'button';
            title.onclick = (e) => {
                e.stopPropagation();
                this.zone.run(() => this.action.emit({ kind: 'edit', item }));
            };
        }
        const subtitle = document.createElement('small');
        subtitle.textContent = item.category || 'Sem tipo';
        text.append(title, subtitle);
        cell.append(text);
        return cell;
    }
}
