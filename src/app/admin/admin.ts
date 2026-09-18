import { Component, inject, HostListener } from '@angular/core';
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

@Component({
    selector: 'crica-admin',
    standalone: true,
    imports: [FormsModule, RouterLink, RouterLinkActive, ImagePickerComponent],
    template: adminTemplate,
})
export class AdminComponent {
    readonly pageSize = 20;
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
    };
    images: string[] = [];
    characteristics = '';
    personalization = '';
    typeDraft: CatalogType = { id: '', name: '', scope: 'both', active: true };
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
        this.notice = '';
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
        this.notice = '';
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
        this.notice = 'Cópia preparada como rascunho. Ajuste os dados e salve para cadastrá-la.';
    }
    cancel() {
        if (!this.canLeave()) return;
        this.editing = false;
        this.errors = [];
        this.notice = '';
    }
    error(error: unknown) {
        this.errors = [error instanceof Error ? error.message : 'Não foi possível salvar.'];
        setTimeout(() => document.getElementById('form-errors')?.focus());
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
            this.notice =
                d.status === 'published'
                    ? 'Cadastro publicado. Ele já aparece no catálogo deste navegador.'
                    : d.status === 'inactive'
                      ? 'Cadastro salvo como inativo.'
                      : 'Rascunho salvo. Ele ainda não aparece no catálogo.';
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
            this.notice =
                updated.status === 'draft'
                    ? 'Cadastro reativado como rascunho. Revise e publique quando estiver pronto.'
                    : 'Cadastro desativado e retirado do catálogo.';
        } catch (e) {
            this.error(e);
        }
    }
    editType(t: CatalogType) {
        this.editing = true;
        this.isNew = false;
        this.typeDraft = structuredClone(t);
        this.errors = [];
        this.notice = '';
        this.baseline = this.snapshot();
    }
    async saveType() {
        try {
            await this.catalog.saveType(this.typeDraft);
            this.editing = false;
            this.errors = [];
            this.notice = 'Tipo salvo. Os cadastros vinculados acompanham o nome atualizado.';
        } catch (e) {
            this.error(e);
        }
    }
    async toggleType(t: CatalogType) {
        try {
            await this.catalog.saveType({ ...t, active: !t.active });
            this.errors = [];
            this.notice = t.active
                ? 'Tipo desativado para novos cadastros. Os itens existentes foram preservados.'
                : 'Tipo ativado.';
        } catch (e) {
            this.error(e);
        }
    }
    async saveSettings() {
        try {
            await this.catalog.saveSettings(this.whatsapp.trim());
            this.whatsapp = this.catalog.whatsappNumber;
            this.errors = [];
            this.notice = 'Configurações salvas neste navegador.';
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
    logout() {
        if (!this.canLeave()) return;
        this.editing = false;
        this.whatsapp = this.catalog.whatsappNumber;
        this.auth.logout();
        this.router.navigateByUrl('/login');
    }
}
export const unsavedGuard: CanDeactivateFn<AdminComponent> = (component) => component.canLeave();
