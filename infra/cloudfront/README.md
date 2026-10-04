# Brasil e internacional

Distribuição: E2SQRTKMWODZSM, função viewer request: crica-primary-domain-redirect.

O CloudFront deve fornecer CloudFront-Viewer-Country à função (cabeçalho permitido na política de cache ou de solicitação à origem). A função usa redirecionamento 302 sem cache para decisões por país.

- .com, visitante BR: www.cricastudio.com.br, preservando caminho e parâmetros.
- .com, outros países: www.cricastudio.com. A raiz e /loja levam a /fornecedores.
- .com.br: versão brasileira para qualquer país. O domínio sem www é normalizado.

O front solicita market=br ou market=international à API conforme o domínio. A API filtra pela propriedade locale da plataforma (pt-BR ou outros idiomas), incluindo totais, paginação e destaques. O indicador de produto importado é independente desse filtro. Vitrines exigem plataforma ativa e status published. A administração permanece completa nos dois domínios.

Prévia local internacional: http://localhost:4173/fornecedores?previewMarket=international. Esse parâmetro só funciona no modo de desenvolvimento; no site publicado o domínio define a versão.

Publicação: API primeiro, front depois, função CloudFront por último. O arquivo .previous.js preserva o código anterior para reversão.

Referência oficial: https://github.com/aws-samples/amazon-cloudfront-functions/tree/main/redirect-based-on-country

## Idiomas públicos

O seletor do cabeçalho oferece Português, English e Español nos dois domínios. O idioma não altera o mercado do catálogo, os filtros, os links de afiliado ou a moeda BRL. A preferência fica em localStorage (`crica.language`) por domínio; se o armazenamento estiver bloqueado, a seleção continua funcionando durante a visita.

Na primeira visita, .com.br começa em português. No .com, o front consulta `/site-context.json`: a própria função CloudFront responde somente com o país e `private, no-store`. Países de língua espanhola começam em espanhol; outros países, em inglês. Se a consulta falhar, usamos o idioma do navegador (es ou en). Preferências já salvas têm prioridade e dispensam essa consulta.

A interface pública, os títulos de página, a acessibilidade e as mensagens de contato têm traduções locais em `src/app/services/translations.ts`. Conteúdo cadastrado no catálogo permanece no texto original quando não tem tradução. A administração continua em português. O atributo lang do documento acompanha a interface, inclusive após trocar o idioma ou navegar.
