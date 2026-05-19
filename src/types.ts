/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Metric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
  /** Which agent produced this metric — used for grouping in the dashboard */
  source?: 'fundamental' | 'market';
}

export interface AnalysisResult {
  company: {
    name: string;
    ticker: string;
  };
  reportDate?: string;
  isHistorical?: boolean;
  metrics: Metric[];
  risks?: string[];
  highlights?: string[];
  esgSummary?: string;
  competitors?: {
    name: string;
    ticker: string;
    rationale: string;
  }[];
  crossAnalysis?: CrossAnalysisResult;
  summary: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

export interface CrossAnalysisResult {
  alignmentScore?: number;
  financialsAlignWithStockPerformance: boolean;
  alignmentSummary: string;
  divergenceSignals: string[];
  investmentVerdict: string;
}

export interface ValuationVerdictResult {
  overallVerdict: 'Undervalued' | 'Fair Value' | 'Overvalued';
  confidenceLevel: 'High' | 'Medium' | 'Low';
  keyReason: string;
}

export interface StockData {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  longName?: string;
}

export interface HistoricalBar {
  date: string;
  close: number;
  adjClose?: number;
  ma20?: number;
  ma50?: number;
  ma200?: number;
}

export interface ValuationSummary {
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  pegRatio?: number;
  dividendYield?: number;
  payoutRatio?: number;
  ebitdaMargins?: number;
  enterpriseToEbitda?: number;
  returnOnEquity?: number;
  revenueGrowth?: number;
  recommendationKey?: string;
  targetMeanPrice?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
  numberOfAnalystOpinions?: number;
  recommendationTrend?: any[];
}
