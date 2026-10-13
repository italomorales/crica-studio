# Blog — fase 1: prévia local

Protótipo Angular/HTML, integrado à identidade da Crica. Não há backend de blog,
persistência, autenticação social, upload remoto ou publicação externa.
As alterações ficam na memória da aba e desaparecem ao recarregar.

## Abrir

Com `npm run dev` no frontend:

- `http://localhost:4173/blog`: destaque, categorias, busca, paginação e idiomas.
- `http://localhost:4173/blog/pt/pequenos-presentes-grandes-historias`: matéria curta.
- `http://localhost:4173/blog/pt/da-primeira-ideia-a-caneca-que-tem-a-sua-cara`: matéria longa, imagem no texto.
- `http://localhost:4173/blog/pt/uma-mesa-de-cafe-quatro-jeitos-de-surpreender`: quatro cards de produtos/vitrine.
- `http://localhost:4173/admin/blog`: lista e filtros editoriais.
- `http://localhost:4173/admin/blog/editar/blog-1`: editor, versões e SEO ilustrativo.
- `http://localhost:4173/admin/blog/editar/novo`: nova matéria.
- `http://localhost:4173/admin/blog/comentarios`: moderação.

As rotas administrativas do protótipo são abertas para validar os exemplos.
Elas não acessam os dados nem as permissões da administração real do catálogo,
cujas rotas e guards continuam existentes.

## Editor escolhido

Tiptap 3, com Core, StarterKit e Image, instalados via npm. O editor é montado no
ciclo de vida do componente Angular usando a API de JavaScript, sem adaptador
React/Vue e sem serviço de nuvem. O nó `blogProduct` representa um card de catálogo
como bloco próprio, com identificação estruturada e renderização controlada.
Os cards desta fase levam à loja e à vitrine; não usam IDs reais de produtos.

Comparação: Quill também oferece edição extensível e licença BSD. Tiptap foi
escolhido pela composição de extensões e nós próprios, pela integração direta com
Vite/DOM e por permitir personalizar a interface com o estilo atual da Crica.
Os pacotes usados são MIT; não é necessária assinatura paga para esta fase.

Fontes oficiais consultadas:

- https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript
- https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node
- https://tiptap.dev/docs/editor/extensions/nodes/image
- https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md
- https://quilljs.com/docs/customization

## Roteiro de validação

1. Navegue pelas páginas do blog, busque um título, filtre uma categoria e troque o idioma.
2. Abra a matéria longa e a matéria com quatro produtos. Confira a leitura no celular.
3. Escolha Google ou Facebook na área de comentários. É uma conta de demonstração,
   sem OAuth. Curta/descurta e envie um comentário; ele aparece como pendente só para
   o visitante simulado. Nenhum comentário ou login é enviado externamente.
4. Acesse a moderação pela navegação interna, aprove o comentário e retorne ao blog.
   Ele aparece na conversa. Rejeição, spam e retorno à fila também são locais.
5. Edite título, resumo e conteúdo; use negrito, títulos, listas, links, imagens e cards.
   Imagens do computador são lidas como data URLs na aba, sem upload. Limite de 5 MB.
6. Troque as abas PT/EN/ES. Cada versão tem título, resumo, slug, conteúdo, SEO e situação.
   Guardar/publicar uma versão não salva alterações ainda não guardadas de outra.
7. Confira a prévia editorial, retorne à edição e publique apenas na sessão.
   Versões incompletas e slugs duplicados ou inválidos não podem ser publicados.
8. Recarregue: os 24 exemplos e seus estados originais reaparecem.

## Limites intencionais

- Contagens de curtidas e comentários iniciais são exemplos; a identidade é simulada.
- Não há agendamento, permissões editoriais, API, banco, mecanismos anti-spam ou OAuth.
- SEO é um formulário e uma prévia de busca, não SSR/HTML inicial, sitemap, hreflang
  ou dados estruturados Article. As rotas do blog recebem `noindex,nofollow` nesta fase.
- Interfaces editoriais são em português; conteúdo manual está exemplificado em PT/EN/ES.
- A aplicação existente pode fazer leituras de configuração/idiomas na API do catálogo.
  O blog não faz chamadas de escrita. Analytics/Ads não são carregados em hosts locais
  nem ao abrir diretamente as rotas do protótipo; o rastreamento das páginas existentes
  nos domínios de produção é mantido.
- Não foram criadas entradas estáticas de deploy para o blog nem alterações no backend.
- `npm audit` também identifica avisos preexistentes de Angular Router (SSR) e source-map-js;
  os pacotes Tiptap adicionados não constam como vulneráveis no relatório consultado.

Arquivos centrais: `src/app/blog/` (dados, estado em memória, público, admin, editor e CSS),
`src/main.ts` (rotas), menus existentes e `tests/blog.test.ts`.
