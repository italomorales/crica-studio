import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    inject,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { BlogApi, type Product } from './blog-api';
import type { BlogLocale } from './blog-data';
const productCache = new Map<string, Product>();
import template from './blog-editor.html?raw';

export const BlogProductNode = Node.create({
    name: 'blogProduct',
    group: 'block',
    atom: true,
    draggable: true,
    addAttributes() {
        return {
            kind: { default: 'shop', parseHTML: (element) => element.getAttribute('data-kind') },
            id: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-blog-product'),
            },
        };
    },
    parseHTML() {
        return [{ tag: 'aside[data-blog-product]' }];
    },
    renderHTML({ node }) {
        const product = productCache.get(node.attrs['kind'] + ':' + node.attrs['id']) || {
            id: node.attrs['id'],
            name: 'Produto associado',
            image: '/assets/crica-studio-logo-transparent.png',
            type: 'Catálogo',
            description: '',
            href: '#',
        };
        return [
            'aside',
            {
                'data-blog-product': product.id,
                'data-kind': node.attrs['kind'],
                class: 'blog-product-card',
            },
            ['img', { src: product.image, alt: product.name }],
            [
                'div',
                {},
                ['small', {}, product.type],
                ['h3', {}, product.name],
                ['p', {}, product.description],
                ['a', { href: product.href }, 'Explorar produtos →'],
            ],
        ];
    },
});

@Component({ selector: 'crica-blog-editor', standalone: true, imports: [FormsModule], template })
export class BlogEditorComponent implements AfterViewInit {
    @Input() html = '';
    @Input() document?: object;
    @Input() locale: BlogLocale = 'pt';
    @Input() associatedProducts: Product[] = [];
    @Output() documentChange = new EventEmitter<object>();
    private api = inject(BlogApi);
    @Output() htmlChange = new EventEmitter<string>();
    @ViewChild('mount', { static: true }) mount!: ElementRef<HTMLElement>;
    private readonly cd = inject(ChangeDetectorRef);
    editor?: Editor;
    products: Product[] = [];
    productQuery = '';
    productPage = 1;
    productTotal = 0;
    async searchProducts(page = 1) {
        try {
            const data = await this.api.request<{ items: Product[]; total: number }>(
                '/api/admin/blog/products?locale=' +
                    this.locale +
                    '&page=' +
                    page +
                    '&query=' +
                    encodeURIComponent(this.productQuery),
            );
            this.products = data.items;
            this.productPage = page;
            this.productTotal = data.total;
            for (const p of this.products) productCache.set(p.kind + ':' + p.id, p);
            this.productId = this.products[0]?.id || '';
            this.cd.markForCheck();
        } catch (e) {
            this.message.set((e as Error).message);
        }
    }
    productId = '';
    imageChoice = '/assets/product-4.webp';
    linkUrl = '';
    linkText = '';
    readonly linkFormOpen = signal(false);
    private linkRange = { from: 1, to: 1 };
    private originalLinkText = '';
    @ViewChild('linkAddress') linkAddress?: ElementRef<HTMLInputElement>;
    readonly message = signal('');
    readonly revision = signal(0);
    ngAfterViewInit() {
        for (const product of this.associatedProducts)
            productCache.set(product.kind + ':' + product.id, product);
        void this.searchProducts();
        this.editor = new Editor({
            element: this.mount.nativeElement,
            extensions: [
                StarterKit.configure({ link: { openOnClick: false } }),
                Image.configure({ allowBase64: false }),
                BlogProductNode,
            ],
            content: this.document || this.html || '<p>Comece sua história aqui…</p>',
            editorProps: {
                attributes: {
                    role: 'textbox',
                    'aria-label': 'Conteúdo da matéria',
                    'aria-multiline': 'true',
                    class: 'blog-prose blog-editor-content',
                },
            },
            onUpdate: ({ editor }) => {
                this.htmlChange.emit(editor.getHTML());
                this.documentChange.emit(editor.getJSON());
                this.revision.update((value) => value + 1);
                this.cd.markForCheck();
            },
            onSelectionUpdate: () => this.revision.update((value) => value + 1),
        });
    }
    ngOnChanges() {
        if (
            this.editor &&
            JSON.stringify(this.document) !== JSON.stringify(this.editor.getJSON())
        ) {
            this.linkFormOpen.set(false);
            this.editor.commands.setContent(this.document || this.html || '<p></p>', {
                emitUpdate: false,
            });
        }
    }
    ngOnDestroy() {
        this.editor?.destroy();
    }
    active(name: string) {
        this.revision();
        return this.editor?.isActive(name) || false;
    }
    format(name: string) {
        const chain = this.editor?.chain().focus();
        if (!chain) return;
        if (name === 'bold') chain.toggleBold().run();
        if (name === 'italic') chain.toggleItalic().run();
        if (name === 'underline') chain.toggleUnderline().run();
        if (name === 'h2') chain.toggleHeading({ level: 2 }).run();
        if (name === 'h3') chain.toggleHeading({ level: 3 }).run();
        if (name === 'bulletList') chain.toggleBulletList().run();
        if (name === 'orderedList') chain.toggleOrderedList().run();
        if (name === 'blockquote') chain.toggleBlockquote().run();
        if (name === 'undo') chain.undo().run();
        if (name === 'redo') chain.redo().run();
    }
    insertProduct() {
        const product = this.products.find((p) => p.id === this.productId);
        if (!product) return;
        this.editor
            ?.chain()
            .focus()
            .insertContent([
                { type: 'blogProduct', attrs: { id: this.productId, kind: product.kind } },
                { type: 'paragraph' },
            ])
            .run();
    }
    insertImage(src = this.imageChoice) {
        this.editor?.chain().focus().setImage({ src, alt: 'Imagem da matéria' }).run();
    }
    openLink() {
        if (!this.editor) return;
        if (this.editor.isActive('link')) this.editor.commands.extendMarkRange('link');
        const { from, to } = this.editor.state.selection;
        this.linkRange = { from, to };
        this.originalLinkText = this.editor.state.doc.textBetween(from, to, ' ');
        this.linkText = this.originalLinkText;
        this.linkUrl = this.editor.getAttributes('link')['href'] || '';
        this.message.set('');
        this.linkFormOpen.set(true);
        this.cd.detectChanges();
        this.linkAddress?.nativeElement.focus();
    }
    private safeLink(value: string) {
        if (!value || /[\\\s]/.test(value)) return undefined;
        if (value.startsWith('/')) return value.startsWith('//') ? undefined : value;
        try {
            const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : 'https://' + value);
            if (url.username || url.password) return undefined;
            if (
                url.protocol === 'https:' ||
                (url.protocol === 'http:' &&
                    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
            )
                return url.href;
        } catch {}
        return undefined;
    }
    insertLink() {
        if (!this.editor) return;
        const href = this.safeLink(this.linkUrl.trim());
        if (!href) {
            this.message.set(
                'Use um endereço HTTPS válido (ex.: https://site.com) ou uma rota do site (ex.: /loja).',
            );
            return;
        }
        const { from, to } = this.linkRange;
        const text = this.linkText.trim();
        if (from !== to && text === this.originalLinkText)
            this.editor.chain().focus().setTextSelection({ from, to }).setLink({ href }).run();
        else
            this.editor
                .chain()
                .focus()
                .insertContentAt(
                    { from, to },
                    {
                        type: 'text',
                        text: text || href,
                        marks: [{ type: 'link', attrs: { href } }],
                    },
                )
                .unsetMark('link', { extendEmptyMarkRange: false })
                .run();
        this.linkFormOpen.set(false);
        this.message.set('Link aplicado. Salve a matéria para guardar a alteração.');
    }
    removeLink() {
        if (!this.editor) return;
        const chain = this.editor.chain().focus();
        if (this.linkFormOpen()) chain.setTextSelection(this.linkRange);
        chain.extendMarkRange('link').unsetLink().run();
        this.linkFormOpen.set(false);
        this.message.set('Link removido; o texto foi preservado.');
    }
    cancelLink() {
        this.linkFormOpen.set(false);
        this.editor?.chain().focus().setTextSelection(this.linkRange).run();
    }
    async upload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        try {
            this.insertImage(await this.api.upload(file));
            this.message.set('Imagem enviada e inserida. Salve a matéria para guardar o conteúdo.');
        } catch (e) {
            this.message.set((e as Error).message);
        } finally {
            input.value = '';
            this.cd.markForCheck();
        }
    }
}
