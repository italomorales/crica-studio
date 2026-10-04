# Idiomas da interface

A interface pública usa dicionários versionados no código. O admin de Idiomas gerencia somente código, nomes, bandeira, ordem e ativação. As traduções de tipos, temas, fornecedores e plataformas continuam no banco e são editadas pelo seletor de idioma dos respectivos cadastros. Produtos da loja usam seus textos originais.

## Incluir um idioma com a IA

1. Cadastre o novo idioma no admin e mantenha-o inativo durante a preparação.
2. Crie um arquivo em `src/app/services/locales/<codigo>.ts` seguindo `en.ts` ou `es.ts`. As chaves são os textos originais em português. Traduza todos os valores e preserve parâmetros como `{name}`, `{quantity}` e `{price}`.
3. Registre o dicionário em `INTERFACE_DICTIONARIES`, em `src/app/services/translations.ts`. Revise telas, acessibilidade, formatação e textos novos. Se precisar mudar a seleção automática por país, ajuste `language-policy.ts`.
4. Execute `npm test` e `npm run build`, valide as telas e então ative o idioma no admin. Os testes verificam que todos os dicionários têm as mesmas chaves e preservam os parâmetros.

A escolha manual de idioma continua independente de Brasil/mundo. Variantes como en-US e es-MX usam primeiro um dicionário específico, se existir, e depois o idioma base. Texto sem tradução usa o original em português. Cadastrar um idioma não cria automaticamente suas traduções de interface ou de catálogo.

## Alterar um texto

Edite o texto de origem na tela e atualize as respectivas chaves nos dicionários. A IA pode fazer essa mudança junto com os testes e a revisão visual, sem uma tela administrativa de frases. Valores antigos de interface no banco são ignorados e preservados apenas como histórico.
