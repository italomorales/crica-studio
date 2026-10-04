import type { CatalogType } from '../data/models';

// A rota da API aceita qualquer GUID do .NET. O catálogo inicial usa GUIDs
// fixos cuja casa de versão é zero, portanto eles também representam registros
// existentes e precisam ser atualizados com PUT.
export const isExistingCatalogId = (id: string | undefined): id is string =>
    !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const catalogWriteMethod = (id: string | undefined, fixedMethod?: string) =>
    fixedMethod ?? (isExistingCatalogId(id) ? 'PUT' : 'POST');
// The API binds Id as a Guid. Guid.Empty asks the repository to generate an ID
// for new types; UI-only draft IDs must never be sent in this field.
export const catalogTypeRequest = (type: CatalogType) => ({
    id: isExistingCatalogId(type.id) ? type.id : '00000000-0000-0000-0000-000000000000',
    name: type.name.trim(),
    scope: type.scope,
    active: type.active,
    ...(type.translations === undefined ? {} : {translations:type.translations}),
});
