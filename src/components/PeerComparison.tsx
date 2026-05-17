import React, { useEffect, useState } from 'react';
import { Target, AlertCircle } from 'lucide-react';
import { ValuationSummary } from '../types';
import { resolveYahooTickersWithAI } from '../services/ai';
import { normalizeYahooTicker } from '../utils/ticker';

interface PeerComparisonProps {
  competitors: { name: string; ticker: string; rationale: string }[];
  currentTicker: string;
}

export function PeerComparison({ competitors, currentTicker }: PeerComparisonProps) {
  const [peerData, setPeerData] = useState<Record<string, ValuationSummary & { price?: number; name?: string; role?: string }>>({});
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchPeers = async () => {
      setLoading(true);
      setError('');
      try {
        // Prepare list with current company first
        const allToFetch = [{ name: "Target Company", ticker: currentTicker, rationale: "Analyzed Company", isCurrent: true }];
        competitors.forEach(c => {
           if (c.ticker) allToFetch.push({ ...c, isCurrent: false });
        });

        const newPeerData: Record<string, any> = {};
        const newDisplayOrder: string[] = [];

        await Promise.all(allToFetch.map(async (c) => {
          let tickerToTry = normalizeYahooTicker(c.ticker);
          let success = false;
          let fetchedData = null;

          // Try 1: Direct or normalized ticker
          try {
            const res = await fetch(`/api/stock/${encodeURIComponent(tickerToTry)}/summary`);
            if (res.ok) {
              fetchedData = await res.json();
              success = true;
            }
          } catch (e) {
             console.warn(`Initial fetch failed for ${tickerToTry}`);
          }

          // Try 2: LLM Resolution
          if (!success && !c.isCurrent) {
            try {
              const aiTicker = await resolveYahooTickersWithAI(c.name);
              if (aiTicker && aiTicker !== tickerToTry) {
                 tickerToTry = normalizeYahooTicker(aiTicker);
                 const res2 = await fetch(`/api/stock/${encodeURIComponent(tickerToTry)}/summary`);
                 if (res2.ok) {
                    fetchedData = await res2.json();
                    success = true;
                 }
              }
            } catch (e) {
               console.warn(`AI resolution failed for ${c.name}`);
            }
          }

          if (success && fetchedData) {
              const stats = fetchedData.defaultKeyStatistics || {};
              const financial = fetchedData.financialData || {};
              const detail = fetchedData.summaryDetail || {};
              const price = fetchedData.price?.regularMarketPrice;
              const name = fetchedData.price?.longName || fetchedData.price?.shortName || c.name;
              
              const parsedData = {
                  name,
                  role: c.isCurrent ? 'Analyzed Company' : 'Peer',
                  price,
                  trailingPE: detail.trailingPE || stats.trailingPE,
                  priceToBook: stats.priceToBook,
                  enterpriseToEbitda: stats.enterpriseToEbitda,
                  dividendYield: detail.dividendYield,
                  revenueGrowth: financial.revenueGrowth,
              };

              // Store under original AND resolved ticker to ensure rendering connects
              newPeerData[c.ticker] = parsedData;
              if (tickerToTry !== c.ticker) {
                  newPeerData[tickerToTry] = parsedData;
              }
              newDisplayOrder.push(c.ticker);
          } else {
              // mark as failed
              newDisplayOrder.push(c.ticker);
          }
        }));

        if (!active) return;

        // Ensure current ticker is first in display order
        const reordered = [currentTicker, ...newDisplayOrder.filter(t => t !== currentTicker)];
        setDisplayOrder(reordered);
        setPeerData(newPeerData);
      } catch (err: any) {
         setError('Failed to load peer data');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPeers();
    return () => { active = false; };
  }, [competitors, currentTicker]);

  // Calculate industry averages (excluding current company if possible, or include all peers)
  const peersOnly = displayOrder.filter(t => t !== currentTicker).map(t => peerData[t]).filter(Boolean);
  const avg = {
     pe: peersOnly.reduce((acc, p) => acc + (p.trailingPE || 0), 0) / (peersOnly.filter(p => p.trailingPE).length || 1),
     pb: peersOnly.reduce((acc, p) => acc + (p.priceToBook || 0), 0) / (peersOnly.filter(p => p.priceToBook).length || 1),
     ev: peersOnly.reduce((acc, p) => acc + (p.enterpriseToEbitda || 0), 0) / (peersOnly.filter(p => p.enterpriseToEbitda).length || 1),
     revG: peersOnly.reduce((acc, p) => acc + (p.revenueGrowth || 0), 0) / (peersOnly.filter(p => p.revenueGrowth).length || 1),
     div: peersOnly.reduce((acc, p) => acc + (p.dividendYield || 0), 0) / (peersOnly.filter(p => p.dividendYield).length || 1),
  };

  return (
    <div className="w-full">
      <div className="bg-[#080a0f]/80 rounded-xl border border-slate-800/80 overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.05)] backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0a0d14] border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">P/E</th>
                <th className="px-6 py-4">P/B</th>
                <th className="px-6 py-4">EV/EBITDA</th>
                <th className="px-6 py-4">Growth %</th>
                <th className="px-6 py-4">Div Yield</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
               <tr>
                 <td colSpan={8} className="px-6 py-8 text-center text-blue-400 animate-pulse font-mono text-xs">
                   Peer Agent is fetching and validating real-time peer data...
                 </td>
               </tr>
            ) : (
               <>
                 {displayOrder.map(ticker => {
                   const d = peerData[ticker];
                   const isCurrent = ticker === currentTicker;
                   
                   if (!d) return (
                      <tr key={ticker} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">
                           {ticker} <span className="text-xs text-slate-500 font-mono ml-1">{ticker}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{isCurrent ? 'Analyzed' : 'Peer'}</td>
                        <td colSpan={6} className="px-6 py-4 text-slate-600 text-xs italic font-mono">Data unavailable</td>
                      </tr>
                   );

                   return (
                     <tr key={ticker} className={`hover:bg-slate-800/40 transition-colors ${isCurrent ? 'bg-indigo-900/10' : ''}`}>
                       <td className="px-6 py-4">
                         <div className={`font-bold truncate max-w-[200px] ${isCurrent ? 'text-indigo-400' : 'text-slate-200'}`}>{d.name}</div>
                         <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{ticker}</div>
                       </td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border ${isCurrent ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700'}`}>
                           {d.role}
                         </span>
                       </td>
                       <td className="px-6 py-4 font-mono text-slate-300">{d.price ? `$${d.price.toFixed(2)}` : '-'}</td>
                       <td className="px-6 py-4 font-mono text-slate-300">{d.trailingPE?.toFixed(2) || '-'}</td>
                       <td className="px-6 py-4 font-mono text-slate-300">{d.priceToBook?.toFixed(2) || '-'}</td>
                       <td className="px-6 py-4 font-mono text-slate-300">{d.enterpriseToEbitda?.toFixed(2) || '-'}</td>
                       <td className="px-6 py-4 font-mono">
                         {d.revenueGrowth ? (
                           <span className={d.revenueGrowth > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                             {(d.revenueGrowth * 100).toFixed(1)}%
                           </span>
                         ) : <span className="text-slate-500">-</span>}
                       </td>
                       <td className="px-6 py-4 font-mono text-slate-300">{d.dividendYield ? `${(d.dividendYield * 100).toFixed(2)}%` : '-'}</td>
                     </tr>
                   );
                 })}
                 
                 {/* Industry Average Row */}
                 {peersOnly.length > 0 && (
                   <tr className="bg-[#0a0d14] font-medium border-t-2 border-slate-700/50">
                     <td className="px-6 py-4 text-slate-400 uppercase tracking-wider text-[11px] font-bold">Industry Avg</td>
                     <td className="px-6 py-4"></td>
                     <td className="px-6 py-4"></td>
                     <td className="px-6 py-4 font-mono text-blue-400 font-bold">{avg.pe ? avg.pe.toFixed(2) : '-'}</td>
                     <td className="px-6 py-4 font-mono text-blue-400 font-bold">{avg.pb ? avg.pb.toFixed(2) : '-'}</td>
                     <td className="px-6 py-4 font-mono text-blue-400 font-bold">{avg.ev ? avg.ev.toFixed(2) : '-'}</td>
                     <td className="px-6 py-4 font-mono">
                       {avg.revG ? (
                         <span className={avg.revG > 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                           {(avg.revG * 100).toFixed(1)}%
                         </span>
                       ) : <span className="text-slate-600">-</span>}
                     </td>
                     <td className="px-6 py-4 font-mono text-blue-400 font-bold">{avg.div ? `${(avg.div * 100).toFixed(2)}%` : '-'}</td>
                   </tr>
                 )}
               </>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
