export async function shareLink(title: string, text: string, url: string) {
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
        } catch {
            // O usuário pode fechar o painel de compartilhamento sem concluir a ação.
        }
        return;
    }
    window.open(
        `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
        '_blank',
        'noopener,noreferrer',
    );
}
