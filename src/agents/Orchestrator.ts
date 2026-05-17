import { AnalysisResult, CrossAnalysisResult, ValuationSummary, ValuationVerdictResult } from "../types";
import { FundamentalAgent } from "./FundamentalAgent";
import { QuantAgent } from "./QuantAgent";
import { PeerAgent } from "./PeerAgent";
import { CIOAgent } from "./CIOAgent";

export type AgentEvent = { agent: string; status: string };

export class OrchestratorAgent {
  /**
   * The single entry point for a truly autonomous multi-agent system.
   * It delegates tasks to sub-agents without UI intervention.
   */
  static async runMasterAnalysis(
    input: { ticker?: string; file?: File; options: string[] },
    onEvent: (event: AgentEvent) => void
  ): Promise<AnalysisResult> {
    onEvent({ agent: "Orchestrator", status: "Initializing Master Analysis" });
    
    let result: Partial<AnalysisResult> = {};
    
    // Dispatch to Quant Agent
    if (input.ticker) {
      onEvent({ agent: "Orchestrator", status: "Delegating Market Data to QuantAgent" });
      const quantRes = await QuantAgent.runAutonomousAnalysis(input.ticker, input.options, (s) => onEvent({ agent: "QuantAgent", status: s.replace('QuantAgent: ', '') }));
      result = { ...result, ...quantRes };
    }
    
    // Dispatch to Fundamental Agent
    if (input.file) {
      onEvent({ agent: "Orchestrator", status: "Delegating Document parsing to FundamentalAgent" });
      const fundamentalRes = await FundamentalAgent.runAutonomousAnalysis(input.file, input.options, (s) => onEvent({ agent: "FundamentalAgent", status: s.replace('FundamentalAgent: ', '') }));
      result = { ...result, ...fundamentalRes };
    }
    
    // Dispatch to Peer Agent
    if (input.options.includes('competitors') && !result.competitors) {
       onEvent({ agent: "Orchestrator", status: "Delegating contextual peer discovery to PeerAgent" });
       onEvent({ agent: "PeerAgent", status: "Fetching real-time data for identified peers" });
       const contextStr = result.summary || (input.ticker ? input.ticker : "Financial Document");
       const peers = await PeerAgent.identifyPeers(contextStr);
       result.competitors = peers;
    }

    if (input.ticker && input.file) {
      onEvent({ agent: "Orchestrator", status: "Dispatching to CIOAgent for synthesis" });
      onEvent({ agent: "CIOAgent", status: "Cross-analyzing fundamentals with technical action" });
      const verdict = await CIOAgent.crossAnalyze(result, result);
      result.crossAnalysis = verdict;
    }
    
    onEvent({ agent: "Orchestrator", status: "Analysis Complete" });
    return result as AnalysisResult;
  }
  /**
   * Main entry point for Ticker-only flows.
   */
  static async startQuantFlow(ticker: string, marketData: any, options: string[]): Promise<AnalysisResult> {
    console.log("[Orchestrator] Starting Quant Flow for", ticker);
    
    // 1. Quant Agent extraction
    const quantResult = await QuantAgent.processMarketData(ticker, marketData, options);
    
    // 2. Peer Agent identification (if requested)
    if (options.includes('competitors') && !quantResult.competitors) {
       console.log("[Orchestrator] Dispatching to PeerAgent...");
       const peers = await PeerAgent.identifyPeers(JSON.stringify(quantResult));
       quantResult.competitors = peers;
    }

    return quantResult as AnalysisResult;
  }

  /**
   * Main entry point for PDF-based flows.
   */
  static async startFundamentalFlow(text: string, options: string[], fileBase64?: string): Promise<AnalysisResult> {
    console.log("[Orchestrator] Starting Fundamental Flow");
    
    // 1. Fundamental Agent extraction
    const fundamentalResult = await FundamentalAgent.processReport(text, options, fileBase64);
    
    // 2. Peer Agent identification (if requested)
    if (options.includes('competitors') && !fundamentalResult.competitors) {
       console.log("[Orchestrator] Dispatching to PeerAgent...");
       // We only pass a snippet to save context window
       const peers = await PeerAgent.identifyPeers(fundamentalResult.summary || text.substring(0, 5000));
       fundamentalResult.competitors = peers;
    }

    return fundamentalResult as AnalysisResult;
  }

  /**
   * Final CIO alignment analysis
   */
  static async finalizeVerdict(fundamentalAnalysis: any, marketData: any): Promise<CrossAnalysisResult> {
    console.log("[Orchestrator] Dispatching to CIO Agent for Cross Analysis...");
    return await CIOAgent.crossAnalyze(fundamentalAnalysis, marketData);
  }

  static async synthesizeValuation(valuationData: ValuationSummary): Promise<ValuationVerdictResult> {
    console.log("[Orchestrator] Dispatching to CIO Agent for Valuation Synthesis...");
    return await CIOAgent.synthesizeValuation(valuationData);
  }

  static async resolvePeerTicker(query: string): Promise<string> {
    return await PeerAgent.resolveTickerForPeer(query);
  }
}
