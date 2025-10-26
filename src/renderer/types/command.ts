export type CommandStatus = 'idle' | 'running' | 'success' | 'error'

export interface CommandHistoryEntry {
  id: string
  command: string
  note: string
  timestamp: Date
  status: CommandStatus
}

export interface CommandPreset {
  label: string
  command: string
  description?: string
}
