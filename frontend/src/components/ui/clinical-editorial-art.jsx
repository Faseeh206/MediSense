import { useId } from 'react';

// Original SVG stationery studies. Live HTML lettering stays sharp and themed.
export function ClinicalDetailArtwork() {
    const id = useId();
    return <div className="precision-art precision-detail-art" aria-hidden="true"><div className="precision-art-canvas">
        <svg viewBox="0 0 660 420" fill="none" focusable="false">
            <defs><linearGradient id={`${id}-glass`} x1="275" y1="110" x2="450" y2="320" gradientUnits="userSpaceOnUse"><stop stopColor="var(--precision-paper)" stopOpacity=".78" /><stop offset="1" stopColor="var(--precision-paper)" stopOpacity=".22" /></linearGradient></defs>
            <g transform="rotate(-9 320 210)">
                <rect x="170" y="48" width="276" height="323" rx="5" fill="var(--precision-paper-back)" />
                <path d="M196 76H346M196 89H291" stroke="var(--precision-print)" strokeWidth="3" strokeLinecap="round" opacity=".35" />
            </g>
            <g transform="rotate(-3 350 205)">
                <rect x="220" y="25" width="284" height="336" rx="5" fill="var(--precision-paper-edge)" />
                <rect x="217" y="21" width="284" height="336" rx="5" fill="var(--precision-paper)" />
                <path d="M245 55H307M245 67H283" stroke="var(--precision-print)" strokeWidth="3" strokeLinecap="round" opacity=".35" />
                <rect x="245" y="100" width="230" height="28" rx="2" fill="var(--accent-amber)" fillOpacity=".09" />
                <path d="M256 114H343M412 114H460M246 304H327M246 316H303M425 316H469" stroke="var(--precision-print)" strokeWidth="3" strokeLinecap="round" opacity=".21" />
                <path d="M481 21V44H501" fill="var(--precision-paper-back)" />
            </g>
            <g transform="rotate(-34 455 296)">
                <rect x="446" y="272" width="24" height="117" rx="11" fill="var(--precision-metal)" />
                <rect x="450" y="282" width="4" height="92" rx="2" fill="var(--precision-paper)" fillOpacity=".42" />
                <path d="M447 294H469" stroke="var(--precision-print)" strokeOpacity=".2" />
            </g>
            <circle cx="361" cy="194" r="113" fill="var(--precision-print)" fillOpacity=".06" />
            <circle cx="357" cy="188" r="112" fill="var(--precision-metal)" />
            <circle cx="357" cy="188" r="106" fill={`url(#${id}-glass)`} stroke="var(--precision-paper)" strokeWidth="2" strokeOpacity=".7" />
            <circle cx="357" cy="188" r="99" stroke="var(--precision-print)" strokeOpacity=".15" />
            <path d="M272 148C283 123 303 106 328 100" stroke="var(--precision-paper)" strokeWidth="4" strokeLinecap="round" opacity=".85" />
        </svg>
        <div className="precision-detail-type"><span>HbA1c</span><i>Long-term blood sugar</i></div>
        <span className="precision-art-caption">The details deserve attention.</span>
    </div></div>;
}

export function ClinicalSourceArtwork() {
    const id = useId();
    return <div className="precision-art precision-source-art" aria-hidden="true"><div className="precision-art-canvas">
        <svg viewBox="0 0 660 420" fill="none" focusable="false">
            <defs><linearGradient id={`${id}-page`} x1="315" y1="200" x2="584" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="var(--precision-paper-back)" /><stop offset=".12" stopColor="var(--precision-paper)" /><stop offset="1" stopColor="var(--precision-paper)" /></linearGradient></defs>
            <g transform="rotate(-4 325 210)">
                <path d="M63 92Q189 57 321 99Q448 55 592 87L592 348Q459 327 321 367Q186 330 63 354Z" fill="var(--precision-metal)" />
                <path d="M69 85Q188 51 321 92Q450 50 586 80L586 342Q453 322 321 361Q188 323 69 348Z" fill="var(--precision-paper-edge)" />
                <path d="M74 75Q195 43 321 84V351Q196 310 74 339Z" fill="var(--precision-paper)" />
                <path d="M321 84Q448 42 582 74V337Q448 309 321 351Z" fill={`url(#${id}-page)`} />
                <path d="M316 88V345" stroke="var(--precision-print)" strokeOpacity=".13" strokeWidth="2" />
                <path d="M105 110Q196 91 283 112M105 124Q191 105 263 120M105 280Q191 267 280 288M105 294Q191 281 245 294" stroke="var(--precision-print)" strokeOpacity=".18" strokeWidth="3" strokeLinecap="round" />
                <path d="M129 166H154V221H129M241 166H216V221H241" stroke="var(--accent-amber)" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M179 179H191M179 192H201M179 205H187" stroke="var(--precision-print)" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
                <path d="M523 63L545 69V164L534 151L523 160Z" fill="var(--precision-metal)" />
                <path d="M352 303Q439 282 549 304" stroke="var(--precision-print)" strokeOpacity=".14" strokeWidth="3" strokeLinecap="round" />
            </g>
        </svg>
        <div className="precision-source-type">MediSense<small>Medicine insights</small></div>
        <span className="precision-art-caption">Source → context → understanding</span>
    </div></div>;
}

export function ClinicalConversationArtwork() {
    return <div className="precision-art precision-conversation-art" aria-hidden="true"><div className="precision-art-canvas">
        <svg viewBox="0 0 660 420" fill="none" focusable="false">
            <g transform="rotate(-6 329 204)"><rect x="100" y="55" width="442" height="291" rx="6" fill="var(--precision-paper-back)" /></g>
            <g transform="rotate(3 339 205)">
                <path d="M116 73H572V316L537 349H116Z" fill="var(--precision-paper-edge)" />
                <path d="M111 68H567V309L532 342H111Z" fill="var(--precision-paper)" />
                <path d="M532 342V309H567" fill="var(--precision-paper-back)" />
                <path d="M493 102H529M505 114H529" stroke="var(--precision-print)" strokeWidth="2" strokeLinecap="round" strokeOpacity=".2" />
                <path d="M148 121C148 109 158 104 166 104V114C160 115 157 118 157 125H166V143H148ZM175 121C175 109 185 104 193 104V114C187 115 184 118 184 125H193V143H175Z" fill="var(--accent-amber)" fillOpacity=".25" />
            </g>
            <g transform="rotate(-12 151 86)">
                <path d="M142 106V58C142 48 162 48 162 58V118C162 135 132 135 132 118V53C132 32 173 32 173 53V102" stroke="var(--precision-print)" strokeOpacity=".12" strokeWidth="6" strokeLinecap="round" />
                <path d="M140 103V55C140 45 160 45 160 55V115C160 132 130 132 130 115V50C130 29 171 29 171 50V99" stroke="var(--precision-metal)" strokeWidth="4" strokeLinecap="round" />
                <path d="M141 102V55" stroke="var(--precision-paper)" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" />
            </g>
        </svg>
        <div className="precision-conversation-type">What should I<br /><em>ask my doctor?</em><span>Start a better conversation.</span></div>
    </div></div>;
}
