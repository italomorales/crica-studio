import { Component, Input, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageAdminService } from '../services/language-admin.service';
import type { CatalogLanguage } from '../services/catalog-translations';
import type { CatalogLanguageEditor, CatalogTextContent } from './supplier-language-editor';
@Component({
    selector: 'crica-catalog-language-selector',
    standalone: true,
    imports: [FormsModule],
    template: `
        <div class="form-two">
            <div>
                <label for="catalog-content-language">Idioma do cadastro</label>
                <select id="catalog-content-language" [ngModel]="editor.selected" (ngModelChange)="editor.selected = $event" [ngModelOptions]="{standalone:true}" [disabled]="disabled || loading">
                    <option value="pt">Português · original</option>
                    @for (locale of languages; track locale.code) {
                        <option [value]="locale.code">{{ locale.nativeName }}{{ locale.active ? '' : ' (inativo)' }}</option>
                    }
                </select>
            </div>
            @if (editor.selected !== 'pt') {
                <div>
                    <label for="catalog-content-status">Status da tradução</label>
                    <select id="catalog-content-status" [ngModel]="editor.status(item)" (ngModelChange)="editor.changeStatus(item,$event)" [ngModelOptions]="{standalone:true}" [disabled]="disabled">
                        <option value="pending">Pendente — usar português</option>
                        <option value="draft">Rascunho — usar português</option>
                        <option value="reviewed">Revisada — exibir no site</option>
                    </select>
                </div>
            }
        </div>
        @if (loading) { <p class="field-help" role="status">Carregando idiomas…</p> }
        @if (error) { <p role="alert">{{ error }}</p><button class="secondary" type="button" (click)="load()" [disabled]="disabled">Tentar novamente</button> }
        <p class="field-help">O idioma altera os textos deste cadastro. Os demais dados são compartilhados. Campos traduzidos vazios usam o português; somente versões revisadas aparecem no site.</p>
    `,
})
export class CatalogLanguageSelectorComponent implements OnInit {
    @Input({required:true}) editor!: CatalogLanguageEditor;
    @Input({required:true}) item!: CatalogTextContent;
    @Input() disabled = false;
    private api = inject(LanguageAdminService);
    private cd = inject(ChangeDetectorRef);
    languages: CatalogLanguage[] = [];
    loading = true;
    error = '';
    ngOnInit() { void this.load(); }
    async load() {
        this.loading = true;
        this.error = '';
        try { this.languages = (await this.api.all()).filter(locale => locale.code !== 'pt'); }
        catch (error) { this.error = (error as Error).message; }
        finally { this.loading = false; this.cd.markForCheck(); }
    }
}
