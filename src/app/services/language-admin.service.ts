import { Injectable, inject } from '@angular/core';
import { PlatformService } from './platform.service';
import type { CatalogLanguage } from './catalog-translations';
import { refreshLanguages } from './language';
@Injectable({ providedIn: 'root' })
export class LanguageAdminService {
    private api = inject(PlatformService);
    all() {
        return this.api.request<CatalogLanguage[]>('languages');
    }
    async remove(code: string) {
        await this.api.request(`languages/${encodeURIComponent(code)}`, 'DELETE');
        await refreshLanguages().catch(() => {});
    }
    async save(item: CatalogLanguage, create = false) {
        const saved = await this.api.request<CatalogLanguage>(
            `languages${create ? '' : '/' + encodeURIComponent(item.code)}`,
            create ? 'POST' : 'PUT',
            item,
        );
        await refreshLanguages().catch(() => {});
        return saved;
    }
}
