import { useEffect } from 'react';
import { createAnimatable, createScope } from 'animejs';
import { useReducedMotion } from './useReducedMotion';

// Only the action glyph moves; labels, medical text and hit areas stay still.
export function useActionMotion(root, disabled = false) {
    const reduced = useReducedMotion();
    useEffect(() => {
        if (reduced || disabled || !root.current) return;
        const scope = createScope({ root, mediaQueries: { finePointer: '(hover: hover) and (pointer: fine)' } }).add(self => {
            if (!self.matches.finePointer) return;
            const element = root.current;
            const actions = element.matches('[data-motion-action]') ? [element] : element.querySelectorAll('[data-motion-action]');
            const removeListeners = [];
            actions.forEach(action => {
                const arrow = action.querySelector('[data-motion-arrow]');
                if (!arrow) return;
                const feedback = createAnimatable(arrow, { translateX: 180, translateY: 180, ease: 'outQuint' });
                const enter = event => {
                    if (event.pointerType === 'touch' || action.matches(':disabled,[data-disabled="true"]')) return;
                    feedback.translateX(3).translateY(-3);
                };
                const leave = () => { feedback.translateX(0).translateY(0); };
                action.addEventListener('pointerenter', enter);
                action.addEventListener('pointerleave', leave);
                action.addEventListener('pointercancel', leave);
                removeListeners.push(() => {
                    action.removeEventListener('pointerenter', enter);
                    action.removeEventListener('pointerleave', leave);
                    action.removeEventListener('pointercancel', leave);
                });
            });
            return () => removeListeners.forEach(remove => remove());
        });
        return () => scope.revert();
    }, [root, reduced, disabled]);
}
