export type SiteLanguage = string;
export const LANGUAGE_STORAGE_KEY = 'crica.language';
export const LANGUAGE_OPTIONS = [
    { code: 'pt' as const, name: 'Português', flag: '🇧🇷' },
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'es' as const, name: 'Español', flag: '🇪🇸' },
];
export function validLanguage(value: unknown): value is SiteLanguage {
    return typeof value === 'string' && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value);
}
export function initialLanguage(
    hostname: string,
    saved: unknown,
    _country?: string,
    browserLanguage = '',
): SiteLanguage {
    if (validLanguage(saved)) return saved;
    if (!['cricastudio.com', 'www.cricastudio.com'].includes(hostname.toLowerCase())) return 'pt';
    return browserLanguage.toLowerCase().startsWith('es') ? 'es' : 'en';
}
