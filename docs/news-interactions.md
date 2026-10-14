# Interações do Crica News

Implementação local, sem publicação ou alteração no banco de produção.

## Experiência pública

- Barra abaixo da matéria: curtir, compartilhar e mostrar/ocultar comentários. A conversa começa recolhida e só busca comentários quando aberta.
- Modal de acesso Google/Facebook: fundo desfocado, cartão branco, detalhes azuis da Crica, logos dos provedores, foco preso pelo dialog nativo, Escape para fechar, foco visível e movimento reduzido.
- Com sessão: comentário com até 1500 caracteres, resposta contextual a comentários/respostas aprovados, feedback de envio e indicação privada de pendência. Paginação de 20 comentários.
- Compartilhamento: copiar link, WhatsApp, Facebook e compartilhamento nativo quando suportado. Exige sessão na interface e registra a ação no admin. Serviços externos não podem ter seu envio controlado pela moderação do site: a moderação aprova/rejeita o registro, não desfaz o envio externo.
- Textos desta interação em PT, EN e ES seguem o idioma da matéria. Prévias administrativas não gravam interações.

## Persistência e moderação

Aplicar `backend/sql/018_create_blog_interactions.sql` após 016 e 017. Ela cria visitantes e atividades (comentário, curtida, compartilhamento) sem inserir dados de demonstração.

Todas as novas atividades começam pendentes. O admin Moderação agora lê a API e oferece filtros por situação/tipo, paginação e revisão do texto integral/contexto da resposta. Aprovar, rejeitar, marcar spam e voltar à fila persistem no PostgreSQL.

Comentários e respostas só ficam públicos após aprovação. Uma resposta só fica pública se toda a cadeia de comentários-pai estiver aprovada. Pendências próprias ficam visíveis somente ao visitante autenticado pelo identificador interno, não pelo nome. Uma curtida por visitante/matéria/idioma; apenas as aprovadas entram no contador. Curtidas repetidas são idempotentes. Comentários e registros de compartilhamento têm intervalo mínimo de 15 segundos por visitante.

## Ativar Google e Facebook

Os aplicativos ainda não foram criados. Os botões não simulam contas: apresentam uma mensagem enquanto faltam credenciais. Nenhum segredo foi colocado no código.

1. Criar um cliente OAuth de aplicação web no Google e um aplicativo Facebook com login web. Cadastrar as URLs de retorno exatas de ambos os domínios:

   - `https://www.cricastudio.com.br/api/blog/auth/callback/google`
   - `https://www.cricastudio.com/api/blog/auth/callback/google`
   - `https://www.cricastudio.com.br/api/blog/auth/callback/facebook`
   - `https://www.cricastudio.com/api/blog/auth/callback/facebook`

2. Configurar na API (cofre de segredos/variáveis de ambiente, nunca Git):

   - `BlogSocial__Google__ClientId`, `BlogSocial__Google__ClientSecret`
   - `BlogSocial__Facebook__ClientId`, `BlogSocial__Facebook__ClientSecret`
   - Ambos os sites em `Cors__AllowedOrigins__...`.

3. O navegador usa `/api/blog/*` no próprio domínio para evitar depender de cookies de terceiros entre `.com.br` e `api.cricastudio.com`. Publicar esse comportamento CloudFront sem cache, com cookies e parâmetros encaminhados à origem e todos os métodos permitidos. `prepare-blog-config.mjs` prepara a configuração local.

4. A função `crica-blog-ready-viewer-request.js` sobrescreve `X-Crica-Viewer-Host`. A origem deve acrescentar um segredo `X-Crica-Proxy-Key`; a API deve receber o mesmo valor em `BlogSocial__ProxyKey`. Para preparar o arquivo CloudFront, fornecer o segredo pela variável de processo `BLOG_ORIGIN_PROXY_KEY`. Tratar o JSON gerado como sensível. Somente com essa chave a API usa o domínio do visitante para gerar os callbacks OAuth. Sem esse passo, callbacks podem apontar para a origem da API.

5. Reiniciar a API e testar login real nos dois domínios, aprovação, expiração e saída. Em múltiplas instâncias, manter um chaveiro ASP.NET Data Protection compartilhado/persistente para cookies e correlação OAuth.

Usa os handlers oficiais ASP.NET Core Google/Facebook. Sessão HttpOnly separada da autenticação JWT administrativa, cookie Secure em produção, correlação OAuth e PKCE no Google. Não guarda tokens dos provedores nem pede e-mail ou acesso para publicar no perfil. Escritas exigem autenticação de visitante, cabeçalho de proteção CSRF e origem permitida.

Referências: [Google OAuth web](https://developers.google.com/identity/protocols/oauth2/web-server), [Facebook login web](https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/), [ASP.NET OAuth](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authentication.oauth.oauthoptions?view=aspnetcore-10.0).

## Validação local

`backend/scripts/test-blog-interactions-local.mjs` faz 52 verificações de API no localhost/banco isolado: sessão, proteção CSRF, visitante sem acesso admin, JWT admin sem acesso de visitante, conteúdo pendente privado, aprovação, respostas entre matérias/idiomas bloqueadas, ocultação por rejeição do pai, curtidas idempotentes/moderadas e compartilhamentos na fila.

`BlogTest` + `BlogSocial:EnableTestLogin=true` oferece uma identidade de teste de loopback para verificar o UX sem acessar contas externas. Esses endpoints não são registrados em produção nem em Development. O roteiro `start-blog-local.ps1` habilita essa configuração exclusivamente no banco isolado. Não publicar com ambiente BlogTest.

Resultado: 76 testes frontend, 77 testes backend e 52 verificações de API passaram. Seis testes antigos do catálogo foram ignorados por falta da configuração específica de integração. Builds frontend/backend aprovados. No navegador: modal anônimo, envio de resposta, curtida pendente, aprovação no admin e atualização para três comentários/uma curtida foram conferidos. Modal de compartilhamento validado em 390 × 844 sem rolagem horizontal. Login externo ainda depende dos aplicativos e das credenciais acima.
