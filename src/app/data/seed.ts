import {PRODUCTS,AFFILIATES} from './products';
import {SITE_CONFIG} from './site.config';
import type {CatalogState} from './models';
export function seedState():CatalogState {
 const state:CatalogState={version:1,types:[
  {id:'caneca',name:'Caneca',scope:'both',active:true},
  {id:'botton',name:'Botton',scope:'both',active:true},
  {id:'maquina',name:'Máquina de bottons',scope:'suppliers',active:true},
  {id:'embalagem',name:'Embalagem',scope:'suppliers',active:true},
  {id:'acessorio',name:'Acessório',scope:'suppliers',active:true},
  {id:'quadro',name:'Quadro',scope:'shop',active:false},
 ],products:PRODUCTS.map((p,i)=>({...structuredClone(p),typeId:p.category==='Canecas'?'caneca':'botton',status:'published',order:(i+1)*10,priceMode:'consult',fullDescription:p.description})),
 affiliates:AFFILIATES.map((p,i)=>({...structuredClone(p),typeId:p.id==='canecas-base'?'caneca':p.category==='Embalagens'?'embalagem':p.id==='componentes'?'botton':'acessorio',status:'published',order:(i+1)*10,demoListing:true})),settings:{whatsappNumber:SITE_CONFIG.whatsappNumber}};
 state.products.push({...structuredClone(state.products[0]),id:'rascunho-caneca-festa',name:'Caneca para aniversário',description:'Um exemplo de cadastro em preparação para uma festa.',fullDescription:'Rascunho demonstrativo para experimentar a edição antes de publicar.',status:'draft',order:90});
 state.products.push({...structuredClone(state.products[4]),id:'inativo-botton-evento',name:'Botton para encontro criativo',description:'Exemplo de um item que saiu do catálogo e pode ser reativado.',status:'inactive',order:100});
 state.affiliates.push({id:'maquina-shopee',name:'Máquina de bottons com matrizes',description:'Exemplo de indicação para começar a explorar a produção de bottons.',typeId:'maquina',category:'Máquina de bottons',platform:'Shopee',status:'draft',order:70,demoListing:true});
 state.affiliates.push({id:'maquina-aliexpress',name:'Máquina de bottons com matrizes',description:'O mesmo produto, cadastrado separadamente para outra plataforma.',typeId:'maquina',category:'Máquina de bottons',platform:'AliExpress',status:'draft',order:80,demoListing:true});
 return state;
}
