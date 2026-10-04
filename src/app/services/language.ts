import { Pipe, signal } from '@angular/core';
import {
    initialLanguage,
    LANGUAGE_OPTIONS,
    LANGUAGE_STORAGE_KEY,
    validLanguage,
    type SiteLanguage,
} from './language-policy';
import { interfaceText } from './translations';
import { API_URL } from './auth.service';
import type { CatalogLanguage } from './catalog-translations';
const defaults: CatalogLanguage[] = LANGUAGE_OPTIONS.map((item, i) => ({
    code: item.code,
    name: item.name,
    nativeName: item.name,
    flagCode: ['BR', 'US', 'ES'][i],
    active: true,
    order: i * 10,
}));
const registeredLanguages = signal<CatalogLanguage[]>(defaults);
export const availableLanguages = registeredLanguages.asReadonly();
export async function refreshLanguages() {
    const response = await fetch(`${API_URL}/api/catalog/languages`, {
        signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Não foi possível carregar os idiomas.');
    const items = (await response.json()) as CatalogLanguage[];
    registeredLanguages.set(items.filter((item) => item.active));
    if (!items.some((item) => item.active && item.code === language())) setLanguage('pt', false);
}
export function languageFlag() {
    const flag = availableLanguages().find((item) => item.code === language())?.flagCode;
    return (
        '/assets/languages/' +
        (({ BR: 'pt', US: 'en', ES: 'es', FR: 'fr' } as Record<string, string>)[flag || ''] ||
            'world') +
        '.svg'
    );
}

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
    if (!validLanguage(value) || !availableLanguages().some((item) => item.code === value)) return;
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
    try {
        await refreshLanguages();
    } catch {
        /* Initial defaults keep the site usable during API outages. */
    }
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
    const selected = initialLanguage(hostname, saved, country, navigator.language);
    setLanguage(
        availableLanguages().some((item) => item.code === selected) ? selected : 'pt',
        false,
    );
}
export function translate(
    text: string | undefined | null,
    params: Record<string, string | number> = {},
    locale = language(),
) {
    const key = (text || '').replace(/\s+/g, ' ').trim();
    const translated = interfaceText(key, locale);
    return translated.replace(/\{(\w+)\}/g, (token, name: string) =>
        params[name] === undefined ? token : String(params[name]),
    );
}
export function localizedPrice(product: { priceMode?: string; price?: number }) {
    if (!product.priceMode || product.priceMode === 'consult' || product.price === undefined)
        return translate('Sob consulta');
    let formatter: Intl.NumberFormat;
    try {
        formatter = new Intl.NumberFormat(language() === 'pt' ? 'pt-BR' : language(), {
            style: 'currency',
            currency: 'BRL',
        });
    } catch {
        formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    const price = formatter.format(product.price);
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
