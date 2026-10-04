import { Component, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
    TranslatableContent,
    CatalogLanguage,
    ContentTranslation,
    TranslationStatus,
} from '../services/catalog-translations';
import { LanguageAdminService } from '../services/language-admin.service';
import template from './translation-editor.html?raw';
export interface TranslationField {
    key: string;
    label: string;
    limit: number;
    multiline?: boolean;
    list?: boolean;
}
export const NAME_TRANSLATION_FIELDS: TranslationField[] = [
    { key: 'name', label: 'Nome', limit: 120 },
];
export const DESCRIPTION_TRANSLATION_FIELDS: TranslationField[] = [
    ...NAME_TRANSLATION_FIELDS,
    { key: 'description', label: 'Descrição', limit: 500, multiline: true },
];
export const AFFILIATE_TRANSLATION_FIELDS: TranslationField[] = [
    { key: 'name', label: 'Nome', limit: 180 },
    ...DESCRIPTION_TRANSLATION_FIELDS.slice(1),
];
@Component({
    selector: 'crica-translation-editor',
    standalone: true,
    imports: [FormsModule],
    template,
})
export class TranslationEditorComponent implements OnInit {
    @Input({ required: true }) item!: TranslatableContent;
    @Input() fields = NAME_TRANSLATION_FIELDS;
    @Input() disabled = false;
    private api = inject(LanguageAdminService);
    private cd = inject(ChangeDetectorRef);
    languages: CatalogLanguage[] = [];
    selected = 'pt';
    loading = true;
    error = '';
    ngOnInit() {
        void this.load();
    }
    async load() {
        this.loading = true;
        this.error = '';
        try {
            this.languages = await this.api.all();
        } catch (e) {
            this.error = (e as Error).message;
        } finally {
            this.loading = false;
            this.cd.markForCheck();
        }
    }
    get translation() {
        return this.item.translations?.[this.selected];
    }
    get status() {
        return this.translation?.status || 'pending';
    }
    get targets() {
        return this.languages.filter((l) => l.code !== 'pt');
    }
    original(field: TranslationField) {
        const value = (this.item as any)[field.key];
        return Array.isArray(value) ? value.join('\n') : value || '';
    }
    value(field: TranslationField) {
        const value = this.translation?.fields[field.key];
        return Array.isArray(value) ? value.join('\n') : value || '';
    }
    ensure(): ContentTranslation {
        this.item.translations ??= {};
        return (this.item.translations[this.selected] ??= { status: 'pending', fields: {} });
    }
    change(field: TranslationField, text: string) {
        const entry = this.ensure();
        entry.fields[field.key] = field.list
            ? text
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
            : text;
        entry.status = 'draft';
    }
    changeStatus(status: TranslationStatus) {
        this.ensure().status = status;
    }
    coverage(code: string) {
        const entry = this.item.translations?.[code];
        return this.fields.filter((f) => {
            const value = entry?.fields[f.key];
            return typeof value === 'string'
                ? !!value.trim()
                : Array.isArray(value) && value.length > 0;
        }).length;
    }
    reset() {
        if (this.item.translations) delete this.item.translations[this.selected];
    }
}
