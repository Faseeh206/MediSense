import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './hooks/useReducedMotion';
import Header from './components/Header';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import UploadZone from './components/UploadZone';
import ResultsPanel from './components/ResultsPanel';
import ReviewsSection from './components/ReviewsSection';
import FeaturesGrid from './components/FeaturesGrid';
import Footer from './components/Footer';
import HistoryDrawer from './components/HistoryDrawer';
import GyroscopeCursor from './components/ui/gyroscope-cursor';
import { useTheme } from './hooks/useTheme';
import { fetchHealth, fetchHistory } from './utils/api';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { scrollToElement } from './utils/scroll';

export default function App() {
  useSmoothScroll();
  const { theme, toggleTheme } = useTheme();
  const [systemHealth, setSystemHealth] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const reduce = useReducedMotion();
  const pendingScroll = useRef(null);
  const loadHistoryList = useCallback(async () => {
    setHistoryLoading(true); setHistoryError('');
    try {
      const data = await fetchHistory();
      if (!Array.isArray(data)) throw new Error('Unexpected history response');
      setHistoryList(data);
    } catch {
      setHistoryError('Your scans could not be loaded. Please try again.');
    } finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    fetchHealth().then(setSystemHealth).catch(err => {
      console.warn('Backend offline or starting up:', err);
    });
    fetchHistory().then(data => { if (active) setHistoryList(data); })
      .catch(() => { if (active) setHistoryError('Your scans could not be loaded. Please try again.'); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, []);

  // Refresh pin positions after results change the document's measured height.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      if (pendingScroll.current) {
        scrollToElement(pendingScroll.current, reduce);
        pendingScroll.current = null;
      }
    });
    const results = document.getElementById('results-section');
    let resizeFrame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    if (results) observer.observe(results);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
    };
  }, [analysisResult, reduce]);

  const showResult = result => {
    pendingScroll.current = 'results-section';
    setAnalysisResult(result);
  };
  const handleAnalysisSuccess = result => {
    showResult(result);
    if (result.saved_to_history === false) toast.warning(result.persistence_warning || 'Your explanation is ready, but it could not be saved to history. You can still print or share it.');
    else loadHistoryList();
  };
  const handleSelectSample = showResult;
  const handleSelectHistoryRecord = showResult;
  const handleResetAnalysis = () => {
    pendingScroll.current = 'upload-section';
    setAnalysisResult(null);
  };
  const scrollToUpload = () => scrollToElement('upload-section', reduce);
  const scrollToDemo = () => scrollToElement('upload-samples', reduce);

  return (
    <div className="site-shell">
      <GyroscopeCursor disabled={isHistoryOpen} />
      <a className="skip-link" href="#upload-section">Skip to document upload</a>
      <Toaster position="top-right" richColors theme={theme} />

      {/* Glassmorphic Navigation */}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        systemHealth={systemHealth}
        historyCount={historyList.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Content Area */}
      <main className="site-main">
        <Hero onScrollToUpload={scrollToUpload} onScrollToDemo={scrollToDemo} />

        <HowItWorks />

        {/* Upload Zone */}
        <UploadZone
          onAnalysisSuccess={handleAnalysisSuccess}
          onSelectSample={handleSelectSample}
          activeSampleKey={analysisResult?.is_sample ? analysisResult.sample_key : null}
        />

        {/* Results Presentation (rendered when document is analyzed) */}
        {analysisResult && (
          <ResultsPanel key={analysisResult.id ?? analysisResult.sample_key ?? analysisResult.created_at ?? analysisResult.file_name} data={analysisResult} onReset={handleResetAnalysis} />
        )}

        <FeaturesGrid />
        <ReviewsSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Scan History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyList={historyList}
        loading={historyLoading}
        error={historyError}
        onSelectRecord={handleSelectHistoryRecord}
        onRefreshHistory={loadHistoryList}
      />
    </div>
  );
}
