import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import template from './admin-shell.html?raw';
@Component({
    selector: 'crica-admin-shell',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    template,
})
export class AdminShellComponent {
    @Input() badge = 'Conectado à API';
    private auth = inject(AuthService);
    private router = inject(Router);
    logout() {
        this.auth.logout();
        void this.router.navigate(['/login']);
    }
}
