// 日志/记忆功能的共享类型，主进程与渲染进程都会引用。
export interface JournalEntry {
  id: string; // 记录的唯一 ID。
  ts: number; // 记录创建时间的时间戳 (ms)。
  type: 'note' | string; // 记录类型，预留扩展。
  title?: string; // 记录的标题，可为空。
  body: string; // 记录正文，支持 Markdown。
  tags?: string[]; // 标签列表。
  source?: string; // 记录来源，例如 quick-input/clipboard 等。
  meta?: Record<string, unknown>; // 结构化元数据，便于后续扩展。
}

export interface AddJournalEntryInput {
  body: string; // 记录正文。
  title?: string; // 可选标题。
  tags?: string[]; // 可选标签列表。
  type?: string; // 可选自定义类型。
  source?: string; // 记录来源描述。
  ts?: number; // 自定义时间戳，默认使用当前时间。
  meta?: Record<string, unknown>; // 元数据。
}

export interface JournalSummary {
  draft: string; // 最近一次生成的 Markdown 摘要。
  model?: string; // 由模型生成的摘要，可区分人工/模型。
  generatedAt?: number; // 摘要生成时间戳 (ms)。
  entryTotal?: number; // 生成摘要时的记录条数，用于判断摘要是否需要更新。
}

export interface JournalDay {
  date: string; // 日期字符串，格式 YYYY-MM-DD。
  entries: JournalEntry[]; // 该日所有记录。
  summary?: JournalSummary; // 日报摘要。
}
