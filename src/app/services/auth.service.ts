import { Injectable, inject, signal } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

const KEY = 'crica.admin-access-token';
export const API_URL = (
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5030' : 'https://api.cricastudio.com')
).replace(/\/$/, '');

type LoginResponse = { accessToken: string; expiresAt: string };
export type LoginOutcome = 'ok' | 'invalid-credentials' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class AuthService {
    readonly loggedIn = signal(this.hasValidStoredToken());

    private hasValidStoredToken() {
        try {
            const token = sessionStorage.getItem(KEY);
            return !!token && !this.isExpired(token);
        } catch {
            return false;
        }
    }

    private isExpired(token: string) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
        } catch {
            return true;
        }
    }

    async login(email: string, password: string): Promise<LoginOutcome> {
        try {
            const response = await fetch(`${API_URL}/api/admin/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            if (response.status === 401) return 'invalid-credentials';
            if (!response.ok) return 'unavailable';

            const data = (await response.json()) as LoginResponse;
            if (!data.accessToken || this.isExpired(data.accessToken)) return 'unavailable';
            sessionStorage.setItem(KEY, data.accessToken);
            this.loggedIn.set(true);
            return 'ok';
        } catch {
            return 'unavailable';
        }
    }

    accessToken(): string | null {
        try {
            const token = sessionStorage.getItem(KEY);
            if (token && !this.isExpired(token)) return token;
        } catch {}
        this.logout();
        return null;
    }

    logout() {
        try {
            sessionStorage.removeItem(KEY);
        } catch {}
        this.loggedIn.set(false);
    }
}

export const authGuard: CanActivateFn = () =>
    inject(AuthService).loggedIn() || inject(Router).createUrlTree(['/login']);
