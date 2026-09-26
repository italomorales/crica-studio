import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    ActivatedRoute,
    Router,
    RouterLink,
    RouterLinkActive,
    CanDeactivateFn,
} from '@angular/router';
import { AdminCatalogService } from '../services/admin-catalog.service';
import { AuthService } from '../services/auth.service';
import { normalize } from '../services/contact';
import { priceLabel, PLATFORMS, validateItem, validateType } from '../services/local-store';
import type { Product, AffiliateProduct, CatalogType, ItemStatus } from '../data/models';
import { ImagePickerComponent } from './image-picker';
import adminTemplate from './admin.html?raw';

type DeletionTarget = {
    id: string;
    name: string;
    kind: 'produto' | 'fornecedor' | 'tipo';
};

@Component({
    selector: 'crica-admin',
    standalone: true,
    imports: [FormsModule, RouterLink, RouterLinkActive, ImagePickerComponent],
    template: adminTemplate,
})
export class AdminComponent {
    @ViewChild('deleteDialog', { static: true }) deleteDialog!: ElementRef<HTMLDialogElement>;
    pageSize = 20;
    catalog = inject(AdminCatalogService);
    auth = inject(AuthService);
    router = inject(Router);
    route = inject(ActivatedRoute);
    section = this.route.snapshot.data['section'] as string;
    platforms = PLATFORMS;
    query = '';
    status = 'all';
    typeFilter = 'all';
    platformFilter = 'all';
    page = 1;
    notice = '';
    noticeTone: 'success' | 'error' = 'success';
    private noticeTimer?: number;
    errors: string[] = [];
    editing = false;
    isNew = false;
    baseline = '';
    whatsapp = this.catalog.whatsappNumber;
    readonly readOnly = false;
    draft: Product & Partial<AffiliateProduct> = {
        id: '',
        name: '',
        category: '',
        description: '',
        images: [],
        characteristics: [],
        personalization: [],
        demo: true,
        featured: false,
    };
    images: string[] = [];
    characteristics = '';
    personalization = '';
    typeDraft: CatalogType = { id: '', name: '', scope: 'both', active: true };
    deletionTarget?: DeletionTarget;
    deleting = false;
    deletionError = '';
    get title() {
        return (
            {
                loja: 'Produtos da loja',
                fornecedores: 'Fornecedores',
                tipos: 'Tipos de produto',
                configuracoes: 'Configurações',
            } as Record<string, string>
        )[this.section];
    }
    get subtitle() {
        return this.editing
            ? 'Dê forma aos detalhes que aparecem no catálogo.'
            : (
                  {
                      loja: 'Cuide dos modelos que levam a ideia do cliente até a Crica.',
                      fornecedores: 'Cada indicação tem seu próprio cadastro e sua plataforma.',
                      tipos: 'Organize seus produtos com tipos simples e reutilizáveis.',
                      configuracoes: 'Contato e preferências da sua demonstração.',
                  } as Record<string, string>
              )[this.section];
    }
    get items() {
        return this.section === 'loja' ? this.catalog.allProducts : this.catalog.allAffiliates;
    }
    get filtered() {
        return this.items.filter(
            (p) =>
                normalize(p.name).includes(normalize(this.query)) &&
                (this.status === 'all' || p.status === this.status) &&
                (this.typeFilter === 'all' || p.typeId === this.typeFilter) &&
                (this.platformFilter === 'all' ||
                    (p as AffiliateProduct).platform === this.platformFilter),
        );
    }
    get pageCount() {
        return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    }
    get paginated() {
        const start = (Math.min(this.page, this.pageCount) - 1) * this.pageSize;
        return this.filtered.slice(start, start + this.pageSize);
    }
    get firstVisibleItem() {
        return this.filtered.length ? (Math.min(this.page, this.pageCount) - 1) * this.pageSize + 1 : 0;
    }
    get lastVisibleItem() {
        return Math.min(this.firstVisibleItem + this.pageSize - 1, this.filtered.length);
    }
    get sectionTypes() {
        return this.catalog.types.filter(
            (t) =>
                t.scope === 'both' || t.scope === (this.section === 'loja' ? 'shop' : 'suppliers'),
        );
    }
    get availableTypes() {
        return this.sectionTypes.filter((t) => t.active || t.id === this.draft.typeId);
    }
    get filteredTypes() {
        return this.catalog.types.filter(
            (t) =>
                normalize(t.name).includes(normalize(this.query)) &&
                (this.status === 'all' || t.active === (this.status === 'active')),
        );
    }
    count(status: ItemStatus) {
        return this.items.filter((p) => p.status === status).length;
    }
    price(item: Product | AffiliateProduct) {
        return priceLabel(item as Product);
    }
    statusLabel(status?: ItemStatus) {
        return status === 'published'
            ? 'Publicado'
            : status === 'inactive'
              ? 'Inativo'
              : 'Rascunho';
    }
    scopeLabel(scope: string) {
        return scope === 'shop'
            ? 'Loja'
            : scope === 'suppliers'
              ? 'Fornecedores'
              : 'Loja e Fornecedores';
    }
    usage(id: string) {
        return [...this.catalog.allProducts, ...this.catalog.allAffiliates].filter(
            (p) => p.typeId === id,
        ).length;
    }
    itemImage(item: Product | AffiliateProduct) {
        return 'images' in item ? item.images[0] : (item as AffiliateProduct).image;
    }
    snapshot() {
        return JSON.stringify(
            this.section === 'tipos'
                ? this.typeDraft
                : {
                      draft: this.draft,
                      images: this.images,
                      characteristics: this.characteristics,
                      personalization: this.personalization,
                  },
        );
    }
    get dirty() {
        return (
            (this.editing && this.baseline !== this.snapshot()) ||
            (this.section === 'configuracoes' && this.whatsapp !== this.catalog.whatsappNumber)
        );
    }
    canLeave() {
        return !this.dirty || window.confirm('Há alterações não salvas. Deseja sair sem salvar?');
    }
    @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
        if (this.dirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
    create() {
        this.errors = [];
        this.dismissNotice();
        this.isNew = true;
        this.editing = true;
        if (this.section === 'tipos') {
            this.typeDraft = {
                id:
                    'item-' +
                    Date.now().toString(36) +
                    '-' +
                    Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) =>
                        n.toString(36),
                    ).join('-'),
                name: '',
                scope: 'both',
                active: true,
            };
        } else {
            this.draft = {
                id:
                    'item-' +
                    Date.now().toString(36) +
                    '-' +
                    Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) =>
                        n.toString(36),
                    ).join('-'),
                name: '',
                category: '',
                typeId: '',
                description: '',
                fullDescription: '',
                images: [],
                characteristics: [],
                personalization: [],
                demo: true,
                featured: false,
                priceMode: 'consult',
                status: 'draft',
                order: this.items.reduce((n, p) => Math.max(n, p.order || 0), 0) + 10,
                platform: 'Shopee',
                seller: '',
                url: '',
                demoListing: false,
            };
            this.images = [];
            this.characteristics = '';
            this.personalization = '';
        }
        this.baseline = this.snapshot();
        window.scrollTo(0, 0);
    }
    edit(item: Product | AffiliateProduct) {
        this.errors = [];
        this.dismissNotice();
        this.isNew = false;
        this.editing = true;
        this.draft = {
            images: [],
            characteristics: [],
            personalization: [],
            demo: true,
            ...structuredClone(item),
        };
        this.images = 'images' in item ? [...item.images] : item.image ? [item.image] : [];
        this.characteristics = this.draft.characteristics.join('\n');
        this.personalization = this.draft.personalization.join('\n');
        this.baseline = this.snapshot();
        window.scrollTo(0, 0);
    }
    duplicate(item: Product | AffiliateProduct) {
        this.edit(item);
        this.draft.id =
            'item-' +
            Date.now().toString(36) +
            '-' +
            Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join('-');
        this.draft.name = item.name + ' (cópia)';
        this.draft.status = 'draft';
        this.isNew = true;
        this.baseline = this.snapshot();
        this.showNotice('Cópia preparada como rascunho. Ajuste os dados e salve para cadastrá-la.');
    }
    cancel() {
        if (!this.canLeave()) return;
        this.editing = false;
        this.errors = [];
        this.dismissNotice();
    }
    showNotice(message: string, tone: 'success' | 'error' = 'success') {
        this.notice = message;
        this.noticeTone = tone;
        window.clearTimeout(this.noticeTimer);
        this.noticeTimer = window.setTimeout(() => this.dismissNotice(), 5000);
    }
    dismissNotice() {
        window.clearTimeout(this.noticeTimer);
        this.notice = '';
    }
    error(error: unknown) {
        const message = error instanceof Error ? error.message : 'Não foi possível salvar.';
        this.errors = [message];
        this.showNotice(message, 'error');
        if (this.editing) setTimeout(() => document.getElementById('form-errors')?.focus());
    }
    async save(status?: ItemStatus) {
        this.errors = [];
        const d = { ...structuredClone(this.draft), status: status ?? this.draft.status };
        const item =
            this.section === 'loja'
                ? {
                      ...d,
                      images: [...this.images],
                      characteristics: this.characteristics
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      personalization: this.personalization
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                  }
                : { ...d, image: this.images[0] || undefined };
        try {
            if (this.section === 'loja') await this.catalog.saveProduct(item as Product);
            else await this.catalog.saveAffiliate(item as AffiliateProduct);
            this.editing = false;
            this.showNotice(
                d.status === 'published'
                    ? 'Cadastro publicado. Ele já aparece no catálogo deste navegador.'
                    : d.status === 'inactive'
                      ? 'Cadastro salvo como inativo.'
                      : 'Rascunho salvo. Ele ainda não aparece no catálogo.',
            );
            window.scrollTo(0, 0);
        } catch (e) {
            this.error(e);
        }
    }
    async toggle(item: Product | AffiliateProduct) {
        this.errors = [];
        try {
            const updated = {
                ...item,
                status: (item.status === 'inactive' ? 'draft' : 'inactive') as ItemStatus,
            };
            this.section === 'loja'
                ? await this.catalog.saveProduct(updated as Product)
                : await this.catalog.saveAffiliate(updated as AffiliateProduct);
            this.showNotice(
                updated.status === 'draft'
                    ? 'Cadastro reativado como rascunho. Revise e publique quando estiver pronto.'
                    : 'Cadastro desativado e retirado do catálogo.',
            );
        } catch (e) {
            this.error(e);
        }
    }
    async toggleFeatured(item: Product | AffiliateProduct) {
        if (item.status !== 'published') {
            this.error(new Error('Publique o cadastro antes de colocá-lo em destaque.'));
            return;
        }
        this.errors = [];
        try {
            const updated = { ...item, featured: !item.featured };
            if (this.section === 'loja') await this.catalog.saveProduct(updated as Product);
            else await this.catalog.saveAffiliate(updated as AffiliateProduct);
            this.showNotice(updated.featured ? 'Cadastro adicionado aos destaques.' : 'Cadastro removido dos destaques.');
        } catch (e) {
            this.error(e);
        }
    }
    requestRemoval(item: Product | AffiliateProduct) {
        this.openDeletion({
            id: item.id,
            name: item.name,
            kind: this.section === 'loja' ? 'produto' : 'fornecedor',
        });
    }
    private openDeletion(target: DeletionTarget) {
        this.deletionTarget = target;
        this.deletionError = '';
        this.deleteDialog.nativeElement.showModal();
        setTimeout(() => this.deleteDialog.nativeElement.querySelector<HTMLElement>('[autofocus]')?.focus());
    }
    cancelDeletion() {
        if (!this.deleting) this.deleteDialog.nativeElement.close();
    }
    onDeleteDialogClose() {
        this.deletionTarget = undefined;
        this.deletionError = '';
        this.deleting = false;
    }
    onDeleteDialogCancel(event: Event) {
        if (this.deleting) event.preventDefault();
    }
    onDeleteDialogBackdrop(event: MouseEvent) {
        if (event.target === this.deleteDialog.nativeElement) this.cancelDeletion();
    }
    async confirmDeletion() {
        const target = this.deletionTarget;
        if (!target) return;
        this.deleting = true;
        this.deletionError = '';
        try {
            if (target.kind === 'produto') await this.catalog.deleteProduct(target.id);
            else if (target.kind === 'fornecedor') await this.catalog.deleteAffiliate(target.id);
            else await this.catalog.deleteType(target.id);
            this.showNotice(`${target.kind === 'tipo' ? 'Tipo' : target.kind === 'produto' ? 'Produto' : 'Fornecedor'} excluído.`);
            this.deleting = false;
            this.deleteDialog.nativeElement.close();
        } catch (e) {
            this.deletionError = e instanceof Error ? e.message : 'Não foi possível excluir.';
            this.deleting = false;
        }
    }
    editType(t: CatalogType) {
        this.editing = true;
        this.isNew = false;
        this.typeDraft = structuredClone(t);
        this.errors = [];
        this.dismissNotice();
        this.baseline = this.snapshot();
    }
    async saveType() {
        try {
            await this.catalog.saveType(this.typeDraft);
            this.editing = false;
            this.errors = [];
            this.showNotice('Tipo salvo. Os cadastros vinculados acompanham o nome atualizado.');
        } catch (e) {
            this.error(e);
        }
    }
    async toggleType(t: CatalogType) {
        try {
            await this.catalog.saveType({ ...t, active: !t.active });
            this.errors = [];
            this.showNotice(t.active
                ? 'Tipo desativado para novos cadastros. Os itens existentes foram preservados.'
                : 'Tipo ativado.');
        } catch (e) {
            this.error(e);
        }
    }
    requestTypeRemoval(t: CatalogType) {
        const linkedItems = this.usage(t.id);
        if (linkedItems) {
            this.error(new Error(`Este tipo possui ${linkedItems} ${linkedItems === 1 ? 'cadastro vinculado' : 'cadastros vinculados'} e não pode ser excluído.`));
            return;
        }
        this.openDeletion({ id: t.id, name: t.name, kind: 'tipo' });
    }
    async saveSettings() {
        try {
            await this.catalog.saveSettings(this.whatsapp.trim());
            this.whatsapp = this.catalog.whatsappNumber;
            this.errors = [];
            this.showNotice('Configurações salvas neste navegador.');
        } catch (e) {
            this.error(e);
        }
    }
    clear() {
        this.query = '';
        this.status = 'all';
        this.typeFilter = 'all';
        this.platformFilter = 'all';
        this.resetPage();
    }
    resetPage() {
        this.page = 1;
    }
    setPage(page: number) {
        this.page = Math.min(Math.max(page, 1), this.pageCount);
    }
    setPageSize(size: number) {
        this.pageSize = [20, 50, 100].includes(Number(size)) ? Number(size) : 20;
        this.resetPage();
    }
    logout() {
        if (!this.canLeave()) return;
        this.editing = false;
        this.whatsapp = this.catalog.whatsappNumber;
        this.auth.logout();
        this.router.navigateByUrl('/login');
    }
}
export const unsavedGuard: CanDeactivateFn<AdminComponent> = (component) => component.canLeave();
