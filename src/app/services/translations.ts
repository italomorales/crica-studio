import en from './locales/en.ts';
import es from './locales/es.ts';

// Add a dictionary here when implementing a new interface language.
// Portuguese is the source text in the templates; catalog content is separate.
export const INTERFACE_DICTIONARIES: Readonly<Record<string, Readonly<Record<string, string>>>> = { en, es };
export function interfaceText(key: string, locale: string): string {
    if (locale === 'pt' || locale.split('-')[0] === 'pt') return key;
    return INTERFACE_DICTIONARIES[locale]?.[key]?.trim()
        || INTERFACE_DICTIONARIES[locale.split('-')[0]]?.[key]?.trim()
        || key;
}
