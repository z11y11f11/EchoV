import { AnalysisResult, CrossAnalysisResult, ValuationSummary, ValuationVerdictResult } from "../types";
import { FundamentalAgent } from "./FundamentalAgent";
import { QuantAgent } from "./QuantAgent";
import { PeerAgent } from "./PeerAgent";
import { CIOAgent } from "./CIOAgent";
import { OrchestratorToolCall, planOrchestratorToolCalls } from "./LLMProvider";

export type AgentEvent = { agent: string; status: string };

export class OrchestratorAgent {
  /**
   * The single entry point for a truly autonomous multi-agent system.
   * It delegates tasks to sub-agents without UI intervention.
   */
  static async runMasterAnalysis(
    input: { ticker?: string; file?: File; options: string[]; userRequest?: string },
    onEvent: (event: AgentEvent) => void
  ): Promise<AnalysisResult> {
    onEvent({ agent: "Orchestrator", status: "Initializing Master Analysis" });
    
    let result: Partial<AnalysisResult> = {};
    const hasNaturalLanguageRequest = Boolean(input.userRequest?.trim());
    const toolPlan = hasNaturalLanguageRequest
      ? await this.planWithLLM(input, onEvent)
      : this.planFromCheckboxFallback(input);

    onEvent({
      agent: "Orchestrator",
      status: `Tool plan: ${toolPlan.map((call) => call.name).join(" -> ") || "No tools selected"}`
    });

    for (const toolCall of toolPlan) {
      switch (toolCall.name) {
        case "fetch_market_data": {
          const ticker = toolCall.arguments.ticker || input.ticker;
          if (!ticker) {
            onEvent({ agent: "QuantAgent", status: "Skipped: no ticker available" });
            break;
          }

          onEvent({ agent: "Orchestrator", status: "Calling fetch_market_data -> QuantAgent" });
          const quantRes = await QuantAgent.runAutonomousAnalysis(
            ticker,
            toolCall.arguments.options || input.options,
            (s) => onEvent({ agent: "QuantAgent", status: s.replace('QuantAgent: ', '') })
          );
          result = { ...result, ...quantRes };
          onEvent({ agent: "QuantAgent", status: this.describeAgentReturn(quantRes) });
          break;
        }

        case "analyze_document": {
          if (!input.file) {
            onEvent({ agent: "FundamentalAgent", status: "Skipped: no document uploaded" });
            break;
          }

          onEvent({ agent: "Orchestrator", status: "Calling analyze_document -> FundamentalAgent" });
          const fundamentalRes = await FundamentalAgent.runAutonomousAnalysis(
            input.file,
            toolCall.arguments.options || input.options,
            (s) => onEvent({ agent: "FundamentalAgent", status: s.replace('FundamentalAgent: ', '') })
          );
          result = { ...result, ...fundamentalRes };
          onEvent({ agent: "FundamentalAgent", status: this.describeAgentReturn(fundamentalRes) });
          break;
        }

        case "compare_peers": {
          onEvent({ agent: "Orchestrator", status: "Calling compare_peers -> PeerAgent" });
          const contextStr = toolCall.arguments.context || result.summary || result.company?.name || input.ticker || input.userRequest || "Financial Document";
          const peers = await PeerAgent.identifyPeers(contextStr);
          result.competitors = peers;
          onEvent({ agent: "PeerAgent", status: `Returned ${peers.length} competitors` });
          break;
        }

        case "synthesize_verdict": {
          onEvent({ agent: "Orchestrator", status: "Calling synthesize_verdict -> CIOAgent" });
          const verdict = await CIOAgent.crossAnalyze(result, result);
          result.crossAnalysis = verdict;
          onEvent({ agent: "CIOAgent", status: this.describeAgentReturn(verdict) });
          break;
        }
      }
    }
    
    onEvent({ agent: "Orchestrator", status: "Analysis Complete" });
    return result as AnalysisResult;
  }

  private static async planWithLLM(
    input: { ticker?: string; file?: File; options: string[]; userRequest?: string },
    onEvent: (event: AgentEvent) => void
  ): Promise<OrchestratorToolCall[]> {
    onEvent({ agent: "Orchestrator", status: "Interpreting natural language request with function calling" });
    try {
      const llmPlan = await planOrchestratorToolCalls({
        userRequest: input.userRequest || "",
        ticker: input.ticker,
        hasDocument: Boolean(input.file),
        fallbackOptions: input.options
      });

      if (llmPlan.length > 0) return llmPlan;
      onEvent({ agent: "Orchestrator", status: "LLM returned no tools; using checkbox fallback" });
    } catch (error: any) {
      onEvent({ agent: "Orchestrator", status: `Planner unavailable; using checkbox fallback (${error.message || "unknown error"})` });
    }
    return this.planFromCheckboxFallback(input);
  }

  private static planFromCheckboxFallback(input: { ticker?: string; file?: File; options: string[] }): OrchestratorToolCall[] {
    const plan: OrchestratorToolCall[] = [];
    if (input.ticker) {
      plan.push({ name: "fetch_market_data", arguments: { ticker: input.ticker, options: input.options } });
    }
    if (input.file) {
      plan.push({ name: "analyze_document", arguments: { options: input.options } });
    }
    if (input.options.includes('competitors')) {
      plan.push({ name: "compare_peers", arguments: {} });
    }
    if (input.ticker && input.file) {
      plan.push({ name: "synthesize_verdict", arguments: {} });
    }
    return plan;
  }

  private static describeAgentReturn(payload: any): string {
    const keys = Object.keys(payload || {});
    if (Array.isArray(payload)) return `Returned ${payload.length} records`;
    if (payload?.summary) return `Returned ${keys.join(", ")}; summary: ${String(payload.summary).slice(0, 120)}`;
    return `Returned ${keys.join(", ") || "no structured fields"}`;
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
