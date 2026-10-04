export type SiteMarket = 'br' | 'international';

export function marketForHostname(hostname: string): SiteMarket {
    return ['cricastudio.com', 'www.cricastudio.com'].includes(hostname.toLowerCase()) ? 'international' : 'br';
}
const localInternationalPreview = import.meta.env.DEV && typeof window !== 'undefined' && window.location
    && new URLSearchParams(window.location.search).get('previewMarket') === 'international';

export function currentSiteMarket(): SiteMarket {
    if (typeof window === 'undefined' || !window.location) return 'br';
    // Local preview only. Public domains always determine their own market.
    if (import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname)
        && localInternationalPreview) return 'international';
    return marketForHostname(window.location.hostname || '');
}

export function publicHomePath() { return currentSiteMarket() === 'international' ? '/fornecedores' : '/loja'; }
export function publicSiteUrl() { return currentSiteMarket() === 'international' ? 'https://www.cricastudio.com' : 'https://www.cricastudio.com.br'; }
