import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './gyroscope-cursor.css';

const SPRING = { mass: 1, stiffness: 100, damping: 10 };
const REST_ANGLE = -35;
const NATIVE_AREA = 'input, textarea, select, option, iframe, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [data-cursor="native"], dialog[open]';
const INTERACTIVE = 'a[href], button:not(:disabled), summary, [role="button"], [role="tab"], [role="switch"]';

// Original MediSense implementation. The exact click point never trails the mouse;
// only the arrow's orientation and press feedback use a spring.
export default function GyroscopeCursor({ disabled = false }) {
    const cursor = useRef(null);
    const reduced = useReducedMotion();
    const x = useMotionValue(-100), y = useMotionValue(-100);
    const direction = useMotionValue(REST_ANGLE), targetScale = useMotionValue(1);
    const angle = useSpring(direction, SPRING), scale = useSpring(targetScale, SPRING);
    const position = useMotionTemplate`translate3d(${x}px, ${y}px, 0)`;
    const arrow = useMotionTemplate`translate(-16px, -3px) rotate(${angle}deg) scale(${scale})`;

    useEffect(() => {
        if (disabled || reduced) return;
        const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
        const root = document.documentElement;
        let previous = null, visible = false, pressed = false, hovering = false, settle = 0;
        const setVisible = next => {
            if (next === visible) return;
            visible = next;
            root.classList.toggle('gyro-cursor-active', next);
            if (cursor.current) cursor.current.style.opacity = next ? '1' : '0';
        };
        const hide = () => {
            window.clearTimeout(settle);
            previous = null; pressed = false; hovering = false;
            targetScale.set(1);
            setVisible(false);
        };
        const aim = degrees => {
            const current = direction.get();
            const shortest = ((degrees - current + 180) % 360 + 360) % 360 - 180;
            direction.set(current + shortest);
        };
        const updateScale = () => targetScale.set(pressed ? 0.92 : hovering ? 1.1 : 1);
        const move = event => {
            if (!fine.matches || event.pointerType !== 'mouse' || document.hidden) { hide(); return; }
            const native = event.target instanceof Element && event.target.closest(NATIVE_AREA);
            if (native) { hide(); return; }
            const point = { x: event.clientX, y: event.clientY };
            x.set(point.x); y.set(point.y);
            if (previous) {
                const dx = point.x - previous.x, dy = point.y - previous.y;
                if (Math.hypot(dx, dy) > 0.5) aim(Math.atan2(dy, dx) * 180 / Math.PI + 90);
            } else {
                direction.jump(REST_ANGLE);
                angle.jump(REST_ANGLE);
            }
            previous = point;
            hovering = event.target instanceof Element && !!event.target.closest(INTERACTIVE);
            updateScale();
            setVisible(true);
            window.clearTimeout(settle);
            settle = window.setTimeout(() => aim(REST_ANGLE), 450);
        };
        const press = event => { if (event.pointerType === 'mouse' && visible) { pressed = true; updateScale(); } };
        const release = () => { pressed = false; updateScale(); };
        const keyboard = () => hide();
        const onScroll = () => {
            if (!visible || !previous) return;
            const element = document.elementFromPoint(previous.x, previous.y);
            if (element?.closest(NATIVE_AREA)) { hide(); return; }
            hovering = !!element?.closest(INTERACTIVE);
            updateScale();
        };
        document.addEventListener('pointermove', move, { passive: true });
        document.addEventListener('pointerdown', press, { passive: true });
        document.addEventListener('pointerup', release, { passive: true });
        document.addEventListener('pointercancel', hide);
        document.addEventListener('pointerleave', hide);
        document.addEventListener('keydown', keyboard);
        document.addEventListener('visibilitychange', hide);
        window.addEventListener('blur', hide);
        window.addEventListener('scroll', onScroll, { passive: true });
        fine.addEventListener('change', hide);
        return () => {
            hide();
            root.classList.remove('gyro-cursor-active');
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerdown', press);
            document.removeEventListener('pointerup', release);
            document.removeEventListener('pointercancel', hide);
            document.removeEventListener('pointerleave', hide);
            document.removeEventListener('keydown', keyboard);
            document.removeEventListener('visibilitychange', hide);
            window.removeEventListener('blur', hide);
            window.removeEventListener('scroll', onScroll);
            fine.removeEventListener('change', hide);
        };
    }, [disabled, reduced, x, y, direction, angle, targetScale]);

    if (typeof document === 'undefined') return null;
    return createPortal(
        <motion.div ref={cursor} className="gyro-cursor" aria-hidden="true" style={{ transform: position }}>
            <motion.svg viewBox="0 0 32 40" width="32" height="40" className="gyro-cursor-arrow" style={{ transform: arrow }}>
                <path d="M16 3 27 30 16 24 5 30Z" />
            </motion.svg>
        </motion.div>, document.body,
    );
}
