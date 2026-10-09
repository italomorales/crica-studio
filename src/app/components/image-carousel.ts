import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, inject, signal } from '@angular/core';
import { ProductImageComponent } from './shared';
import { FeaturedSwipeDirective } from './featured-swipe';
import template from './image-carousel.html?raw';

@Component({
    selector: 'crica-image-carousel',
    standalone: true,
    imports: [ProductImageComponent, FeaturedSwipeDirective],
    template,
})
export class ImageCarouselComponent {
    @Input() images: (string | undefined)[] = [];
    @Input() index = 0;
    @Input() alt = 'Produto';
    @Input() label = 'CRICA / SELEÇÃO';
    @Output() indexChange = new EventEmitter<number>();
    @Output() gestureStart = new EventEmitter<void>();
    @Output() gestureEnd = new EventEmitter<void>();
    readonly slides = signal<(string | undefined)[]>([]);
    readonly position = signal(0);
    readonly drag = signal(0);
    readonly animating = signal(false);
    private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
    private activeIndex = 0;
    private timer?: ReturnType<typeof setTimeout>;
    private notify = false;
    private touching = false;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['images']) {
            clearTimeout(this.timer);
            this.animating.set(false);
            this.drag.set(0);
            this.activeIndex = Math.max(0, Math.min(this.index, this.images.length - 1));
            this.slides.set(this.images.length > 1
                ? [this.images.at(-1), ...this.images, this.images[0]] : [this.images[0]]);
            this.position.set(this.images.length > 1 ? this.activeIndex + 1 : 0);
            this.notify = false;
            this.endGesture();
        } else if (changes['index'] && this.index !== this.activeIndex) {
            this.goTo(this.index);
        }
    }

    ngOnDestroy() { clearTimeout(this.timer); }

    get transform() {
        return `translate3d(calc(${-this.position() * 100}% + ${this.drag()}px), 0, 0)`;
    }

    start() {
        this.touching = true;
        this.gestureStart.emit();
    }

    move(dx: number) {
        if (this.animating()) return;
        const width = this.element.clientWidth;
        this.drag.set(Math.max(-width, Math.min(width, dx)));
    }

    next() {
        if (!this.animating()) this.goTo((this.activeIndex + 1) % this.images.length, true);
    }

    previous() {
        if (!this.animating()) this.goTo((this.activeIndex - 1 + this.images.length) % this.images.length, true);
    }

    end() {
        if (this.drag() && !this.animating()) this.animate(this.position(), false);
        if (!this.animating()) this.endGesture();
    }

    private goTo(index: number, notify = false) {
        if (this.images.length < 2) return;
        const selected = Math.max(0, Math.min(index, this.images.length - 1));
        let position = selected + 1;
        if (this.activeIndex === 0 && selected === this.images.length - 1) position = 0;
        else if (this.activeIndex === this.images.length - 1 && selected === 0) position = this.images.length + 1;
        this.animate(position, notify);
    }

    private animate(position: number, notify: boolean) {
        clearTimeout(this.timer);
        this.notify = notify;
        this.animating.set(true);
        this.position.set(position);
        this.drag.set(0);
        // Also finish when reduced motion removes the transition or the tab is hidden.
        this.timer = setTimeout(() => this.finish(), 360);
    }

    transitionEnd(event: TransitionEvent) {
        if (event.target === event.currentTarget && event.propertyName === 'transform') this.finish();
    }

    finish() {
        if (!this.animating()) return;
        clearTimeout(this.timer);
        this.activeIndex = (this.position() - 1 + this.images.length) % this.images.length;
        this.animating.set(false);
        this.position.set(this.activeIndex + 1);
        const notify = this.notify;
        this.notify = false;
        if (notify) this.indexChange.emit(this.activeIndex);
        this.endGesture();
    }

    private endGesture() {
        if (!this.touching) return;
        this.touching = false;
        this.gestureEnd.emit();
    }
}
