type ContentNode = { type?: string; text?: string; content?: ContentNode[] };

function documentText(node: ContentNode): string {
    if (node.type === 'text') return node.text || '';
    if (node.type === 'hardBreak') return ' ';
    return (node.content || []).map(documentText).join('') + ' ';
}

/** Public pages share the server estimate; editorial previews can calculate locally. */
export function blogReadingMinutes(version: { readingMinutes?: number; document?: object; html: string }): number {
    if (Number.isFinite(version.readingMinutes) && version.readingMinutes! >= 1)
        return Math.ceil(version.readingMinutes!);
    const document = version.document as ContentNode | undefined;
    const text = document && Array.isArray(document.content)
        ? documentText(document)
        : version.html.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|#160|#xA0);/gi, ' ');
    const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
    return Math.max(1, Math.ceil(words / 200));
}
