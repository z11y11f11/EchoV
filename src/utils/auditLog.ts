interface AuditEntry {
  agent: string
  warnings: string[]
  timestamp: string
}

const auditLog: AuditEntry[] = []

export function logValidationWarning(agent: string, warnings: string[]): void {
  auditLog.push({
    agent,
    warnings,
    timestamp: new Date().toISOString()
  })
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog]
}

export function clearAuditLog(): void {
  auditLog.length = 0
}
