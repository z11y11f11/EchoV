import React, { useState } from 'react';
import { Search, Zap, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { runMasterAnalysis } from '../services/ai';
import AnalysisDashboard from './AnalysisDashboard';
import { AnalysisResult } from '../types';

export default function ModeA() {
  const [ticker, setTicker] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<{ agent: string; status: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    if (/\s/.test(t) || t.length > 20) {
      setError('Please enter a valid ticker symbol (e.g. AAPL, 1810.HK, TSLA)');
      return;
    }
    setError(null);
    setLoading(true);
    setAnalysis(null);
    try {
      const result = await runMasterAnalysis(
        { ticker: t, options: ['highlights', 'risks', 'competitors'] },
        (evt) => setAgentStatus(evt)
      );
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please check the ticker symbol and try again.');
    } finally {
      setLoading(false);
      setAgentStatus(null);
    }
  };

  if (analysis) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <AnalysisDashboard
          data={analysis}
          onReset={() => { setAnalysis(null); setTicker(''); }}
          onError={(msg) => setError(msg)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 max-w-lg"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-4 uppercase tracking-widest">
          <Zap className="w-3 h-3" /> Mode A — Market Analysis
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Ticker Analysis</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Enter a stock ticker. QuantAgent fetches live market data and full valuation models.
          PeerAgent identifies direct competitors. CIOAgent synthesises the final verdict.
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md"
      >
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={ticker}
              onChange={e => setTicker(e.target.value)}
              placeholder="e.g. AAPL, 1810.HK, TSLA, BABA"
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-sm disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ticker.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] text-sm"
          >
            {loading ? 'Running…' : 'Analyze'}
          </button>
        </div>
        {error && <p className="mt-3 text-rose-400 text-sm">{error}</p>}
      </motion.form>

      <AnimatePresence>
        {loading && agentStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10 flex items-center gap-4 bg-slate-900/80 border border-blue-500/20 rounded-xl px-5 py-4 max-w-md w-full"
          >
            <Bot className="w-5 h-5 text-blue-400 shrink-0 animate-pulse" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{agentStatus.agent}</div>
              <div className="text-sm text-slate-200 mt-0.5 truncate">{agentStatus.status}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 flex items-center gap-2 text-[11px] text-slate-700"
        >
          {['QuantAgent', '→', 'PeerAgent', '→', 'CIOAgent'].map((item, i) => (
            <span
              key={i}
              className={item === '→'
                ? 'text-slate-800'
                : 'px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-slate-500'}
            >
              {item}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  );
}
