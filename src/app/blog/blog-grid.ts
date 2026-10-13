import {
    Component,
    ElementRef,
    ViewChild,
    Input,
    Output,
    EventEmitter,
    NgZone,
    inject,
} from '@angular/core';
import { createGrid, type GridApi } from 'ag-grid-community';
import { BlogApi } from './blog-api';
import { blogGridButton } from './blog-record-grid';
import { catalogGridTheme, catalogGridLocale } from '../admin/catalog-grid';
import { type BlogPost, type BlogLocale } from './blog-data';
@Component({
    selector: 'crica-blog-grid',
    standalone: true,
    template: '<div #host class="catalog-grid" aria-label="Matérias do blog"></div>',
})
export class BlogGridComponent {
    @Input() rows: BlogPost[] = [];
    @Input() locale: BlogLocale = 'pt';
    @Input() query = '';
    @Input() categoryId = '';
    @Input() status = '';
    @Input() pageSize = 20;
    @Input() refreshToken = 0;
    @Output() loaded = new EventEmitter<{ items: BlogPost[]; total: number }>();
    @Output() failed = new EventEmitter<string>();
    private api = inject(BlogApi);
    private generation = 0;
    @Output() edit = new EventEmitter<string>();
    @Output() remove = new EventEmitter<BlogPost>();
    @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
    private zone = inject(NgZone);
    private grid?: GridApi<BlogPost>;
    ngAfterViewInit() {
        const labels: Record<string, string> = {
            draft: 'Rascunho',
            published: 'Publicada',
            scheduled: 'Agendada',
            archived: 'Arquivada',
        };
        this.grid = createGrid(this.host.nativeElement, {
            theme: catalogGridTheme,
            localeText: catalogGridLocale,
            rowModelType: 'infinite',
            cacheBlockSize: 100,
            maxBlocksInCache: 3,
            pagination: true,
            paginationPageSize: this.pageSize,
            paginationPageSizeSelector: false,
            datasource: this.datasource(),
            animateRows: false,
            suppressScrollOnNewData: true,
            getRowId: (p) => p.data.id,
            rowHeight: 78,
            headerHeight: 46,
            defaultColDef: { resizable: true, sortable: false, suppressMovable: true },
            columnDefs: [
                {
                    headerName: 'Matéria',
                    flex: 2,
                    minWidth: 240,
                    valueGetter: (p) => p.data?.versions[this.locale].title || 'Tradução pendente',
                    cellRenderer: (p: any) => {
                        if (!p.data) return '';
                        const cell = document.createElement('div');
                        cell.className = 'catalog-product';
                        const image = document.createElement('img');
                        image.src = p.data.cover;
                        image.alt = '';
                        image.loading = 'lazy';
                        const text = document.createElement('div');
                        const name = document.createElement('button');
                        name.className = 'catalog-product-name';
                        name.textContent = p.value;
                        name.onclick = () => this.zone.run(() => this.edit.emit(p.data.id));
                        const subtitle = document.createElement('small');
                        subtitle.textContent = p.data.author;
                        text.append(name, subtitle);
                        cell.append(image, text);
                        return cell;
                    },
                },
                { headerName: 'Categoria', field: 'category', minWidth: 160, flex: 1 },
                {
                    headerName: 'Situação',
                    minWidth: 140,
                    valueGetter: (p) => labels[p.data?.versions[this.locale].status || 'draft'],
                    cellRenderer: (p: any) => {
                        if (!p.data) return '';
                        const status = p.data.versions[this.locale].status;
                        const badge = document.createElement('span');
                        badge.className =
                            'catalog-status ' +
                            (status === 'archived'
                                ? 'inactive'
                                : status === 'scheduled'
                                  ? 'draft'
                                  : status);
                        badge.textContent = labels[status];
                        return badge;
                    },
                },
                {
                    headerName: 'Idiomas',
                    minWidth: 160,
                    valueGetter: (p) =>
                        Object.entries(p.data?.versions || {})
                            .filter(([, v]) => v.title)
                            .map(([k, v]) => `${k.toUpperCase()}: ${labels[v.status]}`)
                            .join(' · '),
                },
                { headerName: 'Data', field: 'date', width: 120 },
                {
                    headerName: 'Ações',
                    width: 116,
                    minWidth: 116,
                    pinned: 'right',
                    resizable: false,
                    cellRenderer: (p: any) => {
                        if (!p.data) return '';
                        const group = document.createElement('div');
                        group.className = 'catalog-actions';
                        group.append(
                            blogGridButton('edit', 'Editar matéria', () =>
                                this.zone.run(() => this.edit.emit(p.data.id)),
                            ),
                        );
                        group.append(
                            blogGridButton('delete', 'Excluir matéria', () =>
                                this.zone.run(() => this.remove.emit(p.data)),
                            ),
                        );
                        return group;
                    },
                },
            ],
        });
    }
    private datasource() {
        const generation = ++this.generation;
        const filters = {
            locale: this.locale,
            query: this.query,
            status: this.status,
            ...(this.categoryId ? { categoryId: this.categoryId } : {}),
        };
        return {
            getRows: (params: any) => {
                void this.api
                    .list(true, {
                        ...filters,
                        page: Math.floor(params.startRow / 100) + 1,
                        pageSize: 100,
                    })
                    .then((data) => {
                        if (generation !== this.generation) return;
                        params.successCallback(data.items, data.total);
                        this.zone.run(() => this.loaded.emit(data));
                    })
                    .catch((e: Error) => {
                        if (generation !== this.generation) return;
                        params.failCallback();
                        this.zone.run(() => this.failed.emit(e.message));
                    });
            },
        };
    }
    ngOnChanges(changes: any) {
        if (!this.grid) return;
        if (changes.pageSize) this.grid.setGridOption('paginationPageSize', this.pageSize);
        if (Object.keys(changes).some((k) => k !== 'pageSize' && k !== 'rows'))
            this.grid.setGridOption('datasource', this.datasource());
    }

    ngOnDestroy() {
        this.generation++;
        this.grid?.destroy();
    }
}
