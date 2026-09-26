import { Component, Input, Output, EventEmitter, inject, NgZone, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { safeImage } from '../services/local-store';
import { AdminCatalogService } from '../services/admin-catalog.service';
import template from './image-picker.html?raw';
type Upload = {
    file: File;
    preview: string;
    state: 'waiting' | 'uploading' | 'error';
    error?: string;
};
@Component({ selector: 'crica-image-picker', standalone: true, imports: [FormsModule], template })
export class ImagePickerComponent implements OnDestroy {
    private catalog = inject(AdminCatalogService);
    private zone = inject(NgZone);
    private destroyed = false;
    @Input() images: string[] = [];
    @Input() limit = 5;
    @Input() category: 'products' | 'affiliates' = 'products';
    @Output() changed = new EventEmitter<string[]>();
    @Output() uploading = new EventEmitter<boolean>();
    failedImages = new Set<string>();
    url = '';
    error = '';
    announcement = '';
    busy = false;
    draggingFiles = false;
    dragIndex: number | null = null;
    overIndex: number | null = null;
    uploads: Upload[] = [];
    get available() {
        return Math.max(0, this.limit - this.images.length - this.uploads.length);
    }
    private emit(images: string[]) {
        this.images = images;
        this.changed.emit([...images]);
    }
    add(url: string) {
        if (this.busy || !this.available) return;
        this.error = '';
        if (!safeImage(url.trim())) {
            this.error = 'Informe um endereço HTTPS válido de imagem.';
            return;
        }
        this.emit([...this.images, url.trim()]);
        this.url = '';
    }
    remove(i: number) {
        if (!this.busy) {
            this.emit(this.images.filter((_, index) => index !== i));
            this.announcement = 'Foto removida. Salve para confirmar.';
        }
    }
    move(from: number, to: number) {
        if (this.busy || from === to || to < 0 || to >= this.images.length) return;
        const images = [...this.images];
        const [image] = images.splice(from, 1);
        images.splice(to, 0, image);
        this.emit(images);
        this.announcement = `Foto movida para a posição ${to + 1}. Salve para confirmar.`;
    }
    startDrag(event: DragEvent, i: number) {
        if (this.busy) {
            event.preventDefault();
            return;
        }
        this.dragIndex = i;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(i));
        }
    }
    overPhoto(event: DragEvent, i: number) {
        if (this.dragIndex !== null) {
            event.preventDefault();
            this.overIndex = i;
        }
    }
    dropPhoto(event: DragEvent, i: number) {
        if (this.dragIndex === null) return;
        event.preventDefault();
        event.stopPropagation();
        this.move(this.dragIndex, i);
        this.endDrag();
    }
    endDrag() {
        this.dragIndex = null;
        this.overIndex = null;
    }
    overFiles(event: DragEvent) {
        if (!event.dataTransfer?.types.includes('Files')) return;
        event.preventDefault();
        this.draggingFiles = true;
        event.dataTransfer.dropEffect = this.busy || !this.available ? 'none' : 'copy';
    }
    leaveFiles(event: DragEvent) {
        if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
            this.draggingFiles = false;
    }
    dropFiles(event: DragEvent) {
        event.preventDefault();
        this.draggingFiles = false;
        if (event.dataTransfer?.files.length) this.enqueue(Array.from(event.dataTransfer.files));
    }
    upload(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files || []);
        input.value = '';
        this.enqueue(files);
    }
    enqueue(files: File[]) {
        if (this.busy) {
            this.error = 'Aguarde o envio atual antes de adicionar mais fotos.';
            return;
        }
        const errors: string[] = [];
        for (const file of files) {
            if (
                !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                file.size > 5 * 1024 * 1024
            ) {
                errors.push(`${file.name}: use JPG, PNG ou WebP de até 5 MB.`);
                continue;
            }
            if (!this.available) {
                errors.push(`${file.name}: limite de ${this.limit} fotos atingido.`);
                continue;
            }
            this.uploads.push({ file, preview: URL.createObjectURL(file), state: 'waiting' });
        }
        this.error = errors.join(' ');
        void this.runQueue();
    }
    retry(upload: Upload) {
        if (!this.busy) {
            upload.state = 'waiting';
            void this.runQueue();
        }
    }
    discard(upload: Upload) {
        if (!this.busy) {
            URL.revokeObjectURL(upload.preview);
            this.uploads = this.uploads.filter((item) => item !== upload);
        }
    }
    private async prepare(file: File) {
        const bitmap = await createImageBitmap(file);
        try {
            const ratio = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
            canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
            canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            return await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(
                    (blob) =>
                        blob
                            ? resolve(blob)
                            : reject(new Error('Não foi possível preparar a imagem.')),
                    'image/webp',
                    0.78,
                ),
            );
        } finally {
            bitmap.close();
        }
    }
    private async runQueue() {
        if (this.busy || !this.uploads.some((item) => item.state === 'waiting')) return;
        this.busy = true;
        this.uploading.emit(true);
        try {
            for (const item of [...this.uploads]) {
                if (this.destroyed) break;
                if (item.state !== 'waiting') continue;
                this.zone.run(() => {
                    item.state = 'uploading';
                });
                try {
                    const blob = await this.prepare(item.file);
                    if (this.destroyed) break;
                    const url = await this.catalog.uploadImage(blob, this.category);
                    if (this.destroyed) break;
                    this.zone.run(() => {
                        this.emit([...this.images, url]);
                        this.uploads = this.uploads.filter((other) => other !== item);
                        URL.revokeObjectURL(item.preview);
                    });
                } catch (error) {
                    if (!this.destroyed)
                        this.zone.run(() => {
                            item.state = 'error';
                            item.error =
                                error instanceof Error
                                    ? error.message
                                    : 'Não foi possível enviar esta foto.';
                        });
                }
            }
        } finally {
            if (!this.destroyed)
                this.zone.run(() => {
                    this.busy = false;
                    this.uploading.emit(false);
                    this.announcement = this.uploads.length
                        ? 'Algumas fotos não foram enviadas. Tente novamente ou remova da fila.'
                        : 'Fotos enviadas. Organize e salve o cadastro para confirmar.';
                });
        }
    }
    ngOnDestroy() {
        this.destroyed = true;
        this.uploads.forEach((item) => URL.revokeObjectURL(item.preview));
    }
}
