# Temas dos produtos

## Administração

`/admin/temas` permite cadastrar, editar, buscar, ativar e desativar temas.
Cada tema mostra a quantidade de produtos vinculados, incluindo rascunhos e inativos.
Um tema em uso não pode ser excluído; desative-o ou remova as associações primeiro.

No editor de um produto da loja, o campo Temas é opcional e aceita várias escolhas.
A busca ignora acentos e maiúsculas. As etiquetas permitem remover cada escolha.
Temas desativados permanecem identificados nos produtos já vinculados e podem ser
mantidos ou removidos. Novas associações exigem temas ativos.

## Loja

Temas ativos com pelo menos um produto publicado aparecem nos filtros.
Selecionar Natal e Memes mostra produtos de Natal **ou** Memes. O filtro de tipo
e a busca são combinados com os temas; o produto aparece uma única vez.
Nenhum tema selecionado mantém a listagem normal, incluindo produtos sem tema.

No computador, caixas de seleção atualizam a lista. No celular, o painel permite
escolher vários temas e aplicar com “Ver N produtos”; fechar sem aplicar descarta
as escolhas do painel. Etiquetas permitem remover filtros individualmente.
As seleções ficam nos parâmetros `q`, `tipo` e `temas` da URL, permitindo compartilhar
a busca. O botão de retorno do produto e o botão voltar do navegador preservam os filtros.
Ao alterar os filtros, a paginação recomeça e a posição da página é preservada.

## Publicação

Esta alteração usa a API ASP.NET Core e o PostgreSQL existentes.
Aplique `backend/sql/009_add_product_themes.sql` no banco de destino **antes** de
publicar o backend; em seguida publique o frontend. Não é necessário alterar os
produtos existentes, que começam sem temas. Não são cadastrados temas de exemplo
nem associações automaticamente em produção.

O roteiro de publicação e os testes do banco estão documentados no README do backend.
