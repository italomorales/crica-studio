# Crica Studio — protótipo Angular

Protótipo navegável, responsivo e privado para revisão da experiência aprovada. Angular 20 + TypeScript, componentes standalone, Angular Router e Forms. Vite serve e empacota a aplicação; o framework de apresentação é Angular. Não há backend nem checkout.

## Executar

Requer Node.js 22.12+ ou 24 e npm.

```bash
npm ci
npm run dev
```

Abra `http://localhost:4173`. Rotas: `/` redireciona a `/loja`; `/loja` e `/fornecedores` têm acesso direto.

```bash
npm run build
npm run preview
npm test
```

O build gera `dist/`, incluindo entradas para acesso direto às duas rotas. O projeto usa compilação Angular JIT com Vite para esta fase; o compilador acompanha o bundle. Isso prioriza simplicidade no protótipo. A evolução para AOT/Angular CLI pode reduzir o bundle sem mudar os componentes.

## Onde editar

Os templates ficam em arquivos `.html` separados, ao lado do TypeScript correspondente.
Por exemplo, o painel administrativo usa `src/app/admin/admin.html` e sua lógica fica em
`src/app/admin/admin.ts`. Os arquivos com vários componentes, como `shared.ts`, `cards.ts`
e `pages.ts`, importam um HTML por componente (`header.html`, `product-card.html`,
`shop.html`, entre outros). O componente principal usa `src/app.html`.

Como o projeto usa Angular JIT com Vite, cada HTML é importado com `?raw` e passado à
propriedade `template` do componente. Para alterar o layout, edite diretamente o HTML;
para alterar o comportamento, edite o TypeScript.

| Conteúdo                                                        | Arquivo                               |
| --------------------------------------------------------------- | ------------------------------------- |
| Produtos, imagens, descrições, características e personalização | `src/app/data/products.ts`            |
| Interfaces tipadas                                              | `src/app/data/models.ts`              |
| WhatsApp e destinos de afiliado                                 | `src/app/data/site.config.ts`         |
| Serviço que fornece os dados locais                             | `src/app/services/catalog.service.ts` |
| Formação de mensagem e validação dos destinos                   | `src/app/services/contact.ts`         |
| Header, rodapé, filtros e alternativa de imagem                 | `src/app/components/shared.ts`        |
| Cards de produtos próprios e de afiliados                       | `src/app/components/cards.ts`         |
| Painel de detalhes, quantidade, mensagem e cópia                | `src/app/components/details.ts`       |
| Loja, fornecedores e busca combinada                            | `src/app/pages.ts`                    |
| Rotas e inicialização                                           | `src/main.ts`                         |
| Paleta, fonte, espaços, bordas e responsividade                 | `src/styles.css`                      |
| Fotos ilustrativas, SVGs e fonte local                          | `public/assets/`                      |

`CatalogService` é o ponto simples para futuramente substituir os mocks por chamadas a uma API.

## Configurar contato e links

Em `SITE_CONFIG.whatsappNumber`, inserir somente os dígitos do número real em formato internacional: código do país, DDD e número. O campo foi mantido vazio. Número ausente ou inválido abre a prévia com “Contato em configuração” e permite copiar a mensagem. Com número válido, abre `wa.me` em nova aba com `encodeURIComponent`. Abrir o WhatsApp não significa enviar a mensagem.

Em `SITE_CONFIG.affiliateLinks`, adicionar uma entrada por ID existente em `AFFILIATES`, usando a URL HTTPS real e completa do anúncio. O campo opcional `url` do registro também é aceito; a configuração central tem precedência. Os parâmetros de afiliado são preservados exatamente. URLs vazias ou inválidas abrem a indicação de demonstração. Links configurados usam `target="_blank"` e `rel="sponsored noopener noreferrer"`.

Não há dados de exemplo que possam levar a um telefone, anúncio aleatório ou página inicial de marketplace. Os endereços de teste ficam apenas em `tests/` e nunca são carregados na aplicação.

## Hipóteses e pendências

- Catálogo organizado por modelo; estampas nas imagens são exemplos.
- Oito modelos próprios; sempre “Sob consulta”; disponibilidade e especificações precisam de confirmação.
- Seis indicações externas ilustram uma audiência de criadores de personalizados. Essa audiência permanece uma hipótese revisável.
- As indicações usam placeholders editoriais até receber imagens e anúncios reais.
- Fotos dos oito produtos foram geradas como ilustrações; não são portfólio de pedidos entregues nem prova de acabamento, material ou disponibilidade.
- Faltam número real do WhatsApp, links completos de afiliado, fotos reais e confirmação comercial das descrições/opções.
- Não foram inventados preços, contatos, avaliações, estoque, materiais, capacidade ou prazos.

## Identidade preservada

Brand Book v1 lido e inspecionado. Kit v1 encontrado e inspecionado. SVG horizontal azul e símbolo fechado usados sem modificar seus bytes. Outfit variável e licença OFL incluídas e servidas localmente. Os PNGs anexados representam estudos anteriores; prevaleceu o kit aprovado, com pingo circular e descritor menor.

## Validação

- Build TypeScript/Vite concluído.
- Quatro testes automatizados: contexto/acentos/quantidade, ausência de contato e valores inválidos, preservação de URLs e busca sem acentos.
- Navegador: loja e fornecedores, atualização de ambas as rotas, busca com categoria/plataforma, limpeza e estado vazio.
- Detalhes: abertura por foto e título, botão direto, fechamento por botão, Escape e clique fora; devolução do foco e retenção via Tab/Shift+Tab.
- Mensagem contextual com quantidade 2 e texto acentuado; bloqueio de quantidade 0; indicação externa sem URL.
- Botão de cópia retornou sucesso e exibiu estado correspondente; a área de transferência virtual do navegador de testes é separada da área usada pela página e não permitiu conferir a colagem. Há alternativa de seleção manual se a cópia falhar.
- Layout inspecionado em contêineres de navegador com 360, 768 e 1440 px; sem excesso de largura do documento nos contêineres medidos. Layout e painel móveis também inspecionados visualmente. Não equivale a teste em aparelhos físicos.
- Todas as imagens de produto carregaram. Nenhum erro da aplicação observado nas jornadas; houve ruído da extensão do navegador de testes.
- URLs configuradas foram validadas por testes isolados, sem abrir WhatsApp nem efetuar compra externa.

Prévia para revisão privada, sem domínio personalizado ou lançamento público.

## Refinamento do logotipo — 10/09/2026

Opção 1 (fiel e geométrica) aprovada e aplicada em `public/assets/crica-compact-azul.svg`. Cabeçalho e rodapé exibem a assinatura compacta com studio abaixo, em largura proporcional de 140 px. A assinatura horizontal original permanece disponível como ativo histórico.

## Administração mockada

A área administrativa é front-end demonstrativa e usa `localStorage` no navegador para persistir catálogo, tipos e configurações entre recargas. Acesse `/login` e use:

- E-mail: `demo@crica.example`
- Senha: `Crica123!`

Depois do login, `/admin/loja` permite criar, editar, duplicar, filtrar e alternar o estado dos produtos da Loja Crica. `/admin/fornecedores` mantém um registro separado por plataforma, `/admin/tipos` gerencia os tipos disponíveis e `/admin/configuracoes` mostra as configurações locais, incluindo a opção de restaurar os dados de demonstração.

Os registros iniciais ficam em `src/app/data/seed.ts`; os campos e regras ficam em `src/app/data/models.ts`, `src/app/services/local-store.ts` e `src/app/admin/`. A autenticação é apenas uma simulação de fluxo e não substitui backend, sessão segura ou controle de permissões.

## Paleta atualizada — 12/09/2026

Azul principal `#0255A5` para ações e textos de marca; azul secundário `#39A3FE` para detalhes de navegação e grafismos. Os fundos de apoio usam uma tonalidade suave (`#EBF6FF`), mantendo contraste dos textos. Tokens centralizados em `src/styles.css`.

version 20260912
