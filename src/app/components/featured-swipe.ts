import { Directive, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';

/** Horizontal touch navigation without interfering with taps or vertical scrolling. */
@Directive({ selector: '[cricaFeaturedSwipe]', standalone: true })
export class FeaturedSwipeDirective {
    @Input() swipeEnabled = true;
    @Output() swipeMove = new EventEmitter<number>();
    @Output() swipePrevious = new EventEmitter<void>();
    @Output() swipeNext = new EventEmitter<void>();
    @Output() gestureStart = new EventEmitter<void>();
    @Output() gestureEnd = new EventEmitter<void>();
    private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
    private start?: { id: number; x: number; y: number };
    private axis?: 'horizontal' | 'vertical';
    private suppressClickUntil = 0;
    private readonly captureClick = (event: MouseEvent) => {
        if (event.detail > 0 && Date.now() < this.suppressClickUntil) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    };

    ngOnInit() {
        this.element.addEventListener('click', this.captureClick, true);
    }

    ngOnDestroy() {
        this.element.removeEventListener('click', this.captureClick, true);
    }

    @HostListener('touchstart', ['$event'])
    onTouchStart(event: TouchEvent) {
        this.suppressClickUntil = 0;
        if (!this.swipeEnabled) return;
        if (event.touches.length !== 1) {
            this.cancel();
            return;
        }
        if ((event.target as Element).closest('.hero-carousel-controls, .hero-share')) return;
        const touch = event.touches[0];
        this.axis = undefined;
        this.start = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
        this.gestureStart.emit();
    }

    @HostListener('touchmove', ['$event'])
    onTouchMove(event: TouchEvent) {
        if (!this.start) return;
        if (event.touches.length !== 1) { this.cancel(); return; }
        const touch = event.touches[0];
        const dx = touch.clientX - this.start.x;
        const dy = touch.clientY - this.start.y;
        if (!this.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 10)
            this.axis = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'horizontal' : 'vertical';
        if (this.axis !== 'horizontal') return;
        this.suppressClickUntil = Date.now() + 500;
        if (event.cancelable) event.preventDefault();
        this.swipeMove.emit(dx);
    }

    @HostListener('touchend', ['$event'])
    onTouchEnd(event: TouchEvent) {
        if (!this.start) return;
        const touch = Array.from(event.changedTouches).find(item => item.identifier === this.start!.id);
        if (!touch) return;
        const dx = touch.clientX - this.start.x;
        const dy = touch.clientY - this.start.y;
        if (this.axis !== 'vertical' && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            this.suppressClickUntil = Date.now() + 500;
            if (event.cancelable) event.preventDefault();
            if (dx < 0) this.swipeNext.emit();
            else this.swipePrevious.emit();
        }
        this.cancel();
    }

    @HostListener('touchcancel')
    cancel() {
        if (!this.start) return;
        this.start = undefined;
        this.axis = undefined;
        this.gestureEnd.emit();
    }
}
