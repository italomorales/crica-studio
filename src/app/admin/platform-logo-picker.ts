import { Component, ChangeDetectorRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { PlatformService } from '../services/platform.service';
import { PLATFORM_LOGOS, safePlatformLogo } from '../services/platform-logos';

@Component({ selector: 'crica-platform-logo-picker', standalone: true,
    template: `
    <div class="logo-preview">
        @if (preview) { <img [src]="preview" alt="Logotipo selecionado" /> }
        @else { <span>Sem logotipo</span> }
        <div><button class="secondary" type="button" (click)="fileInput.click()" [disabled]="disabled || uploading">{{ uploading ? 'Enviando…' : 'Enviar logotipo' }}</button>
        @if (value) { <button class="text-link" type="button" (click)="select(null)" [disabled]="disabled || uploading">Remover</button> }
        <p class="field-help">JPG, PNG ou WebP de até 5 MB.</p></div>
    </div>
    <input #fileInput type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Enviar logotipo" (change)="fileChanged($event)" [disabled]="disabled || uploading" />
    <p class="field-help">Ou escolha um logotipo disponível:</p>
    <div class="logo-options" role="group" aria-label="Logotipos disponíveis">
        @for (logo of logos; track logo.code) {
            <button type="button" class="logo-option" [attr.aria-pressed]="value === logo.url" (click)="select(logo.url)" [disabled]="disabled || uploading"><img [src]="logo.url" alt="" /><span>{{ logo.name }}</span></button>
        }
    </div>
    @if (error) { <p class="logo-error" role="alert">{{ error }}</p> }
    `,
    styles: [`:host{display:block;margin:8px 0 20px}.logo-preview{display:flex;align-items:center;gap:18px;padding:16px;border:1px solid #d9e3ef;border-radius:10px}.logo-preview>img{width:72px;height:64px;object-fit:contain}.logo-preview>span{display:grid;place-items:center;width:72px;height:64px;font-size:12px;color:#65758b;background:#f5f7fa;border-radius:8px}.logo-preview .text-link{margin-left:12px}.logo-preview p{margin:8px 0 0}.logo-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.logo-option{display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 8px;background:white;border:1px solid #d9e3ef;border-radius:9px;color:#17304e;font:inherit;font-size:13px;cursor:pointer}.logo-option img{width:54px;height:42px;object-fit:contain}.logo-option[aria-pressed=true]{border-color:#075cb3;box-shadow:0 0 0 1px #075cb3;background:#f0f7ff}.logo-option:disabled{opacity:.6;cursor:wait}.logo-option:focus-visible{outline:3px solid #91caff;outline-offset:2px}.logo-error{color:#b42318;font-size:14px}@media(max-width:400px){.logo-options{grid-template-columns:repeat(2,minmax(0,1fr))}}`],
})
export class PlatformLogoPickerComponent {
    @Input() value: string | null = null;
    @Input() disabled = false;
    @Output() valueChange = new EventEmitter<string | null>();
    @Output() uploadingChange = new EventEmitter<boolean>();
    readonly logos = PLATFORM_LOGOS;
    uploading = false; error = '';
    private service = inject(PlatformService);
    private cd = inject(ChangeDetectorRef);
    get preview() { return safePlatformLogo(this.value); }
    select(value: string | null) {
        if (this.disabled || this.uploading) return;
        this.error = ''; this.value = value; this.valueChange.emit(value);
    }
    async fileChanged(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0]; input.value = '';
        if (!file || this.disabled || this.uploading) return;
        await this.upload(file);
    }
    async upload(file: File) {
        if (this.disabled || this.uploading) return;
        this.error = '';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
            this.error = 'Escolha uma imagem JPG, PNG ou WebP de até 5 MB.'; return;
        }
        this.uploading = true; this.uploadingChange.emit(true);
        try {
            const url = await this.service.uploadLogo(file);
            if (!safePlatformLogo(url)) throw new Error('O servidor não retornou um logotipo válido.');
            this.value = url; this.valueChange.emit(url);
        } catch (error) { this.error = (error as Error).message; }
        finally { this.uploading = false; this.uploadingChange.emit(false); this.cd.markForCheck(); }
    }
}
