/**
 * @file journalTypes.d.ts
 * @description
 * 定义日志/记忆功能的共享类型，便于主进程与渲染进程复用。
 */

/**
 * 单条日志记录。
 */
export interface JournalEntry {
  /**
   * 记录的唯一 ID。
   */
  id: string;
  /**
   * 记录创建时间的时间戳 (ms)。
   */
  ts: number;
  /**
   * 记录类型，预留扩展。
   */
  type: 'note' | string;
  /**
   * 记录的标题，可为空。
   */
  title?: string;
  /**
   * 记录正文，支持 Markdown。
   */
  body: string;
  /**
   * 标签列表。
   */
  tags?: string[];
  /**
   * 记录来源，例如 quick-input/clipboard 等。
   */
  source?: string;
  /**
 * 结构化元数据，便于后续扩展。
 */
  meta?: Record<string, unknown>;
}

/**
 * 新增日志记录时的输入载荷。
 */
export interface AddJournalEntryInput {
  /**
   * 记录正文。
   */
  body: string;
  /**
   * 可选标题。
   */
  title?: string;
  /**
   * 可选标签列表。
   */
  tags?: string[];
  /**
   * 可选自定义类型。
   */
  type?: string;
  /**
   * 记录来源描述。
   */
  source?: string;
  /**
   * 自定义时间戳，默认使用当前时间。
   */
  ts?: number;
  /**
   * 元数据。
   */
  meta?: Record<string, unknown>;
}

/**
 * 当日摘要信息，供 AI 或人工生成日报使用。
 */
export interface JournalSummary {
  /**
   * 最近一次生成的 Markdown 摘要。
   */
  draft: string;
  /**
   * 由模型生成的摘要，可区分人工/模型。
   */
  model?: string;
  /**
   * 摘要生成时间戳 (ms)。
   */
  generatedAt?: number;
}

/**
 * 某一天的日志集合。
 */
export interface JournalDay {
  /**
   * 日期字符串，格式 YYYY-MM-DD。
   */
  date: string;
  /**
   * 该日所有记录。
   */
  entries: JournalEntry[];
  /**
   * 日报摘要。
   */
  summary?: JournalSummary;
}
