import 'zone.js';
import '@angular/compiler';
import {Component,inject} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {provideRouter,Router,RouterOutlet,withInMemoryScrolling} from '@angular/router';
import {HeaderComponent,FooterComponent} from './app/components/shared';
import {ShopComponent,SuppliersComponent} from './app/pages';
import './styles.css';
import './admin.css';
import {LoginComponent} from './app/admin/login';
import {AdminComponent,unsavedGuard} from './app/admin/admin';
import {demoGuard} from './app/services/auth.service';
@Component({selector:'crica-app',standalone:true,imports:[RouterOutlet,HeaderComponent,FooterComponent],template:`@if(!isAdmin){<crica-header/>}<router-outlet/>@if(!isAdmin){<crica-footer/>}`})
class AppComponent{router=inject(Router);get isAdmin(){return this.router.url.startsWith('/admin')||this.router.url.startsWith('/login');}}
bootstrapApplication(AppComponent,{providers:[provideRouter([{path:'',redirectTo:'loja',pathMatch:'full'},{path:'loja',component:ShopComponent,title:'Loja Crica | Crica Studio'},{path:'fornecedores',component:SuppliersComponent,title:'Fornecedores | Crica Studio'},{path:'login',component:LoginComponent,title:'Entrar | Crica Studio'},{path:'admin',redirectTo:'admin/loja',pathMatch:'full'},...['loja','fornecedores','tipos','configuracoes'].map(section=>({path:'admin/'+section,component:AdminComponent,canActivate:[demoGuard],canDeactivate:[unsavedGuard],data:{section},title:'Administração | Crica Studio'})),{path:'**',redirectTo:'loja'}],withInMemoryScrolling({scrollPositionRestoration:'enabled',anchorScrolling:'enabled'}))]}).catch(console.error);
