export function siteTitle(title: string): string {
    return title.trim().replace(/(?:\s*[|–—-]\s*Crica Studio)+\s*$/gi, '').trim() + ' | Crica Studio';
}
