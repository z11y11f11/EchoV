import { Type } from "@google/genai";
import { runGenerativeAI } from "./LLMProvider";

export interface Competitor {
  name: string;
  ticker: string;
  rationale: string;
}

export class PeerAgent {
  /**
   * Identifies direct publicly traded competitors for a given company.
   */
  static async identifyPeers(contextPayload: string): Promise<Competitor[]> {
    console.log("PeerAgent: Identifying peers");
    
    const schemaProperties = {
      competitors: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          required: ["name", "ticker", "rationale"],
          properties: {
            name: { type: Type.STRING },
            ticker: { type: Type.STRING, description: "Ticker symbol compatible with Yahoo Finance" },
            rationale: { type: Type.STRING, description: "Why they are a competitor" }
          }
        }
      }
    };
    
    const prompt = `
      You are an industry analysis expert. Based on the following company context, identify 3-5 direct publicly traded competitors. 
      Provide Yahoo Finance-compatible ticker symbols (do not leave empty for public companies).
      
      Company Context:
      ${contextPayload.substring(0, 10000)}
    `;
    
    const result = await runGenerativeAI(prompt, schemaProperties, ["competitors"]);
    return result.competitors || [];
  }

  /**
   * AI utility to resolve an arbitrary company name to a standard Yahoo Finance ticker.
   */
  static async resolveTickerForPeer(query: string): Promise<string> {
    const schemaProperties = {
      ticker: { type: Type.STRING, description: "Yahoo Finance compatible ticker symbol" }
    };
    const prompt = `Resolve this company name or query into its most likely primary Yahoo Finance ticker symbol. Return ONLY the JSON object. Query: "${query}"`;
    
    const result = await runGenerativeAI(prompt, schemaProperties, ["ticker"]);
    return result.ticker;
  }
}
