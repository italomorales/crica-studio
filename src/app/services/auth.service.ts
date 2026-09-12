import {Injectable,inject,signal} from '@angular/core';
import {Router,CanActivateFn} from '@angular/router';
const KEY='crica.demo-session';
export const DEMO_EMAIL='demo@crica.example';
export const DEMO_PASSWORD='Crica123!';
@Injectable({providedIn:'root'})
export class AuthService {
 readonly loggedIn=signal(false);
 constructor(){try{this.loggedIn.set(sessionStorage.getItem(KEY)==='active');}catch{}}
 login(email:string,password:string){if(email.trim().toLowerCase()!==DEMO_EMAIL||password!==DEMO_PASSWORD)return false;try{sessionStorage.setItem(KEY,'active');}catch{}this.loggedIn.set(true);return true;}
 logout(){try{sessionStorage.removeItem(KEY);}catch{}this.loggedIn.set(false);}
}
// This guard simulates navigation only; it is NOT server-side authentication.
export const demoGuard:CanActivateFn=()=>inject(AuthService).loggedIn()||inject(Router).createUrlTree(['/login']);
