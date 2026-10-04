import type { TranslatableContent, TranslationStatus } from '../services/catalog-translations';
export type CatalogTextField = 'name' | 'description';
export type CatalogTextContent = TranslatableContent & { name: string; description?: string };
export type SupplierTextField = CatalogTextField;
export type SupplierTextContent = TranslatableContent & Record<SupplierTextField, string>;
// Language changes only select a view; values remain attached to their own language.
export class CatalogLanguageEditor {
    selected = 'pt';
    value(item: CatalogTextContent, field: CatalogTextField): string {
        if (this.selected === 'pt') return item[field] ?? ''; 
        const value = item.translations?.[this.selected]?.fields[field];
        return typeof value === 'string' ? value : '';
    }
    change(item: CatalogTextContent, field: CatalogTextField, value: string) {
        if (this.selected === 'pt') { item[field] = value; return; }
        const entry = this.ensure(item);
        entry.fields[field] = value;
        entry.status = 'draft';
    }
    status(item: CatalogTextContent): TranslationStatus {
        return item.translations?.[this.selected]?.status ?? 'pending';
    }
    changeStatus(item: CatalogTextContent, status: TranslationStatus) {
        if (this.selected !== 'pt') this.ensure(item).status = status;
    }
    private ensure(item: CatalogTextContent) {
        item.translations ??= {};
        return item.translations[this.selected] ??= { status: 'pending', fields: {} };
    }
}

export class SupplierLanguageEditor extends CatalogLanguageEditor {}
