import { Pipe, signal } from '@angular/core';
import {
    initialLanguage,
    LANGUAGE_OPTIONS,
    LANGUAGE_STORAGE_KEY,
    validLanguage,
    type SiteLanguage,
} from './language-policy';
import { TRANSLATIONS } from './translations';

function storedLanguage() {
    try {
        return typeof window === 'undefined'
            ? null
            : window.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
        return null;
    }
}
function defaultLanguage() {
    return initialLanguage(
        typeof window === 'undefined' ? '' : window.location?.hostname || '',
        storedLanguage(),
        undefined,
        typeof navigator === 'undefined' ? '' : navigator.language,
    );
}
const selectedLanguage = signal<SiteLanguage>(defaultLanguage());
export const language = selectedLanguage.asReadonly();
export { LANGUAGE_OPTIONS };
export function setLanguage(value: string, persist = true) {
    if (!validLanguage(value)) return;
    selectedLanguage.set(value);
    if (typeof document !== 'undefined')
        document.documentElement.lang = value === 'pt' ? 'pt-BR' : value;
    if (persist)
        try {
            window.localStorage?.setItem(LANGUAGE_STORAGE_KEY, value);
        } catch {
            /* Selection still works when storage is disabled. */
        }
}
export async function initializeLanguage() {
    const saved = storedLanguage();
    const hostname = window.location.hostname;
    let country: string | undefined;
    if (!validLanguage(saved) && ['cricastudio.com', 'www.cricastudio.com'].includes(hostname)) {
        try {
            const response = await fetch('/site-context.json', {
                cache: 'no-store',
                signal: AbortSignal.timeout(2000),
            });
            if (response.ok) country = (await response.json()).country;
        } catch {
            /* Browser language is the fallback if country detection is unavailable. */
        }
    }
    setLanguage(initialLanguage(hostname, saved, country, navigator.language), false);
}
export function translate(
    text: string | undefined | null,
    params: Record<string, string | number> = {},
    locale = language(),
) {
    const key = (text || '').replace(/\s+/g, ' ').trim();
    const translated = locale === 'pt' ? key : (TRANSLATIONS[key]?.[locale] ?? key);
    return translated.replace(/\{(\w+)\}/g, (token, name: string) =>
        params[name] === undefined ? token : String(params[name]),
    );
}
export function localizedPrice(product: { priceMode?: string; price?: number }) {
    if (!product.priceMode || product.priceMode === 'consult' || product.price === undefined)
        return translate('Sob consulta');
    const price = new Intl.NumberFormat(
        language() === 'pt' ? 'pt-BR' : language() === 'en' ? 'en-US' : 'es-ES',
        { style: 'currency', currency: 'BRL' },
    ).format(product.price);
    return product.priceMode === 'from' ? translate('A partir de {price}', { price }) : price;
}
export function localizedOrderMessage(name: string, quantity: number, idea: string) {
    return (
        translate(
            'Olá! Vi {name} no site da Crica Studio e gostaria de um orçamento. Quantidade: {quantity}.',
            { name, quantity },
        ) + (idea.trim() ? ' ' + translate('Minha ideia: {idea}', { idea: idea.trim() }) : '')
    );
}
@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe {
    transform(text: string | undefined | null, params?: Record<string, string | number>) {
        return translate(text, params);
    }
}
