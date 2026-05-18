import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { runMasterAnalysis } from '../services/ai';

interface UploaderProps {
  onUploadStarted: () => void;
  onAnalysisComplete: (result: any) => void;
  onError: (msg: string) => void;
  onAgentEvent: (evt: { agent: string, status: string }) => void;
}

export default function Uploader({ onUploadStarted, onAnalysisComplete, onError, onAgentEvent }: UploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [options, setOptions] = useState<string[]>(['highlights', 'risks', 'esg', 'competitors']);
  const [userRequest, setUserRequest] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableOptions = [
    { id: 'highlights', label: 'Investment Highlights' },
    { id: 'risks', label: 'Strategic Risks' },
    { id: 'esg', label: 'ESG Summary' },
    { id: 'competitors', label: 'Competitor Analysis' },
  ];

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      onError('Please upload a PDF file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      onError('File is too large. Please upload a PDF under 20MB.');
      return;
    }
    if (options.length === 0) {
      onError('Please select at least one analysis option.');
      return;
    }

    setIsUploading(true);
    onUploadStarted();

    try {
      const analysis = await runMasterAnalysis({ file: file, options, userRequest: userRequest.trim() || undefined }, onAgentEvent);
      onAnalysisComplete(analysis);
    } catch (err: any) {
      console.error(err);
      onError(err.message || 'An error occurred during analysis. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <motion.div
        id="uploader-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative group cursor-pointer border rounded-2xl p-12 overflow-hidden bg-[#080a0f]/50
          transition-all duration-300 flex flex-col items-center justify-center gap-4
          ${isDragging 
            ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_30px_rgba(37,99,235,0.2)]' 
            : 'border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/30'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3b82f6 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}></div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
          accept="application/pdf"
        />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="loading"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center z-10"
            >
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
              <div>
                <h3 className="text-lg font-bold text-white">
                  Orchestrating AI Experts
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Master Orchestrator is assigning tasks to sub-agents...
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center z-10"
            >
              <div className="w-16 h-16 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all duration-300">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Financial Report</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Drag and drop your PDF here, or click to browse
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-md mt-2">
                <FileText className="w-3 h-3 text-blue-500" />
                <span className="font-mono">PDF Documents only</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Natural Language Orchestration */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-[#080a0f]/80 p-5 rounded-2xl shadow-sm border border-slate-800/80"
      >
        <div className="mb-3 text-left">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px]">Orchestrator Request</h3>
          <p className="text-xs text-slate-500 mt-1">Describe which agents to run; checkboxes below remain as fallback.</p>
        </div>
        <textarea
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          placeholder="e.g. I only want valuation and ESG, skip peer comparison"
          rows={3}
          className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/40"
        />
      </motion.div>

      {/* Extraction Options UI */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#080a0f]/80 p-5 rounded-2xl shadow-sm border border-slate-800/80"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px]">Analysis Directives</h3>
            <p className="text-xs text-slate-500 mt-1">Toggle active sub-agents for PDF extraction</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setOptions(availableOptions.map(o => o.id))}
              className="text-xs font-bold text-blue-400 hover:text-white px-2 py-1 rounded border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
            >
              Enable All
            </button>
            <span className="text-slate-800">|</span>
            <button 
              onClick={() => setOptions([])}
              className="text-xs font-bold text-slate-500 hover:text-slate-300 px-2 py-1 rounded border border-transparent hover:border-slate-700 hover:bg-slate-800/50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {availableOptions.map((opt) => {
            const isChecked = options.includes(opt.id);
            return (
              <label 
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isChecked 
                    ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_10px_rgba(37,99,235,0.1)]' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                }`}
              >
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setOptions([...options, opt.id]);
                    } else {
                      setOptions(options.filter(id => id !== opt.id));
                    }
                  }}
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  isChecked ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_8px_rgba(37,99,235,0.8)]' : 'border-slate-700 bg-slate-800'
                }`}>
                  {isChecked && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm font-semibold ${isChecked ? 'text-blue-300' : 'text-slate-400'}`}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
