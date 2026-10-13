export type BlogLocale = 'pt' | 'en' | 'es';
export type BlogStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type BlogVersion = {
    title: string;
    summary: string;
    slug: string;
    html: string;
    document?: object;
    publishAt?: string | null;
    publishedAt?: string | null;
    updatedAt?: string;
    seoTitle: string;
    seoDescription: string;
    status: BlogStatus;
};
export type BlogPost = {
    id: string;
    category: string;
    categoryId?: string;
    products?: {
        id: string;
        kind: string;
        name: string;
        description: string;
        image: string;
        href: string;
        type: string;
    }[];
    cover: string;
    author: string;
    date: string;
    featured: boolean;
    versions: Record<BlogLocale, BlogVersion>;
};
export type BlogComment = {
    id: string;
    postId: string;
    locale: BlogLocale;
    name: string;
    text: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected' | 'spam';
};
export const BLOG_LOCALES: { code: BlogLocale; name: string }[] = [
    { code: 'pt', name: 'Português' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
];
export const BLOG_CATEGORIES = ['Inspiração', 'Presentes', 'Processo criativo', 'Para negócios'];
export const BLOG_PRODUCTS = [
    {
        id: 'mug',
        name: 'Caneca personalizada',
        image: '/assets/product-1.webp',
        href: '/loja',
        type: 'Loja Crica',
        description: 'Uma ideia sua, em um presente cheio de significado.',
    },
    {
        id: 'color',
        name: 'Caneca com um toque de cor',
        image: '/assets/product-2.webp',
        href: '/loja',
        type: 'Loja Crica',
        description: 'Cores que combinam com a sua história.',
    },
    {
        id: 'button',
        name: 'Bottons para o seu evento',
        image: '/assets/product-5.webp',
        href: '/loja',
        type: 'Loja Crica',
        description: 'Pequenos detalhes que aproximam pessoas.',
    },
    {
        id: 'store',
        name: 'Mais ideias nas nossas vitrines',
        image: '/assets/product-7.webp',
        href: '/vitrine',
        type: 'Vitrine',
        description: 'Explore os modelos nas plataformas parceiras.',
    },
];
export function escapeBlogText(text: string) {
    return text.replace(
        /[&<>"']/g,
        (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
    );
}
export function productHtml(id: string) {
    const product = BLOG_PRODUCTS.find((item) => item.id === id) || BLOG_PRODUCTS[0];
    return `<aside data-blog-product="${product.id}" class="blog-product-card"><img src="${product.image}" alt="${escapeBlogText(product.name)}"><div><small>${product.type}</small><h3>${product.name}</h3><p>${product.description}</p><a href="${product.href}">Explorar produtos →</a></div></aside>`;
}
export function blogPath(post: BlogPost, locale: BlogLocale) {
    return `/blog/${locale}/${post.versions[locale].slug}`;
}
export function versionComplete(version: BlogVersion) {
    return !!(
        version.title.trim() &&
        version.summary.trim() &&
        version.slug.trim() &&
        version.html.replace(/<[^>]*>/g, '').trim()
    );
}
export function validBlogSlug(slug: string) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
export function canPublish(version: BlogVersion) {
    return versionComplete(version) && validBlogSlug(version.slug);
}
export function mergeBlogVersion(
    existing: BlogPost | undefined,
    edited: BlogPost,
    locale: BlogLocale,
): BlogPost {
    const empty = (): BlogVersion => ({
        title: '',
        summary: '',
        slug: '',
        html: '',
        seoTitle: '',
        seoDescription: '',
        status: 'draft',
    });
    const versions = structuredClone(
        existing?.versions || { pt: empty(), en: empty(), es: empty() },
    );
    versions[locale] = structuredClone(edited.versions[locale]);
    return { ...structuredClone(edited), versions };
}
export function searchBlog(posts: BlogPost[], locale: BlogLocale, query: string, category: string) {
    const normalize = (value: string) =>
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    return posts.filter(
        (post) =>
            post.versions[locale].status === 'published' &&
            post.versions[locale].title &&
            (!category || post.category === category) &&
            normalize(post.versions[locale].title + ' ' + post.versions[locale].summary).includes(
                normalize(query.trim()),
            ),
    );
}
const titles = [
    [
        'Pequenos presentes, grandes histórias',
        'Small gifts, lasting stories',
        'Pequeños regalos, grandes historias',
    ],
    [
        'Da primeira ideia à caneca que tem a sua cara',
        'From your first idea to a mug that feels like you',
        'De la primera idea a una taza muy tuya',
    ],
    [
        'Uma mesa de café, quatro jeitos de surpreender',
        'One coffee table, four ways to surprise',
        'Una mesa de café, cuatro formas de sorprender',
    ],
    [
        'Uma lembrança para cada pessoa da equipe',
        'A thoughtful gift for every teammate',
        'Un recuerdo para cada persona del equipo',
    ],
    [
        'Como escolher as cores da sua próxima criação',
        'Choosing colours for your next creation',
        'Cómo elegir los colores de tu próxima creación',
    ],
    [
        'Bottons que contam a história de um encontro',
        'Buttons that tell the story of a gathering',
        'Botones que cuentan la historia de un encuentro',
    ],
    [
        'O que faz um presente ser pessoal?',
        'What makes a gift personal?',
        '¿Qué hace que un regalo sea personal?',
    ],
    [
        'Um cantinho criativo para começar o dia',
        'A creative corner to start the day',
        'Un rincón creativo para empezar el día',
    ],
    [
        'Uma identidade visual que cabe na mão',
        'A brand identity you can hold',
        'Una identidad visual que cabe en la mano',
    ],
    [
        'Fotos, frases e memórias na mesma caneca',
        'Photos, words and memories on a mug',
        'Fotos, frases y recuerdos en una taza',
    ],
    [
        'Crie uma coleção para o seu evento',
        'Create a collection for your event',
        'Crea una colección para tu evento',
    ],
    [
        'Por trás de uma boa escolha de materiais',
        'Behind a thoughtful choice of materials',
        'Detrás de una buena elección de materiales',
    ],
];
const slugify = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
function content(locale: BlogLocale, kind: number) {
    const intro =
        locale === 'pt'
            ? '<p>Um presente pode guardar uma conversa, uma viagem ou aquela frase que só vocês entendem. A beleza está em transformar esse detalhe em algo que faz parte do dia a dia.</p><p>Na Crica, o primeiro passo é ouvir a sua ideia. Não precisa chegar com tudo pronto: uma referência, uma cor ou uma lembrança já são um ótimo começo.</p>'
            : locale === 'en'
              ? '<p>A gift can hold a conversation, a trip or a phrase only you understand. Its beauty comes from turning that detail into something you use every day.</p><p>At Crica, we begin by listening. A reference, a colour or a memory is enough to start creating together.</p>'
              : '<p>Un regalo puede guardar una conversación, un viaje o esa frase que solo ustedes entienden. Lo bonito está en convertir ese detalle en algo que acompaña el día a día.</p><p>En Crica, empezamos escuchando tu idea. Una referencia, un color o un recuerdo son suficientes para crear juntos.</p>';
    let html = intro + productHtml('mug');
    if (kind === 1) {
        const headings =
            locale === 'pt'
                ? [
                      'Comece pela pessoa, não pelo objeto',
                      'Encontre uma referência que faça sentido',
                      'Dê espaço para a sua mensagem',
                      'Pense nas cores e nos contrastes',
                      'Veja a arte antes de decidir',
                      'Cuide do prazo e dos detalhes',
                  ]
                : locale === 'en'
                  ? [
                        'Start with the person',
                        'Find a meaningful reference',
                        'Give your message room',
                        'Think about colours and contrast',
                        'Review your artwork',
                        'Plan the details and timing',
                    ]
                  : [
                        'Empieza por la persona',
                        'Busca una referencia especial',
                        'Dale espacio a tu mensaje',
                        'Piensa en colores y contrastes',
                        'Revisa el diseño',
                        'Planifica los detalles y el plazo',
                    ];
        for (const [i, heading] of headings.entries()) {
            html +=
                `<h2>${heading}</h2>` +
                (locale === 'pt'
                    ? '<p>Pense em quem vai receber a criação e no momento em que ela será usada. Uma caneca no trabalho pede uma leitura clara; um presente entre amigos pode ter uma referência mais íntima. Escolher esse contexto ajuda a encontrar o tom da arte.</p><p>Separe as referências que mais representam a sua ideia e procure um elemento em comum entre elas. Pode ser uma cor, uma palavra ou a sensação que você quer transmitir. Esse pequeno fio condutor deixa o resultado mais coerente, sem precisar colocar tudo na mesma composição.</p><p>Converse sobre as possibilidades de personalização e confira os detalhes do modelo escolhido. A criação ganha força quando a mensagem, o material e o formato trabalham juntos. Reserve um tempo para olhar a proposta com calma e ajustar o que ainda não parece seu.</p>'
                    : locale === 'en'
                      ? '<p>Think about the person receiving your gift and how they will use it. Choose a meaningful reference, give the design room to breathe and discuss the details together. A clear message and a thoughtful composition turn an ordinary moment into a shared memory.</p><p>Take time to review the artwork, colours and model. The best result feels personal and works beautifully in everyday life.</p>'
                      : '<p>Piensa en la persona que recibirá el regalo y en cómo lo utilizará. Elige una referencia especial, deja espacio al diseño y conversa sobre los detalles. Un mensaje claro convierte un momento cotidiano en un recuerdo compartido.</p><p>Dedica un momento a revisar el diseño, los colores y el modelo. El mejor resultado se siente personal y funciona en el día a día.</p>');
            if (i === 1)
                html +=
                    '<img src="/assets/product-4.webp" alt="Detalhe de uma caneca personalizada"><p><em>Uma composição simples dá espaço para a sua ideia.</em></p>';
        }
    }
    if (kind === 2)
        html +=
            '<h2>' +
            (locale === 'pt'
                ? 'Escolha o detalhe que combina com você'
                : locale === 'en'
                  ? 'Choose a detail that feels like you'
                  : 'Elige un detalle muy tuyo') +
            '</h2>' +
            productHtml('color') +
            productHtml('button') +
            productHtml('store');
    return (
        html +
        '<blockquote>' +
        (locale === 'pt'
            ? 'Você traz a ideia. A gente cria com você.'
            : locale === 'en'
              ? 'You bring the idea. We create together.'
              : 'Tú traes la idea. Creamos contigo.') +
        '</blockquote>'
    );
}
export function seedBlog(): BlogPost[] {
    return Array.from({ length: 24 }, (_, i) => {
        const versions = {} as Record<BlogLocale, BlogVersion>;
        BLOG_LOCALES.forEach(({ code }, n) => {
            const title =
                titles[i % titles.length][n] +
                (i >= 12
                    ? code === 'pt'
                        ? ': novas ideias'
                        : code === 'en'
                          ? ': new ideas'
                          : ': nuevas ideas'
                    : '');
            const pending = n > 0 && i > (n === 1 ? 15 : 9);
            versions[code] = {
                title: pending ? '' : title,
                summary: pending
                    ? ''
                    : code === 'pt'
                      ? 'Ideias, detalhes e um pouco do nosso processo para criar algo que tenha a sua essência.'
                      : code === 'en'
                        ? 'Ideas, details and a glimpse of our process for creating something that feels like you.'
                        : 'Ideas, detalles y un poco de nuestro proceso para crear algo con tu esencia.',
                slug: pending ? '' : slugify(title),
                html: pending ? '' : content(code, i % 3),
                seoTitle: pending ? '' : title,
                seoDescription: pending
                    ? ''
                    : code === 'pt'
                      ? 'Descubra ideias e referências para presentes personalizados com a Crica Studio.'
                      : code === 'en'
                        ? 'Discover ideas for personal gifts with Crica Studio.'
                        : 'Descubre ideas para regalos personalizados con Crica Studio.',
                status:
                    pending || (i + n) % 9 === 8 ? 'draft' : i === 22 ? 'archived' : 'published',
            };
        });
        return {
            id: `blog-${i + 1}`,
            category: BLOG_CATEGORIES[i % 4],
            cover: `/assets/product-${(i % 8) + 1}.webp`,
            author: 'Equipe Crica',
            date: `2026-10-${String(9 - (i % 9)).padStart(2, '0')}`,
            featured: i === 0,
            versions,
        };
    });
}
