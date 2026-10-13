import {
    Component,
    Input,
    Output,
    EventEmitter,
    ViewChild,
    ElementRef,
    inject,
    NgZone,
} from '@angular/core';
import { createGrid, type GridApi, type ColDef } from 'ag-grid-community';
import { catalogGridTheme, catalogGridLocale } from '../admin/catalog-grid';
export function blogGridButton(kind: string, label: string, action: () => void) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'catalog-icon ' + kind;
    button.title = label;
    button.setAttribute('aria-label', label);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute(
        'd',
        kind === 'edit'
            ? 'm16 3 5 5-12 12H4v-5L16 3Zm-2 2 5 5'
            : kind === 'delete'
              ? 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'
              : kind === 'approve'
                ? 'm5 12 4 4 10-10'
                : kind === 'pending'
                  ? 'M3 12a9 9 0 1 0 3-7M3 3v6h6'
                  : kind === 'spam'
                    ? 'M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5ZM12 7v6M12 16v1'
                    : 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM6 6l12 12',
    );
    svg.append(path);
    button.append(svg);
    button.onclick = action;
    return button;
}
@Component({
    selector: 'crica-blog-record-grid',
    standalone: true,
    template:
        "<div #host class=\"catalog-grid\" [attr.aria-label]=\"kind === 'categories' ? 'Categorias do blog' : 'Moderação de demonstração'\"></div>",
})
export class BlogRecordGridComponent {
    @Input() rows: any[] = [];
    @Input() kind: 'categories' | 'moderation' = 'categories';
    @Input() pageSize = 20;
    @Output() action = new EventEmitter<{ kind: string; row: any }>();
    @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
    private zone = inject(NgZone);
    private grid?: GridApi;
    ngAfterViewInit() {
        this.grid = createGrid(this.host.nativeElement, {
            theme: catalogGridTheme,
            localeText: catalogGridLocale,
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
            columnDefs: this.columns(),
        });
    }
    ngOnChanges() {
        if (this.grid) {
            this.grid.setGridOption('rowData', this.rows);
            this.grid.setGridOption('paginationPageSize', this.pageSize);
        }
    }
    ngOnDestroy() {
        this.grid?.destroy();
    }
    private emit(kind: string, row: any) {
        this.zone.run(() => this.action.emit({ kind, row }));
    }
    private columns(): ColDef[] {
        if (this.kind === 'categories')
            return [
                {
                    headerName: 'Categoria',
                    field: 'name',
                    flex: 2,
                    minWidth: 240,
                    cellRenderer: (p: any) => {
                        const wrap = document.createElement('div');
                        wrap.className = 'catalog-product';
                        const button = document.createElement('button');
                        button.className = 'catalog-product-name';
                        button.textContent = p.data.name;
                        button.onclick = () => this.emit('edit', p.data);
                        wrap.append(button);
                        return wrap;
                    },
                },
                { headerName: 'Slug', field: 'slug', minWidth: 180, flex: 1 },
                {
                    headerName: 'Traduções',
                    valueGetter: (p) =>
                        Object.keys(p.data.translations)
                            .filter((k) => p.data.translations[k])
                            .map((k) => k.toUpperCase())
                            .join(' · '),
                    minWidth: 140,
                },
                {
                    headerName: 'Ativo',
                    width: 88,
                    sortable: false,
                    resizable: false,
                    cellRenderer: (p: any) => {
                        const button = document.createElement('button');
                        button.className = 'catalog-switch';
                        button.type = 'button';
                        button.setAttribute('role', 'switch');
                        button.setAttribute('aria-checked', String(p.data.active));
                        button.setAttribute(
                            'aria-label',
                            (p.data.active ? 'Desativar' : 'Ativar') + ' categoria ' + p.data.name,
                        );
                        button.append(document.createElement('span'));
                        button.onclick = () => this.emit('toggle', p.data);
                        return button;
                    },
                },
                this.actions(['edit', 'delete']),
            ];
        return [
            { headerName: 'Comentário', field: 'text', flex: 2, minWidth: 280 },
            { headerName: 'Visitante', field: 'name', minWidth: 180 },
            { headerName: 'Idioma', field: 'locale', width: 100 },
            {
                headerName: 'Situação',
                field: 'status',
                minWidth: 130,
                valueFormatter: (p) =>
                    ({
                        pending: 'Pendente',
                        approved: 'Aprovado',
                        rejected: 'Rejeitado',
                        spam: 'Spam',
                    })[p.value as 'pending'],
            },
            { headerName: 'Data', field: 'date', width: 140 },
            this.actions(['approve', 'reject', 'spam', 'pending']),
        ];
    }
    private actions(kinds: string[]): ColDef {
        const labels: Record<string, string> = {
            edit: 'Editar',
            delete: 'Excluir',
            approve: 'Aprovar',
            reject: 'Rejeitar',
            spam: 'Marcar spam',
            pending: 'Voltar à fila',
        };
        return {
            headerName: 'Ações',
            width: kinds.length === 2 ? 116 : 190,
            minWidth: kinds.length === 2 ? 116 : 190,
            sortable: false,
            resizable: false,
            cellRenderer: (p: any) => {
                const group = document.createElement('div');
                group.className = 'catalog-actions';
                for (const kind of kinds)
                    group.append(blogGridButton(kind, labels[kind], () => this.emit(kind, p.data)));
                return group;
            },
        };
    }
}
