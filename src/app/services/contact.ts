export function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}
export function validQuantity(value: number): boolean {
    return Number.isSafeInteger(value) && value >= 1;
}
export function buildMessage(name: string, quantity: number, idea: string): string {
    if (!validQuantity(quantity)) throw new Error('Informe uma quantidade inteira à partir de 1.');
    return (
        `Olá! Vi ${name} no site da Crica Studio e gostaria de um orçamento. Quantidade: ${quantity}.` +
        (idea.trim() ? ` Minha ideia: ${idea.trim()}` : '')
    );
}
export function whatsappUrl(number: string, message: string): string | undefined {
    if (!/^[1-9]\d{7,14}$/.test(number)) return undefined;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
export function externalUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && !parsed.username && !parsed.password
            ? url
            : undefined;
    } catch {
        return undefined;
    }
}
