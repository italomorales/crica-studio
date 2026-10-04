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
