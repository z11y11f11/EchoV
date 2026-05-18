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

        case "synthesize_knowledge": {
          const topic = (toolCall.arguments.topic || "summary") as "esg" | "highlights" | "risks" | "summary";
          const companyName = toolCall.arguments.companyName || result.company?.name || input.ticker || "Unknown Company";
          const ticker = result.company?.ticker || input.ticker || "";
          const context = toolCall.arguments.context || result.summary || "";
          onEvent({ agent: "Orchestrator", status: `Calling synthesize_knowledge(${topic}) -> CIOAgent` });
          try {
            const synthesized = await CIOAgent.synthesizeFromKnowledge(companyName, ticker, topic, context);
            if (topic === "esg") result.esgSummary = synthesized;
            else if (topic === "highlights") result.highlights = synthesized.split('\n').filter(Boolean);
            else if (topic === "risks") result.risks = synthesized.split('\n').filter(Boolean);
            else if (topic === "summary") result.summary = (result.summary ? result.summary + "\n\n" : "") + synthesized;
            onEvent({ agent: "CIOAgent", status: `Knowledge synthesis complete for "${topic}"` });
          } catch (err: any) {
            onEvent({ agent: "CIOAgent", status: `Knowledge synthesis failed: ${err.message}` });
          }
          break;
        }
      }
    }

    // Reflection step: detect gaps between what was requested and what was returned,
    // then fill them using CIOAgent's LLM knowledge as a fallback.
    const gaps = this.detectGaps(input.options, input.userRequest || "", result);
    if (gaps.length > 0) {
      onEvent({ agent: "Orchestrator", status: `Reflection: gaps detected [${gaps.join(', ')}] — synthesizing from LLM knowledge...` });
      await this.fillGapsWithKnowledge(gaps, result, input, onEvent);
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

  /**
   * Compares what the user requested against what agents actually returned.
   * Returns topic names that are missing or clearly insufficient.
   */
  private static detectGaps(
    requestedOptions: string[],
    userRequest: string,
    result: Partial<AnalysisResult>
  ): Array<"esg" | "highlights" | "risks" | "summary"> {
    const gaps: Array<"esg" | "highlights" | "risks" | "summary"> = [];
    const lower = userRequest.toLowerCase();
    const isNotFound = (s: string) =>
      !s || s.length < 80 ||
      /not (found|available|covered|mentioned|included|present)/i.test(s) ||
      /no (esg|environmental|sustainability|specific|relevant)/i.test(s) ||
      /unable to (find|locate|identify|extract)/i.test(s) ||
      /insufficient|not provided|not disclosed/i.test(s);

    if (requestedOptions.includes("esg") || lower.includes("esg") || lower.includes("environment")) {
      if (isNotFound(result.esgSummary || "")) gaps.push("esg");
    }
    if (requestedOptions.includes("highlights") || lower.includes("highlight")) {
      if (!result.highlights || result.highlights.length === 0) gaps.push("highlights");
    }
    if (requestedOptions.includes("risks") || lower.includes("risk")) {
      if (!result.risks || result.risks.length === 0) gaps.push("risks");
    }
    return gaps;
  }

  /**
   * For each detected gap, calls CIOAgent.synthesizeFromKnowledge to fill it
   * using LLM training knowledge, with a clear AI-synthesis disclaimer.
   */
  private static async fillGapsWithKnowledge(
    gaps: Array<"esg" | "highlights" | "risks" | "summary">,
    result: Partial<AnalysisResult>,
    input: { ticker?: string; options: string[]; userRequest?: string },
    onEvent: (event: AgentEvent) => void
  ): Promise<void> {
    const companyName = result.company?.name || input.ticker || "Unknown Company";
    const ticker = result.company?.ticker || input.ticker || "";
    const knownContext = [result.summary, JSON.stringify(result.metrics || [])].filter(Boolean).join("\n").substring(0, 3000);

    for (const gap of gaps) {
      onEvent({ agent: "CIOAgent", status: `Synthesizing "${gap}" from LLM knowledge for ${companyName}...` });
      try {
        const synthesized = await CIOAgent.synthesizeFromKnowledge(companyName, ticker, gap, knownContext);
        if (gap === "esg") result.esgSummary = synthesized;
        else if (gap === "highlights") result.highlights = synthesized.split('\n').filter(l => l.trim().length > 0);
        else if (gap === "risks") result.risks = synthesized.split('\n').filter(l => l.trim().length > 0);
        else if (gap === "summary") result.summary = (result.summary ? result.summary + "\n\n" : "") + synthesized;
        onEvent({ agent: "CIOAgent", status: `"${gap}" synthesis complete` });
      } catch (err: any) {
        onEvent({ agent: "CIOAgent", status: `"${gap}" synthesis failed: ${err.message}` });
      }
    }
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
