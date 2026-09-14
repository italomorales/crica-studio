import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import loginTemplate from './login.html?raw';

@Component({
    selector: 'crica-login',
    standalone: true,
    imports: [FormsModule, RouterLink],
    template: loginTemplate,
})
export class LoginComponent {
    auth = inject(AuthService);
    router = inject(Router);
    changeDetector = inject(ChangeDetectorRef);
    email = '';
    password = '';
    show = false;
    error = '';
    loading = false;
    constructor() {
        if (this.auth.loggedIn()) this.router.navigateByUrl('/admin/loja');
    }
    async submit() {
        if (this.loading) return;
        this.error = '';
        this.loading = true;
        const outcome = await this.auth.login(this.email, this.password);
        this.loading = false;
        if (outcome === 'ok') {
            this.router.navigateByUrl('/admin/loja');
        } else if (outcome === 'invalid-credentials') {
            this.error = 'E-mail ou senha incorretos.';
        } else {
            this.error = 'Não foi possível acessar a API. Tente novamente em instantes.';
        }
        this.changeDetector.detectChanges();
    }
}
