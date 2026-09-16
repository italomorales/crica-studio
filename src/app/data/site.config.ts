/** Contact must be country code + area code + number, digits only. Leave empty until confirmed. */
export const SITE_CONFIG = {
    whatsappNumber: '',
    affiliateLinks: {} as Record<string, string>,
    storefronts: [
        {
            id: 'shopee',
            name: 'Shopee',
            description: 'Encontre nossos produtos e novidades na Shopee.',
            url: 'https://collshp.com/cricastudio?view=storefront',
        },
        {
            id: 'mercado',
            name: 'Mercado Livre',
            description: 'Veja a seleção da Crica disponível no Mercado Livre.',
            url: 'https://meli.la/19kz47o',
        },
        {
            id: 'tiktok',
            name: 'TikTok Shop',
            description: 'Confira nossos produtos e novidades na TikTok Shop.',
            url: 'https://vt.tiktok.com/ZS9SpchXC1J9N-t7rS7/',
        },
    ],
};
