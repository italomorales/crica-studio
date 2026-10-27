import { API_URL } from './auth.service';

export type StatisticType = 'shop' | 'supplier' | 'article';
export type StatisticMetric = 'view' | 'click' | 'whatsapp';
export type StatisticSource = 'home' | 'listing' | 'direct' | 'article';

export function trackStatistic(type: StatisticType, id: string, metric: StatisticMetric, source: StatisticSource): void {
    if (typeof window === 'undefined' || !/^[0-9a-f-]{36}$/i.test(id)) return;
    const host = window.location.hostname;
    if (!['localhost','127.0.0.1','cricastudio.com','www.cricastudio.com','cricastudio.com.br','www.cricastudio.com.br'].includes(host)) return;
    if (/^\/(admin|login)(\/|$)/.test(window.location.pathname)) return;
    if (new URLSearchParams(window.location.search).get('preview') === '1') return;
    try {
        void fetch(`${API_URL}/api/statistics/events`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id, metric, source }), keepalive: true,
        }).catch(() => {});
    } catch { /* Tracking must not interrupt navigation. */ }
}

export function installStatisticClickTracking(): void {
    const handle = (event: MouseEvent) => {
        if (event.defaultPrevented || (event.type === 'click' ? event.button !== 0 : event.button !== 1) || !(event.target instanceof Element)) return;
        const target = event.target.closest<HTMLElement>('[data-stat-type][data-stat-id]');
        if (target) {
            trackStatistic(target.dataset.statType as StatisticType, target.dataset.statId!, 'click', target.dataset.statSource as StatisticSource);
            return;
        }
        const link = event.target.closest<HTMLAnchorElement>('a');
        const card = link?.closest<HTMLElement>('.blog-product-card[data-kind="shop"][data-blog-product]');
        if (card) trackStatistic('shop', card.dataset.blogProduct!, 'click', 'article');
    };
    document.addEventListener('click', handle, { capture: true });
    document.addEventListener('auxclick', handle, { capture: true });
}
