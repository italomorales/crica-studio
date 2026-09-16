import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { safeImage } from '../services/local-store';
import { AdminCatalogService } from '../services/admin-catalog.service';
import imagePickerTemplate from './image-picker.html?raw';

@Component({
    selector: 'crica-image-picker',
    standalone: true,
    imports: [FormsModule],
    template: imagePickerTemplate,
})
export class ImagePickerComponent {
    private catalog = inject(AdminCatalogService);
    @Input() images: string[] = [];
    @Input() limit = 5;
    @Input() category: 'products' | 'affiliates' = 'products';
    @Output() changed = new EventEmitter<string[]>();
    url = '';
    error = '';
    showExamples = false;
    busy = false;
    add(url: string) {
        this.error = '';
        if (this.images.length >= this.limit) {
            this.error = 'Remova uma foto antes de adicionar outra.';
            return;
        }
        if (!safeImage(url.trim())) {
            this.error = 'Informe uma URL HTTPS válida ou escolha uma imagem de demonstração.';
            return;
        }
        this.changed.emit([...this.images, url.trim()]);
        this.url = '';
    }
    remove(i: number) {
        this.changed.emit(this.images.filter((_, index) => index !== i));
    }
    async upload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.error = '';
        if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
            file.size > 5 * 1024 * 1024
        ) {
            this.error = 'Escolha uma imagem PNG, JPG ou WebP de até 5 MB.';
            input.value = '';
            return;
        }
        this.busy = true;
        try {
            const bitmap = await createImageBitmap(file);
            const ratio = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(bitmap.width * ratio);
            canvas.height = Math.round(bitmap.height * ratio);
            canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const output = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.')), 'image/webp', 0.78),
            );
            bitmap.close();
            if (output.size > 5 * 1024 * 1024) throw new Error('Esta imagem ocupa muito espaço. Use uma versão menor.');
            this.add(await this.catalog.uploadImage(output, this.category));
        } catch (e) {
            this.error = e instanceof Error ? e.message : 'Não foi possível abrir a imagem.';
        } finally {
            this.busy = false;
            input.value = '';
        }
    }
}
