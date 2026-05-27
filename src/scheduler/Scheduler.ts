export const REFRESH_SCHEDULE = {
  market_data: '每10分钟（交易时段内）',
  news: '每天整点',
  filings: '每天 06:00',
  hiring: '每周一 09:00',
  regulatory: '每周一 09:00',
  esg: '每季度首个工作日 09:00',
} as const

export type RefreshType = keyof typeof REFRESH_SCHEDULE

export class Scheduler {
  private watchlist: string[] = []

  addToWatchlist(ticker: string): void {
    if (!this.watchlist.includes(ticker)) {
      this.watchlist.push(ticker)
    }
  }

  removeFromWatchlist(ticker: string): void {
    this.watchlist = this.watchlist.filter(t => t !== ticker)
  }

  getWatchlist(): string[] {
    return [...this.watchlist]
  }

  getRefreshSchedule(type: RefreshType): string {
    return REFRESH_SCHEDULE[type]
  }

  // 预留接口，后续 Bright Data 接入后实现
  // async triggerRefresh(ticker: string, type: RefreshType): Promise<void>
  // async startMonitoring(): Promise<void>
  // async stopMonitoring(): Promise<void>
}
