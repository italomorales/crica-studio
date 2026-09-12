import type { CatalogState, Product, AffiliateProduct, CatalogType } from '../data/models';
import { normalize, externalUrl } from './contact.ts';
export const STORAGE_KEY = 'crica.catalog.v1';
export const PLATFORMS = ['Shopee', 'Mercado Livre', 'TikTok Shop', 'AliExpress', 'Outra'] as const;
export const PRICE_LABELS = { consult: 'Sob consulta', fixed: 'Preço fixo', from: 'A partir de' };
export function priceLabel(p: Product): string {
  if (!p.priceMode || p.priceMode === 'consult' || p.price === undefined) return 'Sob consulta';
  const value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    p.price,
  );
  return (p.priceMode === 'from' ? 'A partir de ' : '') + value;
}
export function safeImage(url: string): boolean {
  return (
    /^\/assets\/[\w.-]+$/.test(url) ||
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url) ||
    !!externalUrl(url)
  );
}
export function validateItem(
  item: Product | AffiliateProduct,
  kind: 'shop' | 'suppliers',
  types: CatalogType[],
  previous?: Product | AffiliateProduct,
): string[] {
  const errors: string[] = [];
  const type = types.find((t) => t.id === item.typeId);
  if (!item.name.trim()) errors.push('Informe o título.');
  if (!type || !(type.scope === 'both' || type.scope === kind))
    errors.push('Escolha um tipo disponível para este cadastro.');
  else if (!type.active && previous?.typeId !== type.id) errors.push('Escolha um tipo ativo.');
  if (!Number.isSafeInteger(item.order) || item.order! < 0)
    errors.push('A ordem deve ser um número inteiro a partir de zero.');
  if (!['draft', 'published', 'inactive'].includes(item.status || ''))
    errors.push('Selecione um status válido.');
  if (item.status === 'published' && !item.description.trim())
    errors.push('Inclua uma descrição curta para publicar.');
  if (kind === 'shop') {
    const p = item as Product;
    if (!['consult', 'fixed', 'from'].includes(p.priceMode || ''))
      errors.push('Selecione a forma de preço.');
    if (p.priceMode !== 'consult' && (!Number.isFinite(p.price) || p.price! <= 0))
      errors.push('Informe um preço maior que zero.');
    if (p.images.length > 5 || p.images.some((i) => !safeImage(i)))
      errors.push('Use até cinco imagens válidas: arquivo local ou endereço HTTPS.');
    if (item.status === 'published' && !p.images[0])
      errors.push('Inclua uma foto principal para publicar.');
  } else {
    const a = item as AffiliateProduct;
    if (!PLATFORMS.includes(a.platform)) errors.push('Selecione uma plataforma.');
    if (a.url && !externalUrl(a.url))
      errors.push('O link de afiliado deve ser uma URL HTTPS válida.');
    if (a.image && !safeImage(a.image)) errors.push('Use uma imagem válida.');
    if (item.status === 'published' && !a.demoListing) {
      if (!a.image) errors.push('Inclua uma foto principal para publicar.');
      if (!externalUrl(a.url))
        errors.push('Inclua o link do anúncio para publicar ou mantenha como demonstração.');
    }
  }
  return errors;
}
export function validateType(type: CatalogType, state: CatalogState): string[] {
  const errors: string[] = [];
  if (!type.name.trim()) errors.push('Informe o nome do tipo.');
  if (state.types.some((t) => t.id !== type.id && normalize(t.name) === normalize(type.name)))
    errors.push('Já existe um tipo com esse nome.');
  if (!['shop', 'suppliers', 'both'].includes(type.scope)) errors.push('Escolha onde usar o tipo.');
  if (type.scope === 'suppliers' && state.products.some((p) => p.typeId === type.id))
    errors.push('Este tipo é usado na loja. Mantenha a aplicação Loja ou Ambos.');
  if (type.scope === 'shop' && state.affiliates.some((p) => p.typeId === type.id))
    errors.push('Este tipo é usado em Fornecedores. Mantenha a aplicação Fornecedores ou Ambos.');
  return errors;
}
/** Small persistence adapter: replace this boundary with an API implementation later. */
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function persist(storage: StoragePort, state: CatalogState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
export function readState(storage: StoragePort): CatalogState | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const s = JSON.parse(raw) as CatalogState;
  if (
    s.version !== 1 ||
    !Array.isArray(s.products) ||
    !Array.isArray(s.affiliates) ||
    !Array.isArray(s.types) ||
    typeof s.settings?.whatsappNumber !== 'string'
  )
    throw new Error('Dados locais incompatíveis.');
  if (
    !s.types.every(
      (t) =>
        typeof t.id === 'string' && typeof t.name === 'string' && typeof t.active === 'boolean',
    ) ||
    !s.products.every(
      (p) =>
        typeof p.name === 'string' &&
        typeof p.description === 'string' &&
        Array.isArray(p.images) &&
        Array.isArray(p.characteristics) &&
        Array.isArray(p.personalization),
    ) ||
    !s.affiliates.every((p) => typeof p.name === 'string' && typeof p.description === 'string')
  )
    throw new Error('Dados locais inválidos.');
  return s;
}
