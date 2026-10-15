# Interações do Crica News

Implementação local, sem publicação ou alteração no banco de produção.

## Experiência pública

- Barra abaixo da matéria: curtir, compartilhar e mostrar/ocultar comentários. A conversa começa recolhida e só busca comentários quando aberta.
- Modal de acesso Google/Facebook: fundo desfocado, cartão branco, detalhes azuis da Crica, logos dos provedores, foco preso pelo dialog nativo, Escape para fechar, foco visível e movimento reduzido.
- Com sessão: comentário com até 1500 caracteres, resposta contextual a comentários/respostas aprovados, feedback de envio e indicação privada de pendência. Paginação de 20 comentários.
- Compartilhamento: copiar link, WhatsApp, Facebook e compartilhamento nativo quando suportado. Exige sessão na interface e registra a ação sem moderação.
- Textos desta interação em PT, EN e ES seguem o idioma da matéria. Prévias administrativas não gravam interações.

## Persistência e moderação

Aplicar `backend/sql/018_create_blog_interactions.sql` após 016 e 017 e, em seguida, `019_blog_reactions_without_moderation.sql`. A migration 019 libera as curtidas/compartilhamentos existentes e impede que essas atividades recebam status de moderação. Aplicada apenas no banco local isolado.

Somente comentários e respostas começam pendentes. O admin Moderação lista exclusivamente esses conteúdos, com filtro de situação, paginação e revisão do texto integral/contexto da resposta. Aprovar, rejeitar, marcar spam e voltar à fila persistem no PostgreSQL. A API também impede moderar curtidas e compartilhamentos.

Comentários e respostas só ficam públicos após aprovação. Uma resposta só fica pública se toda a cadeia de comentários-pai estiver aprovada. Pendências próprias ficam visíveis somente ao visitante autenticado pelo identificador interno, não pelo nome. A curtida entra imediatamente no contador e pode ser retirada pelo próprio visitante. Uma curtida por visitante/matéria/idioma; curtidas repetidas são idempotentes. Comentários e registros de compartilhamento têm intervalo mínimo de 15 segundos por visitante.

## Ativar Google e Facebook

O cliente Google foi criado no projeto `crica-studio`. A configuração local é importada pelo script `backend/scripts/set-blog-google-local.ps1 -CredentialsPath <arquivo JSON baixado>`, que guarda os segredos em `%LOCALAPPDATA%/CricaStudio/Secrets/blog-google.json`, com acesso restrito ao usuário atual do Windows. `start-blog-local.ps1` carrega esse arquivo para a API de teste e desabilita a identidade simulada quando as credenciais reais estão presentes. O segredo não é gravado no repositório. A configuração de produção permanece separada. O aplicativo Facebook ainda não foi criado.

Para teste Google no banco isolado, cadastrar também `http://localhost:5031/api/blog/auth/callback/google` como URI de redirecionamento autorizada. A página de teste e a API usam `http://localhost:5031`, sem alterar os processos de desenvolvimento em 4173/5030.

No desenvolvimento normal, a API em `Development` também carrega o arquivo privado de credenciais. O frontend `http://localhost:4173` encaminha `/api` para 5030 e preserva o host público no callback: cadastrar `http://localhost:4173/api/blog/auth/callback/google`. Os cookies de visitantes são separados por banco para impedir que uma sessão do banco de teste seja usada no banco `app`. Após essa alteração, é necessário entrar novamente uma vez. `BLOG_TEST_API_URL=http://localhost:4173 node scripts/test-blog-google-local.mjs` verifica esse fluxo pelo proxy, sem abrir a conta Google.

Para iniciar essa API local: compilar com `dotnet build CricaStudio.Api/CricaStudio.Api.csproj -o .blog-dev-build` e executar `scripts/start-blog-dev.ps1` (ou `-Restart` para reiniciar a API que ocupa 5030, após conferir a identidade do processo). O script mantém `Development` e a configuração do banco normal. Em 15/10/2026, o callback por 4173 passou nas seis verificações OAuth; os 17 testes de autenticação passaram, incluindo separação de cookies por banco. A migração 019 também foi aplicada ao banco local `app`, mantendo somente comentários/respostas na moderação.

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

`backend/scripts/test-blog-interactions-local.mjs` cobre sessão, proteção CSRF, visitante sem acesso admin, JWT admin sem acesso de visitante, conteúdo pendente privado, aprovação, respostas entre matérias/idiomas bloqueadas, ocultação por rejeição do pai, curtidas imediatas/idempotentes e compartilhamentos fora da fila. Pode usar `BLOG_TEST_API_URL=http://localhost:5032` para uma instância isolada com identidade de teste; não reabilitar essa identidade na API 5031 enquanto ela usa Google real.

Reações sem moderação (15/10/2026): builds e 76 testes frontend passaram. `BlogReactionPersistenceTests` passou no PostgreSQL isolado, verificando curtida imediata, idempotência, descurtir, compartilhamento sem fila, rejeição da tentativa de moderar reações e manutenção da aprovação de comentários/respostas. A curtida real feita pelo proprietário com Google foi liberada e não há reações pendentes nesse banco.

`BlogTest` + `BlogSocial:EnableTestLogin=true` oferece uma identidade de teste de loopback para verificar o UX sem acessar contas externas. Esses endpoints não são registrados em produção nem em Development. O roteiro `start-blog-local.ps1` habilita essa configuração exclusivamente no banco isolado. Não publicar com ambiente BlogTest.

Resultado: 76 testes frontend, 77 testes backend e 52 verificações de API passaram. Seis testes antigos do catálogo foram ignorados por falta da configuração específica de integração. Builds frontend/backend aprovados. No navegador: modal anônimo, envio de resposta, curtida pendente, aprovação no admin e atualização para três comentários/uma curtida foram conferidos. Modal de compartilhamento validado em 390 × 844 sem rolagem horizontal.

Google local (15/10/2026): credenciais importadas do JSON informado pelo proprietário, fora do repositório e com ACL restrita. Google habilitado na API 5031; Facebook desabilitado. O proprietário confirmou o cadastro do callback localhost no Google Cloud. `test-blog-google-local.mjs` passou em seis chamadas locais: provedor habilitado, redirecionamento ao Google com PKCE/correlação e callback correto, retorno externo bloqueado, login simulado indisponível e callback inválido rejeitado sem criar sessão. Os 16 testes de autenticação passaram, incluindo rejeição de cookies antigos de identidade simulada ao habilitar o login real. O proprietário confirmou o retorno à matéria após login real no Google. O banco isolado confirmou um visitante Google e uma curtida pendente vinculada a esse visitante. Configuração de produção não foi alterada.
