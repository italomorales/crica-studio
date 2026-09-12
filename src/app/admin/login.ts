import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, DEMO_EMAIL, DEMO_PASSWORD } from '../services/auth.service';
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
    demoEmail = DEMO_EMAIL;
    demoPassword = DEMO_PASSWORD;
    email = '';
    password = '';
    show = false;
    error = '';
    constructor() {
        if (this.auth.loggedIn()) this.router.navigateByUrl('/admin/loja');
    }
    fill() {
        this.email = DEMO_EMAIL;
        this.password = DEMO_PASSWORD;
        this.error = '';
    }
    submit() {
        if (this.auth.login(this.email, this.password)) {
            this.router.navigateByUrl('/admin/loja');
        } else {
            this.error = 'E-mail ou senha incorretos. Use os dados de demonstração abaixo.';
        }
    }
}
