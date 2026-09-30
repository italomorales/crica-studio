# Medição de contatos pelo WhatsApp

## Preparado em 30/09/2026

A ação `WhatsApp - Clique no site` foi criada no Google Ads, categoria Contato,
principal, contagem Uma, janela de clique de 30 dias e valor de R$ 0.
Destino do evento: `AW-617194162/2xFkCM-lm4wdELLFpqYC`.
O assistente de configuração está na tela de resumo, aguardando revisão.

O código local envia a conversão ao Ads e o evento `whatsapp_click` ao GA4
`G-6GMXMZH5KQ` nos cliques dos botões flutuante, rodapé, orçamento em quantidade,
página de produto e diálogo de produto. Não conta visualização da página,
compartilhamento de produto ou links de fornecedores.

O GA4 recebe origem do botão (`contact_source`), caminho da página e,
em pedidos, identificador do produto e quantidade. Não enviamos o telefone,
URL de saída, mensagem de personalização ou parâmetros da página nos eventos.
Prévias locais não enviam esses eventos. Falhas da tag não bloqueiam o contato.

## Publicação e conferência

As alterações ainda não foram publicadas. O push para `main` dispara o deploy
automático em produção. Publicar somente após a revisão solicitada pelo usuário.

Após publicar, concluir o assistente no Ads e conferir a instalação com o
Tag Assistant e `whatsapp_click` no GA4. Um evento disparado não comprova
atribuição a anúncio; o Ads só registra contatos atribuíveis conforme suas regras.
Não importar o mesmo evento do GA4 como outra conversão principal, para evitar
duplicidade com a conversão direta já criada.

Revisar a antiga ação `Visualização de página` para usá-la como secundária e
confirmar que Contato é a meta da campanha. Isso ainda está pendente, assim
como a validação de recebimento dos eventos em produção. Orçamento e estratégia
de lances não foram alterados nesta implementação.

## Como avaliar resultado

O clique no WhatsApp mede intenção de contato, não mensagem enviada nem venda.
No Ads, acompanhar custo por conversão desta ação; na rotina da empresa,
conferir quantas conversas chegam, quantas viram orçamento e quantas viram venda.
Só essas etapas permitem estimar o custo por cliente real.
