import { logValidationWarning } from './auditLog'

export interface BaseAgentOutput {
  as_of: string
  data_source: string
  confidence: 'high' | 'medium' | 'low'
  refresh_interval: string
}

export function validateAgentOutput(agentName: string, output: unknown): boolean {
  const obj = output as Record<string, unknown>
  const warnings: string[] = []

  if (!obj.as_of) warnings.push('缺少 as_of 字段')
  if (!obj.data_source) warnings.push('缺少 data_source 字段')
  if (!obj.confidence) warnings.push('缺少 confidence 字段')
  if (!obj.refresh_interval) warnings.push('缺少 refresh_interval 字段')

  if (obj.as_of && typeof obj.as_of === 'string') {
    if (isNaN(Date.parse(obj.as_of))) {
      warnings.push(`as_of 格式不正确: ${obj.as_of}，应为 ISO 8601`)
    }
  }

  if (obj.confidence && !['high', 'medium', 'low'].includes(obj.confidence as string)) {
    warnings.push(`confidence 值不合法: ${obj.confidence}`)
  }

  if (warnings.length > 0) {
    console.warn(`[${agentName}] validateAgentOutput 警告:`, warnings)
    logValidationWarning(agentName, warnings)
    return false
  }
  return true
}
