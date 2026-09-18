import { mkdir, readFile, writeFile } from 'node:fs/promises';

const siteUrl = 'https://cricastudio.com';
const defaultPage = {
    title: 'Canecas e Bottons Personalizados | Crica Studio',
    description:
        'Conheça canecas e bottons personalizados da Crica Studio para pessoas, empresas, eventos e pedidos em quantidade.',
};
const pages = {
    loja: defaultPage,
    fornecedores: {
        title: 'Máquinas de Bottons e Canecas para Personalizar | Crica Studio',
        description:
            'Confira indicações de canecas para personalizar, máquinas de fazer bottons e materiais para sua produção.',
    },
    vitrine: {
        title: 'Vitrines da Crica Studio | Produtos Personalizados',
        description:
            'Encontre os produtos personalizados da Crica Studio nas plataformas parceiras de sua preferência.',
    },
    login: {
        title: 'Entrar | Crica Studio',
        description: 'Acesso à administração da Crica Studio.',
        indexable: false,
    },
    admin: {
        title: 'Administração | Crica Studio',
        description: 'Área administrativa da Crica Studio.',
        indexable: false,
    },
};
const routes = [
    'loja',
    'fornecedores',
    'vitrine',
    'login',
    'admin',
    'admin/loja',
    'admin/fornecedores',
    'admin/tipos',
    'admin/configuracoes',
];

function escapeHtml(value) {
    return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function withSeo(html, route) {
    const page = route.startsWith('admin/') ? pages.admin : (pages[route] ?? defaultPage);
    const canonical = `${siteUrl}/${route}`;
    const robots = page.indexable === false ? 'noindex,nofollow' : 'index,follow';
    const tags = `
        <title>${escapeHtml(page.title)}</title>
        <meta name="description" content="${escapeHtml(page.description)}" />
        <meta name="robots" content="${robots}" />
        <link rel="canonical" href="${canonical}" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Crica Studio" />
        <meta property="og:title" content="${escapeHtml(page.title)}" />
        <meta property="og:description" content="${escapeHtml(page.description)}" />
        <meta property="og:url" content="${canonical}" />
        <meta property="og:image" content="${siteUrl}/assets/hero.webp" />
        <meta name="twitter:card" content="summary_large_image" />`;
    return html.replace(/<title>[\s\S]*?<\/title>[\s\S]*?<link rel="icon"/, `${tags}\n        <link rel="icon"`);
}

const shell = await readFile('dist/index.html', 'utf8');
for (const route of routes) {
    await mkdir(`dist/${route}`, { recursive: true });
    await writeFile(`dist/${route}/index.html`, withSeo(shell, route));
}
