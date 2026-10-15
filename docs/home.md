# Home pública

A rota `/` agora é a entrada do site e o destino dos logotipos. O menu brasileiro segue Home, News, Loja, Fornecedores e Vitrines. A versão internacional mantém sua regra existente: sem Loja local, com Home, News, Fornecedores e Vitrines.

A página apresenta uma abertura de marca, atalhos para as quatro áreas, até três matérias publicadas, até três produtos, até quatro vitrines e até três indicações de fornecedores. Os destaques cadastrados têm prioridade, com complementação do catálogo publicado. As seções carregam independentemente, com estados de carregamento, vazio e nova tentativa. A Home usa uma instância própria do catálogo para não alterar os filtros de outras telas.

Os produtos levam aos detalhes; as indicações e vitrines com links públicos abrem as plataformas. A seção de vitrines reúne título e cartões grandes, com logotipos e botões de acesso em destaque. Vitrines exclusivas de celular abrem diretamente no celular; no desktop, o botão “Ver como acessar” encaminha para a tela de Vitrines, mantendo a indicação de disponibilidade. Preços vêm do cadastro. A abertura usa somente a imagem ilustrativa `public/assets/home-atelier-canecas-bottons-v3.webp`, criada para o site: um ateliê aconchegante com canecas florais, bottons e uma máquina manual azul de fazer bottons ao fundo. A foto preenche o quadro, sem rotação, palavra de marca, órbita ou selo sobrepostos. O arquivo anterior `hero.webp` foi preservado. O botão final de WhatsApp acompanha a configuração do catálogo e usa a origem de conversão `home`, sem enviar texto da conversa ao Analytics.

Textos disponíveis em português, inglês e espanhol, respeitando o seletor do rodapé. A Loja e o convite para personalizados continuam limitados ao mercado brasileiro. Títulos, descrição, canonical e sitemap incluem a nova Home. As funções locais do CloudFront foram ajustadas para permitir a Home internacional; a publicação da infraestrutura segue o processo existente.

Até 700 px, o menu abre um painel lateral nativo com foco contido, fechamento por Esc, botão, área externa ou navegação, indicação de página atual e bloqueio da rolagem de fundo. Respeita preferência por movimento reduzido.

Validação: build de produção, templates Angular e 76 testes frontend. Revisão visual no navegador em desktop (1440 px), celular (390 px) e tela estreita (320 px), incluindo abertura e navegação do painel.
