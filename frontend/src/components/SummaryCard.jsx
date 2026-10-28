import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import SpringText from './ui/spring-text';

export default function SummaryCard({ summaryText }) {
    const [speaking, setSpeaking] = useState(false);
    const utterance = useRef(null);
    useEffect(() => () => {
        if (utterance.current) {
            utterance.current.onend = null; utterance.current.onerror = null;
            window.speechSynthesis?.cancel();
        }
    }, [summaryText]);
    const toggleSpeech = () => {
        if (!('speechSynthesis' in window)) { toast.error('Reading aloud is unavailable in this browser.'); return; }
        if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
        const voice = new SpeechSynthesisUtterance(summaryText);
        voice.rate = 0.95;
        voice.onend = () => setSpeaking(false);
        voice.onerror = () => setSpeaking(false);
        utterance.current = voice;
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(voice); setSpeaking(true);
    };
    return <section className="result-surface result-summary" aria-labelledby="result-summary-title">
        <div className="result-section-heading"><SpringText tag="h3" id="result-summary-title">In plain language</SpringText><button type="button" className="result-listen" onClick={toggleSpeech} disabled={!summaryText} aria-pressed={speaking}>{speaking ? <VolumeX size={17}/> : <Volume2 size={17}/>} {speaking ? 'Stop reading' : 'Listen'}</button></div>
        <p>{summaryText || 'No plain-language summary was supplied. The available details are shown below.'}</p>
    </section>;
}
