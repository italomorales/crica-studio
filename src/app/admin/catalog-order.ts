/** Move one record without mutating the live catalog. Positions are zero-based. */
export function moveCatalogItem<T extends { id: string }>(
    items: T[],
    id: string,
    position: number,
): T[] {
    const from = items.findIndex((item) => item.id === id);
    if (from < 0 || !Number.isInteger(position) || position < 0 || position >= items.length)
        return items;
    const result = [...items];
    const [item] = result.splice(from, 1);
    result.splice(position, 0, item);
    return result;
}
export function sameCatalogOrder(a: { id: string }[], b: { id: string }[]) {
    return a.length === b.length && a.every((item, index) => item.id === b[index].id);
}
