/** A click expresses contact intent; it does not confirm a message or a sale. */
export const WHATSAPP_CONVERSION = 'AW-617194162/2xFkCM-lm4wdELLFpqYC';
const GA_DESTINATION = 'G-6GMXMZH5KQ';
const sources = ['floating', 'footer', 'bulk_order', 'construction', 'product', 'product_dialog'] as const;
export type WhatsAppSource = typeof sources[number];
type Sender = (command: 'event', event: string, parameters: Record<string, unknown>) => void;
interface Context { source: WhatsAppSource; productId?: string; quantity?: number }

export function isContactLink(href: string): boolean {
    try {
        const url = new URL(href);
        return url.protocol === 'https:' && url.hostname === 'wa.me' && !url.port &&
            !url.username && !url.password && /^\/[1-9]\d{7,14}\/?$/.test(url.pathname);
    } catch { return false; }
}

export function sendWhatsAppClick(href: string, context: Context, pageUrl: string, send: Sender): boolean {
    if (!isContactLink(href) || !sources.includes(context.source)) return false;
    const page = new URL(pageUrl);
    // Local previews must not produce real leads in Analytics or Ads.
    if (page.protocol !== 'https:' || !['cricastudio.com.br', 'www.cricastudio.com.br'].includes(page.hostname)) return false;
    const parameters: Record<string, unknown> = {
        send_to: GA_DESTINATION,
        contact_channel: 'whatsapp',
        contact_source: context.source,
        page_path: page.pathname,
        page_location: page.origin + page.pathname,
    };
    if (context.productId) parameters.product_id = context.productId;
    if (Number.isInteger(context.quantity) && context.quantity! >= 1) parameters.quantity = context.quantity;
    // No phone number, outgoing URL, message, or personalization text is sent.
    // Tracking failures must never prevent the WhatsApp link from opening.
    try { send('event', 'whatsapp_click', parameters); } catch { /* Analytics unavailable */ }
    try {
        send('event', 'conversion', {
            send_to: WHATSAPP_CONVERSION, value: 0, currency: 'BRL',
            page_location: page.origin + page.pathname,
        });
    } catch { /* Ads unavailable */ }
    return true;
}

export function trackWhatsAppClick(href: string, context: Context): void {
    if (typeof window === 'undefined') return;
    const sender = (window as Window & { gtag?: Sender }).gtag;
    if (typeof sender !== 'function') return;
    sendWhatsAppClick(href, context, window.location.href, sender);
}

export function installWhatsAppTracking(): void {
    const handle = (event: MouseEvent) => {
        if (event.defaultPrevented || (event.type === 'click' ? event.button !== 0 : event.button !== 1)) return;
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest<HTMLAnchorElement>('a[data-whatsapp-source]');
        if (!link) return;
        trackWhatsAppClick(link.href, { source: link.dataset.whatsappSource as WhatsAppSource });
    };
    document.addEventListener('click', handle);
    document.addEventListener('auxclick', handle);
}
