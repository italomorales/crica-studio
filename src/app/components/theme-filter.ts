import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import type { CatalogTheme } from '../data/models';
import { normalize } from '../services/contact';
import template from './theme-filter.html?raw';

@Component({ selector: 'crica-theme-filter', standalone: true, template })
export class ThemeFilterComponent {
    @Input() themes: CatalogTheme[] = [];
    @Input() selected: string[] = [];
    @Input() label = 'Temas';
    @Input() noun = 'tema';
    @Input() plural = 'temas';
    @Input() idPrefix = 'shop-theme';
    @Output() selection = new EventEmitter<string[]>();
    @ViewChild('picker') picker?: ElementRef<HTMLDetailsElement>;
    search = '';
    expanded = false;
    get options() {
        return this.themes.filter(t => normalize(t.name).includes(normalize(this.search.trim())))
            .slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    get chips() {
        return this.selected.map(id => ({ id, name: this.themes.find(t => t.id === id)?.name ?? `${this.label} indisponível` }));
    }
    searchThemes(event: Event) { this.search = (event.target as HTMLInputElement).value; }
    toggle(id: string) {
        this.selection.emit(this.selected.includes(id) ? this.selected.filter(value => value !== id) : [...this.selected, id]);
    }
    remove(id: string) { this.selection.emit(this.selected.filter(value => value !== id)); }
    onToggle(event: Event) {
        this.expanded = (event.target as HTMLDetailsElement).open;
        if (!this.expanded) this.search = '';
    }
    close(restoreFocus = false) {
        const picker = this.picker?.nativeElement;
        if (!picker) return;
        picker.open = false;
        this.expanded = false;
        this.search = '';
        if (restoreFocus) picker.querySelector('summary')?.focus();
    }
    focusOut(event: FocusEvent) {
        if (event.relatedTarget && !this.picker?.nativeElement.contains(event.relatedTarget as Node)) this.close();
    }
    @HostListener('document:click', ['$event'])
    outside(event: MouseEvent) {
        if (this.expanded && !this.picker?.nativeElement.contains(event.target as Node)) this.close();
    }
}
