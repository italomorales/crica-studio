import { Injectable, inject } from '@angular/core';
import { API_URL, AuthService } from './auth.service';
export interface CatalogPlatform {
    id: string; name: string; code: string; description: string; url: string | null; logoUrl: string | null;
    locale: string; countryCode: string; status: 'draft' | 'published' | 'inactive'; order: number;
    active: boolean; mobileOnly: boolean; productCount?: number;
}
@Injectable({ providedIn: 'root' })
export class PlatformService {
    private auth = inject(AuthService);
    async request<T>(resource: string, method = 'GET', body?: unknown): Promise<T> {
        const token = this.auth.accessToken();
        if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
        const response = await fetch(`${API_URL}/api/admin/catalog/${resource}`, {
            method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        if (response.status === 401) this.auth.logout();
        if (!response.ok) {
            const problem = await response.json().catch(() => null);
            throw new Error(response.status === 401 ? 'Sua sessão expirou. Entre novamente.' :
                problem?.errors ? Object.values(problem.errors).flat().join(' ') : problem?.detail || 'Não foi possível concluir a operação.');
        }
        return response.status === 204 ? undefined as T : response.json();
    }
    save(item: CatalogPlatform) {
        const { id, productCount, ...body } = item;
        return this.request<CatalogPlatform>(`platforms${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', { ...body, id: id || '00000000-0000-0000-0000-000000000000' });
    }
    all() { return this.request<CatalogPlatform[]>('platforms'); }
    async uploadLogo(file: File): Promise<string> {
        const token = this.auth.accessToken();
        if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
        const body = new FormData(); body.append('file', file);
        const response = await fetch(`${API_URL}/api/admin/catalog/media/platforms`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
        if (response.status === 401) this.auth.logout();
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : result?.errors ? Object.values(result.errors).flat().join(' ') : result?.detail || 'Não foi possível enviar o logotipo. Tente novamente.');
        return result.url;
    }
    async publicPlatforms(locale = 'pt-BR', country = 'BR', storefronts = false): Promise<CatalogPlatform[]> {
        const query = new URLSearchParams({ locale, country, storefronts: String(storefronts) });
        const response = await fetch(`${API_URL}/api/catalog/platforms?${query}`);
        if (!response.ok) throw new Error('Não foi possível carregar as plataformas. Tente novamente.');
        return response.json();
    }
}
