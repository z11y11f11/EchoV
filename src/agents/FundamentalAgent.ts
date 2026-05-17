import { Type } from "@google/genai";
import { runGenerativeAI } from "./LLMProvider";
import { AnalysisResult } from "../types";

export class FundamentalAgent {
  /**
   * Fully autonomous method that extracts text from a file and analyzes it.
   */
  static async runAutonomousAnalysis(file: File, options: string[], onProgress?: (msg: string) => void): Promise<Partial<AnalysisResult>> {
    onProgress?.("FundamentalAgent: Processing PDF document...");
    
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const formData = new FormData();
    formData.append('report', file);

    let text = "";
    try {
      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (extractRes.ok) {
        const contentType = extractRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const json = await extractRes.json();
          text = json.text || "";
        }
      }
    } catch (err) {
      console.warn("Backend extraction network error:", err);
    }
    
    if (!text && !fileBase64) {
      throw new Error("Unable to extract text from PDF.");
    }
    
    onProgress?.("FundamentalAgent: Extracting strategic risks and ESG factors...");
    return await this.processReport(text || "No text available, relying on PDF.", options, fileBase64);
  }

  /**
   * Processes a financial report PDF (either as text or base64 data) to extract fundamental details
   * like Highlights, Risks, and ESG summaries.
   */
  static async processReport(text: string, options: string[], fileBase64?: string): Promise<Partial<AnalysisResult>> {
    console.log("FundamentalAgent: Analyzing report (length: " + text.length + ")");
    let requestedSections = "Extract the company name, ticker, report period date (ISO YYYY-MM-DD), and a general summary.";
    
    const schemaProperties: any = {
      company: {
        type: Type.OBJECT,
        required: ["name", "ticker"],
        properties: { name: { type: Type.STRING }, ticker: { type: Type.STRING } }
      },
      reportDate: { type: Type.STRING },
      isHistorical: { type: Type.BOOLEAN, description: "Set true if older than 6 months" },
      summary: { type: Type.STRING },
      sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
      metrics: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          required: ["label", "value", "trend"],
          properties: {
            label: { type: Type.STRING },
            value: { type: Type.STRING },
            trend: { type: Type.STRING, enum: ["up", "down", "flat"] }
          }
        }
      }
    };
    
    const requiredFields = ["company", "summary", "sentiment", "metrics"];
  
    if (options.includes("highlights")) {
      requestedSections += " Include investment highlights.";
      schemaProperties.highlights = { type: Type.ARRAY, items: { type: Type.STRING } };
      requiredFields.push("highlights");
    }
    if (options.includes("risks")) {
      requestedSections += " Include strategic risks.";
      schemaProperties.risks = { type: Type.ARRAY, items: { type: Type.STRING } };
      requiredFields.push("risks");
    }
    if (options.includes("esg")) {
      requestedSections += " Include an ESG (Environmental, Social, Governance) summary.";
      schemaProperties.esgSummary = { type: Type.STRING };
      requiredFields.push("esgSummary");
    }
  
    const prompt = `
      You are an expert fundamental financial analyst. Analyze the provided financial report (which may be attached as a PDF or provided as text below) and provide a structured analysis.
      If a PDF is attached, prioritize extracting information from the PDF directly.
      ${requestedSections}
      
      Fallback Report Text:
      ${text.substring(0, 18000)}
    `;
  
    return await runGenerativeAI(prompt, schemaProperties, requiredFields, fileBase64);
  }
}
