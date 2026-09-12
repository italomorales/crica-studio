import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildMessage,whatsappUrl,externalUrl,validQuantity,normalize} from '../src/app/services/contact.ts';
test('mensagem contextual, acentos e quantidade',()=>{
 const msg=buildMessage('Caneca branca personalizada',2,'Coração da mãe & café!');
 assert.equal(msg,'Olá! Vi Caneca branca personalizada no site da Crica Studio e gostaria de um orçamento. Quantidade: 2. Minha ideia: Coração da mãe & café!');
 assert.equal(new URL(whatsappUrl('12345678',msg)!).searchParams.get('text'),msg);
 assert.equal(new URL(whatsappUrl('12345678',msg)!).pathname,'/12345678');
});
test('contato ausente não produz destino; quantidades inválidas rejeitadas',()=>{
 assert.equal(whatsappUrl('', 'Olá'),undefined);assert.equal(whatsappUrl('abc','Olá'),undefined);
 for(const quantity of [0,-1,1.2,NaN,Infinity]){assert.equal(validQuantity(quantity),false);assert.throws(()=>buildMessage('Caneca',quantity,''));}
 assert.equal(validQuantity(1),true);
});
test('link HTTPS preserva todos os parâmetros de afiliado',()=>{
 const url='https://example.com/item/42?affiliate=crica%2Bstudio&utm_source=cat%C3%A1logo#details';
 assert.equal(externalUrl(url),url);assert.equal(externalUrl(undefined),undefined);assert.equal(externalUrl('javascript:alert(1)'),undefined);assert.equal(externalUrl('https://user:secret@example.com'),undefined);
});
test('busca ignora acentos e maiúsculas',()=>{assert.equal(normalize('  ALÇA '),'alca');});
