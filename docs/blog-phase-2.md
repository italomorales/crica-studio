# Blog — fase 2

Implementação local em `C:\git\cricastudio.com\front` e `C:\git\cricastudio.com\backend`. Nenhum commit, push, migration em produção ou deploy foi executado.

## O que mudou

- Listagem administrativa em AG Grid Community, reutilizando tema e textos do catálogo. Ações de edição, filtros de título/categoria/idioma/situação e páginas de 20/50 registros consultam a API; a grid não carrega todas as matérias. Colunas redimensionáveis, ação fixa e rolagem horizontal no celular.
- API/Postgres para categorias, traduções manuais, matérias e imagens. O conteúdo público deixa de usar as 24 matérias mockadas. A migration não insere artigos ou categorias de exemplo.
- Tiptap salva JSON estruturado; o servidor valida e renderiza os blocos permitidos com escaping. HTML arbitrário, scripts, links `javascript:`, imagens em data URL e referências inválidas não podem ser publicados. PNG/JPEG/WebP de até 5 MB passam por verificação de assinatura.
- Capas e imagens usam o armazenamento S3 existente em produção. O modo local de arquivos só funciona em Development/BlogTest. Cards resolvem IDs reais de produtos publicados da loja e plataformas ativas/publicadas da vitrine; preservam slug da loja e URL original da vitrine, incluindo parâmetros.
- Cada idioma tem título, resumo, documento, slug, SEO, situação e agendamento próprios. Salvar PT não salva EN/ES. Slugs são únicos por idioma, garantidos por índice no banco. Autor, capa, categoria, data e destaque são metadados compartilhados da matéria.
- Situações: draft, published, scheduled, archived. Um agendamento aparece em consultas públicas, HTML e sitemap a partir de `publish_at`, sem depender de um processo de background. Salvar uma versão publicada como rascunho retira **essa versão** do público. Não há histórico de revisões nem edição paralela de uma revisão publicada.
- Administração usa o mesmo JWT/login/guard do catálogo. Não existe rota de escrita pública ou login alternativo para testes.
- Categorias permitem criar, editar PT/EN/ES, ativar/desativar e remover quando não estão em uso. Desativar também oculta suas matérias publicamente.

## Rodar sem tocar no banco atual

Foi criado o banco **`crica_blog_phase2_local`** no container local `postgres-local-postgres-1`. O banco `app` e o `.env.local` original do front não foram modificados. A API anterior em 5030 também foi preservada.

Banco novo, se necessário:

```powershell
cd C:\git\cricastudio.com\backend
docker exec postgres-local-postgres-1 createdb -U postgres crica_blog_phase2_local
# Aplicar em ordem as migrations, excluindo os seeds 003/004.
# Este comando usa explicitamente o banco LOCAL, nunca a configuração atual da API.
Get-ChildItem sql/*.sql | Where-Object { $_.Name -notmatch '^00[34]_' } | Sort-Object Name | ForEach-Object {
    Get-Content -Raw $_.FullName | docker exec -i postgres-local-postgres-1 psql -U postgres -d crica_blog_phase2_local -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "Migration falhou" }
}
```

Build de desenvolvimento para validar também o HTML da API:

```powershell
cd C:\git\cricastudio.com\front
$env:VITE_API_URL = 'http://localhost:5031'
npm run build
Remove-Item Env:\VITE_API_URL

cd C:\git\cricastudio.com\backend
./scripts/start-blog-local.ps1 -Build
./../front/scripts/start-blog-local.ps1
node scripts/test-blog-local.mjs
```

Os scripts iniciam processos ocultos, vinculados a loopback: API **5031**, Vite **4174**. O front de teste usa um override de proxy somente nesse processo; 4173/5030 e o `.env.local` permanecem como estavam. A API usa ambiente BlogTest, que não lê `appsettings.Local.json`. A senha do PostgreSQL é obtida do container local sem ser impressa. Chave JWT, imagens e logs ficam no diretório ignorado `backend/.blog-local`. Os scripts requerem PowerShell 7, Docker com esse container, Node e .NET 10.

URLs:

- `http://localhost:4174/admin/blog` — AG Grid e categorias.
- `http://localhost:4174/admin/blog/editar/novo` — criação.
- `http://localhost:4174/blog` — frontend conectado ao banco isolado.
- `http://localhost:5031/blog` — HTML público inicial + mesmo frontend compilado.
- `http://localhost:5031/blog-sitemap.xml` — somente versões publicadas/vencidas.

Conta exclusiva do banco de teste: **blog-local@example.test**, senha **CricaBlogLocal2026!**. A suíte cria essa conta pelo banco local, faz login pela API existente e registra a última URL de matéria/editor em `.blog-local/test-result.json`. Os dados temporários ficam nesse banco para validação visual; os scripts nunca os inserem em produção. Repetir a suíte cria um conjunto novo, identificado por um sufixo aleatório.

## APIs

Públicas: `GET /api/blog/categories?locale=pt`, `GET /api/blog/posts?locale=pt&page=1&pageSize=6&query=...&categoryId=...`, `GET /api/blog/posts/{locale}/{slug}`.

Administrativas (Bearer JWT): `GET/POST /api/admin/blog/posts`, `GET/DELETE /api/admin/blog/posts/{id}`, `PUT /api/admin/blog/posts/{id}/versions/{locale}`, `POST /api/admin/blog/preview?locale=pt`, `GET /api/admin/blog/categories`, `PUT/DELETE /api/admin/blog/categories/{id}`, `GET /api/admin/blog/products?locale=pt&kind=shop&query=...&page=1`, `POST /api/admin/blog/images` (multipart, campo file).

O limite público é 24 registros por chamada, o administrativo é 100 e o seletor de produtos é 50. Busca usa índice de full text do PostgreSQL com fallback de título parcial. Listagens retornam documentos vazios; somente detalhes carregam o conteúdo completo.

## HTML inicial e publicação posterior

O ASP.NET entrega `/blog`, `/blog/{locale}/{slug}` e `/blog-sitemap.xml`. Cada matéria já traz texto integral, capa, cards, título/descrição, canonical, Open Graph, Article JSON-LD e hreflang de versões efetivamente públicas **na resposta HTTP inicial**. O frontend continua interativo após iniciar. Slugs inexistentes/rascunhos/arquivados retornam HTTP 404; versões pendentes não entram em HTML, sitemap ou hreflang. Busca/filtros/páginas seguintes têm noindex no HTML inicial.

O servidor lê o shell do **mesmo build do frontend** em `Blog__FrontendDirectory`; as referências a JS/CSS e fontes continuam apontando para a origem S3 do site. Sem esse shell, a entrega HTML não pode funcionar. `scripts/package-blog-shell.mjs` empacota o shell e a lista de CSS de blog em `.blog-html-shell`. O workflow do frontend preserva um artifact `blog-html-shell-<sha>` para uso na release correspondente da API. O build local contém a URL 5031: o pipeline de produção deve reconstruir sem esse override local.

Passos necessários, **ainda não executados**:

1. Aplicar `backend/sql/016_create_blog.sql` no banco correto, após as migrations existentes de catálogo/idiomas. Há outro arquivo 016 para retirada de textos de interface; usar o nome completo, não apenas o número. Não executar seeds 003/004 em produção.
2. Publicar a API com as alterações de Blog. Extrair o artifact correspondente em `backend/blog-frontend/` no servidor. O compose monta esse diretório read-only em `/app/blog-frontend`. Configurar `Blog__PublicSiteUrl` com o domínio canonical escolhido; padrão `https://www.cricastudio.com.br`. S3 e permissões de upload seguem a configuração existente de CatalogMedia.
3. Criar uma origem HTTPS para `api.cricastudio.com` no CloudFront e behaviors prioritários `/blog`, `/blog/*` e `/blog-sitemap.xml`. Encaminhar query strings, desabilitar cache e usar Host da origem. Isso mantém agendamentos/arquivamentos visíveis imediatamente.
4. Revisar/publicar `infra/cloudfront/crica-blog-ready-viewer-request.js`, que mantém os redirecionamentos atuais de país/domínio e reescreve rotas conhecidas da SPA para `/index.html` sem reescrever o blog. Remover o fallback global 403/404 → 200, que esconderia um 404 real do blog. O arquivo da função atual foi preservado.
5. `infra/cloudfront/prepare-blog-config.mjs` recebe uma cópia da configuração atual e produz outra configuração **local**, preservando origens e behaviors restantes. Não chama AWS. Exemplo: `node infra/cloudfront/prepare-blog-config.mjs current-config.json proposed-config.json api.cricastudio.com CACHE_DISABLED_ID ALL_VIEWER_EXCEPT_HOST_ID FUNCTION_ARN`. Fornecer os IDs de políticas gerenciadas e o ARN da função revisada. Revisar o JSON e aplicar somente com aprovação de publicação e ETag correto.
6. Publicar o frontend da mesma release, conferir HTML com JavaScript desabilitado/HTTP, slugs 404, uploads e sitemap nos domínios reais. Acrescentar `Sitemap: https://www.cricastudio.com.br/blog-sitemap.xml` ao robots.txt na configuração de publicação do site.

Referências oficiais para as configurações: [CachingDisabled](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html), [AllViewerExceptHostHeader](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html), [erros customizados de distribuição](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages-procedure.html).

## Validação realizada

- Frontend: build TypeScript/Vite; 74 testes passaram, incluindo regressões do catálogo e roteamento CDN do blog.
- Backend: build sem warnings/erros; 65 testes passaram. Seis testes antigos de integração do catálogo foram ignorados por falta das suas variáveis específicas de banco; o blog tem suíte isolada própria.
- `scripts/test-blog-local.mjs`: 58 chamadas verificadas, mais asserções de conteúdo/páginas/SEO. Login, autorização, upload válido/inválido, leitura persistida, PT/EN independente, unicidade/rollback de slug, documentos malformados/XSS, produto inexistente, cards reais e seus links, agendamento antes/depois do horário, arquivamento, busca, duas páginas sem repetição, HTML inicial, metadata, hreflang e sitemap.
- Navegador: login real local, grid com registros do Postgres, Tiptap/edit/publicação/card e reload; editor e matéria em 390 px; confirmação de ausência de overflow horizontal da página, tradução pendente fora do hreflang e estilos/assets no HTML da API.

S3, infraestrutura AWS e domínios de produção não foram alterados nem testados por escrita. A publicação exige os passos acima; a validação de upload usa o provedor local com as mesmas restrições de formato/tamanho.

## Fase 3 preservada

OAuth Google/Facebook, curtidas persistentes e comentários/moderação reais continuam fora do escopo. A demonstração de interações aparece somente na prévia editorial, com indicação explícita de dados locais. A tela de moderação é uma demonstração em memória e se identifica como tal. Nenhum desses botões envia login/comentários para serviços externos. Os mocks da fase 1 permanecem apenas como fixtures dos testes antigos, sem alimentar o público.

## Correções de interface — 12/10/2026

- Categorias foi segregada em `/admin/blog/categorias`, com grid, filtros e edição PT/EN/ES próprios. A listagem de matérias não contém mais gerenciamento de categorias.
- Catálogo e blog agora compartilham `AdminShellComponent`, mantendo um único menu: Temas → Matérias → Moderação → Categorias, seguido dos itens existentes. O submenu separado do blog foi removido.
- Matérias, Categorias e Moderação usam o painel, toolbar, seletor 20/50/100, ações com ícones e paginação nativa AG Grid do catálogo. Matérias usa blocos de até 100 registros e cache limitado, mantendo a busca/paginação na API sem carregar o banco inteiro. Categorias e comentários de demonstração usam paginação local como Temas.
- Validação: build frontend, 74 testes existentes, navegação entre catálogo e blog, listagem de categorias/formulário, grid de moderação e paginação de matérias até a última página.

## Exclusão de matérias

A ação de lixeira está disponível no grid e o editor oferece “Excluir matéria”. A confirmação usa o dialog do catálogo e informa que a exclusão é definitiva para todas as versões de idioma, incluindo publicadas e agendadas. Cancelar/Escape preservam os dados; durante o envio os botões ficam bloqueados. Falhas permanecem no dialog para nova tentativa. Após sucesso, o grid é atualizado e uma prévia em memória dessa matéria é descartada.

Validado com uma matéria temporária PT/EN no banco local: cancelamento preservou ambas as versões; confirmação pela interface removeu a matéria, as duas versões por cascade, os URLs públicos/API/HTML (404) e as entradas do sitemap. Build frontend passou.

## Links no conteúdo

O botão Link está na barra do Tiptap. Selecione texto ou posicione o cursor, abra Link, preencha o texto/endereço e aplique. Dentro de um link existente o botão muda para Editar link; Remover link preserva o texto. O formulário mantém a seleção durante a digitação, suporta links HTTPS e rotas internas, e pode ser aplicado com Enter ou cancelado com Escape. URLs sem protocolo recebem HTTPS. Salvar a versão persiste o link no documento e no HTML público.

Validação local: seleção de texto, inserção de texto novo, bloqueio de javascript:, gravação de links interno/externo, reload, presença no HTML inicial, edição do endereço e remoção preservando o texto. Build passou; a matéria temporária usada no teste foi removida.

## Itálico no conteúdo — 13/10/2026

O Tiptap aplicava a marca italic e o servidor renderizava `<em>`, mas `font-synthesis: none` impedia a inclinação da fonte Outfit, que não possui variante itálica. O conteúdo `.blog-prose` agora permite somente síntese de estilo, tanto no editor quanto na leitura. Confirmados no navegador: aplicação/remoção do itálico e renderização inclinada na prévia. Build frontend passou.

## Cadastro de autores — 13/10/2026

- Tela `/admin/blog/autores`, no menu comum, com AG Grid no padrão do catálogo: foto redonda/nome, apresentação, situação, editar/excluir, filtros e paginação 20/50/100.
- Cadastro com nome (120 caracteres), foto PNG/JPEG/WebP de até 5 MB e apresentação simples (600 caracteres). A foto usa o upload existente do blog; sem foto, aparece uma inicial em círculo.
- Campo de seleção de Autor na matéria. O vínculo é compartilhado pelas traduções da matéria. Nome e foto vêm do cadastro e aparecem na matéria pública, HTML inicial e Article/Person JSON-LD. A apresentação continua no cadastro e na API, mas não é exibida na página pública nem no JSON-LD.
- Autores inativos não podem ser escolhidos para novas associações. Uma matéria já vinculada mantém seu autor, inclusive quando ele é desativado. A exclusão de autor em uso é bloqueada no banco/API; trocar o autor ou desativar preserva as matérias.
- Os nomes livres de matérias antigas são preservados e identificados como autor anterior no seletor. Novos perfis não são criados automaticamente pela migration. Matérias novas usam a seleção do cadastro; publicação exige um autor.

Migration adicional: `backend/sql/017_create_blog_authors.sql`, depois de `016_create_blog.sql`. Aplicada apenas no banco isolado `crica_blog_phase2_local`. Para uma publicação futura, aplicar essa migration antes de subir a API atualizada. Não houve alteração no banco atual nem deploy.

APIs autenticadas: `GET /api/admin/blog/authors`, `PUT /api/admin/blog/authors/{id}`, `DELETE /api/admin/blog/authors/{id}`. O payload de matéria aceita `authorId`; `author` continua suportado para compatibilidade com os registros antigos. Perfil vinculado é retornado como `authorProfile`.

Validação: builds front/backend; 74 testes frontend e 65 backend passaram (6 antigos do catálogo ignorados por configuração específica ausente). `node scripts/test-blog-authors-local.mjs` verificou 28 chamadas e asserções: autorização, cadastro/edição, upload, limites, nomes duplicados, vínculo PT/EN, perfil público/HTML/SEO, apresentação oculta, autor inexistente/inativo e exclusão bloqueada quando em uso. Os dados temporários ficaram no banco isolado para revisão visual.

Ajustes de apresentação: avatar da matéria pública ampliado de 42 para 60 px, mantendo o recorte circular. Novo autor/editar autor substituem a listagem, seus filtros e paginação; cancelar ou salvar retorna à listagem. Builds front/backend e as 28 verificações locais passaram novamente após esses ajustes.

Idiomas públicos do News: removidos os três botões locais; seleção centralizada no rodapé. Sem escolha manual salva, `.com.br` usa português e `.com` usa espanhol para navegador em espanhol, inglês para os demais. O HTML inicial da listagem segue a mesma regra. A função CloudFront proposta encaminha `idioma` à origem (cuja política não encaminha Host), preserva links explícitos e mantém visitantes do News no domínio `.com` mesmo quando o país detectado é BR. URLs de matérias/traduções permanecem explícitas. Alterações de infraestrutura apenas em arquivos locais, sem publicação na AWS.

Navegador: cadastro e gravação do nome/apresentação, grid, seleção de autor na matéria e persistência. Fotos redondas conferidas por renderização e estilo; upload PNG/WebP verificado pela API. A automação de seleção de arquivo no Chrome foi limitada pela permissão de acesso a arquivos locais da extensão; não foi alterada nenhuma permissão do navegador.
