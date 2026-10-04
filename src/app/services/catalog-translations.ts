import { Pipe } from '@angular/core';
import { language } from './language';
export type TranslationStatus = 'pending' | 'draft' | 'reviewed';
export interface ContentTranslation {
    status: TranslationStatus;
    fields: Record<string, string | string[] | null>;
}
export interface TranslatableContent {
    translations?: Record<string, ContentTranslation>;
    original?: Record<string, unknown>;
}
export interface CatalogLanguage {
    code: string;
    name: string;
    nativeName: string;
    flagCode: string | null;
    active: boolean;
    order: number;
}
export function contentField(
    item: object | null | undefined,
    field: string,
    locale = language(),
): any {
    if (!item) return '';
    if (field === 'category' && (item as any).categoryType)
        return contentField((item as any).categoryType, 'name', locale);
    if (field === 'platform' && (item as any).platformContent)
        return contentField((item as any).platformContent, 'name', locale);
    const metadata=item as TranslatableContent;
    const translated = metadata.translations?.[locale];
    const value = translated?.status === 'reviewed' ? translated.fields[field] : undefined;
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value) && value.some((text) => text.trim()))
        return value.filter((text) => text.trim());
    return metadata.original?.[field] ?? (item as any)[field] ?? '';
}
@Pipe({ name: 'content', standalone: true, pure: false })
export class ContentPipe {
    transform(item: object | null | undefined, field: string) {
        return contentField(item, field);
    }
}
