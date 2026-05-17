export function normalizeYahooTicker(rawTicker: string): string {
  let ticker = rawTicker.trim();
  // HK tickers
  if (/^\d{4}$/.test(ticker)) {
    return `${ticker}.HK`;
  }
  if (ticker.startsWith('HKEX:')) {
    const num = ticker.split(':')[1].trim();
    if (/^\d+$/.test(num)) {
      if (num.length === 5 && num.startsWith('8')) {
        // RMB counter, but Yahoo usually just uses standard
        return `${num.substring(1)}.HK`;
      }
      return `${num.padStart(4, '0')}.HK`;
    }
  }
  return ticker;
}

export function isLikelyResolvedYahooTicker(ticker: string): boolean {
  // Simple check for standard US tickers or ones with suffixes (.HK, .L, etc)
  return /^[A-Z0-9\-\^]+(\.[A-Z]+)?$/.test(ticker);
}
