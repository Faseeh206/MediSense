import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FOLIO_PATHS, startFolioMotion } from '../../brand/folioMotion';
import BrandWordmark from './brand-wordmark';
import './folio-logo.css';

export default function FolioLogo() {
    const root = useRef(null), reduced = useReducedMotion();
    useEffect(() => startFolioMotion(root.current, { reduced }), [reduced]);
    return <a ref={root} href="#hero" className="brand-logo" aria-label="MediSense home"
        title="MediSense — hover to pause" data-brand-motion="static">
        <svg viewBox="0 0 256 256" width="56" height="56" aria-hidden="true" focusable="false">
            <g data-folio-page="left"><path d={FOLIO_PATHS[0]} /></g>
            <g data-folio-page="right"><path d={FOLIO_PATHS[1]} /></g>
        </svg>
        <BrandWordmark aria-hidden="true" />
    </a>;
}
