import { app } from 'electron';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import type {
  AddJournalEntryInput,
  JournalDay,
  JournalEntry,
  JournalSummary,
} from '../../../shared';

// =============================================================================
// Constants
// =============================================================================

const JOURNAL_DIR = 'journal';
const FILE_PREFIX = 'journal-';
const FILE_EXT = '.json';

// =============================================================================
// Public API
// =============================================================================

/**
 * 加载某一天的日志文件，若不存在则返回空结构。
 */
export async function loadJournalDay(dayStamp: string): Promise<JournalDay> {
  await ensureJournalDir();
  const filePath = resolveJournalPath(dayStamp);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as JournalDay;
    return parsed;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return { date: dayStamp, entries: [] };
    }
    console.warn('[journal] 读取失败', err);
    return { date: dayStamp, entries: [] };
  }
}

/**
 * 向当日追加一条日志记录。
 */
export async function appendJournalEntry(input: AddJournalEntryInput): Promise<JournalEntry> {
  const ts = Number.isFinite(input.ts) ? Number(input.ts) : Date.now();
  const dayStamp = getDayStamp(new Date(ts));
  const day = await loadJournalDay(dayStamp);
  const entry: JournalEntry = {
    id: randomUUID(),
    ts,
    type: input.type ?? 'note',
    title: input.title,
    body: input.body,
    tags: input.tags,
    source: input.source ?? 'quick-input',
    meta: input.meta,
  };
  day.entries.push(entry);
  await persistDay(day);
  return entry;
}

/**
 * 写入或更新日报摘要。
 */
export async function setJournalSummary(
  dayStamp: string,
  summary: JournalSummary
): Promise<JournalSummary> {
  const day = await loadJournalDay(dayStamp);
  day.summary = { ...summary };
  await persistDay(day);
  return day.summary;
}

/**
 * 列出已有的日期戳，按时间降序。
 */
export async function listJournalDays(limit?: number): Promise<string[]> {
  const dir = await ensureJournalDir();
  const files = await fs.readdir(dir).catch(() => []);
  const days = files
    .filter((name) => name.startsWith(FILE_PREFIX) && name.endsWith(FILE_EXT))
    .map((name) => name.slice(FILE_PREFIX.length, -FILE_EXT.length))
    .filter(Boolean)
    .sort((a, b) => (a > b ? -1 : 1));
  return typeof limit === 'number' ? days.slice(0, Math.max(limit, 0)) : days;
}

/**
 * 生成日期戳，格式 YYYY-MM-DD。
 */
export function getDayStamp(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * 解析日期戳的文件路径。
 */
export function resolveJournalPath(dayStamp: string): string {
  return join(app.getPath('userData'), JOURNAL_DIR, `${FILE_PREFIX}${dayStamp}${FILE_EXT}`);
}

// =============================================================================
// Helpers (Private)
// =============================================================================

/**
 * 确保日志目录存在。
 */
async function ensureJournalDir(): Promise<string> {
  const dir = join(app.getPath('userData'), JOURNAL_DIR);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * 写入日志数据。
 */
async function persistDay(day: JournalDay): Promise<void> {
  await ensureJournalDir();
  const filePath = resolveJournalPath(day.date);
  await fs.writeFile(filePath, JSON.stringify(day, null, 2), 'utf-8');
}
