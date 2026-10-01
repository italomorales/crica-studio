const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = (id: string) => guid.test(id) && id !== '00000000-0000-0000-0000-000000000000';
export function parseShopFilters(query: string | null, type: string | null, themes: string | null) {
    return {
        query: query ?? '',
        typeId: type && validId(type) ? type.toLowerCase() : undefined,
        themeIds: [
            ...new Set(
                (themes ?? '')
                    .split(',')
                    .map((id) => id.trim().toLowerCase())
                    .filter(validId),
            ),
        ].slice(0, 50),
    };
}
export function shopFilterParams(filters: { query: string; typeId?: string; themeIds: string[] }) {
    return {
        q: filters.query || null,
        tipo: filters.typeId || null,
        temas: filters.themeIds.length ? filters.themeIds.join(',') : null,
    };
}
