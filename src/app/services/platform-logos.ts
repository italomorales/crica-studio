export const PLATFORM_LOGOS = [
    { code: 'shopee', name: 'Shopee', url: '/assets/construction/shopee.svg' },
    { code: 'mercado', name: 'Mercado Livre', url: '/assets/construction/mercado-livre.svg' },
    { code: 'tiktok', name: 'TikTok Shop', url: '/assets/construction/tiktok-shop.png' },
    { code: 'aliexpress', name: 'AliExpress', url: '/assets/platforms/aliexpress.svg' },
    { code: 'amazon', name: 'Amazon', url: '/assets/platforms/amazon.svg' },
    { code: 'temu', name: 'Temu', url: '/assets/platforms/temu.svg' },
] as const;

export function safePlatformLogo(value: string | null | undefined): string {
    if (!value) return '';
    if (PLATFORM_LOGOS.some(logo => logo.url === value)) return value;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? value : ''; }
    catch { return ''; }
}
export function platformLogo(platform: { logoUrl: string | null; code: string }): string {
    return safePlatformLogo(platform.logoUrl);
}
