// A rota da API aceita qualquer GUID do .NET. O catálogo inicial usa GUIDs
// fixos cuja casa de versão é zero, portanto eles também representam registros
// existentes e precisam ser atualizados com PUT.
export const isExistingCatalogId = (id: string | undefined): id is string =>
    !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const catalogWriteMethod = (id: string | undefined, fixedMethod?: string) =>
    fixedMethod ?? (isExistingCatalogId(id) ? 'PUT' : 'POST');
