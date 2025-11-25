import { app } from 'electron';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { AddJournalEntryInput, JournalDay, JournalEntry, JournalSummary } from '../../shared';

const JOURNAL_DIR = 'journal';
const FILE_PREFIX = 'journal-';
const FILE_EXT = '.json';

/**
 * @file journalStore.ts
 * @description
 * 负责日志/记忆数据的持久化存储。以“按天一个 JSON 文件”的方式写入用户数据目录。
 */

/**
 * 解析日期戳的文件路径。
 * @param {string} dayStamp - 格式为 YYYY-MM-DD 的日期。
 * @returns {string} 文件绝对路径。
 */
export function resolveJournalPath(dayStamp: string): string {
  return join(app.getPath('userData'), JOURNAL_DIR, `${FILE_PREFIX}${dayStamp}${FILE_EXT}`);
}

/**
 * 确保日志目录存在。
 * @returns {Promise<string>} 目录路径。
 */
async function ensureJournalDir(): Promise<string> {
  const dir = join(app.getPath('userData'), JOURNAL_DIR);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * 加载某一天的日志文件，若不存在则返回空结构。
 * @param {string} dayStamp - 格式为 YYYY-MM-DD 的日期。
 * @returns {Promise<JournalDay>} 当日数据。
 */
export async function loadJournalDay(dayStamp: string): Promise<JournalDay> {
  await ensureJournalDir();
  const filePath = resolveJournalPath(dayStamp);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as JournalDay;
    return normalizeDay(parsed, dayStamp);
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
 * @param {AddJournalEntryInput} input - 记录内容。
 * @returns {Promise<JournalEntry>} 写入后的记录。
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
 * @param {string} dayStamp - 日期。
 * @param {JournalSummary} summary - 摘要内容。
 * @returns {Promise<JournalSummary>} 持久化后的摘要。
 */
export async function setJournalSummary(
  dayStamp: string,
  summary: JournalSummary
): Promise<JournalSummary> {
  const day = await loadJournalDay(dayStamp);
  day.summary = {
    ...summary,
    generatedAt: summary.generatedAt ?? Date.now(),
  };
  await persistDay(day);
  return day.summary;
}

/**
 * 列出已有的日期戳，按时间降序。
 * @param {number} [limit] - 限制返回的天数。
 * @returns {Promise<string[]>} 日期戳列表。
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
 * 持久化单日数据。
 * @param {JournalDay} day - 当日数据。
 * @returns {Promise<void>}
 */
async function persistDay(day: JournalDay): Promise<void> {
  await ensureJournalDir();
  const filePath = resolveJournalPath(day.date);
  const normalized = normalizeDay(day, day.date);
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
}

/**
 * 规范化单日数据，确保字段存在。
 * @param {Partial<JournalDay>} day - 原始数据。
 * @param {string} dayStamp - 日期。
 * @returns {JournalDay} 规范化后的数据。
 */
function normalizeDay(day: Partial<JournalDay>, dayStamp: string): JournalDay {
  return {
    date: dayStamp,
    entries: Array.isArray(day.entries) ? [...day.entries] : [],
    summary: day.summary
      ? { draft: day.summary.draft ?? '', model: day.summary.model, generatedAt: day.summary.generatedAt }
      : undefined,
  };
}

/**
 * 生成日期戳，格式 YYYY-MM-DD。
 * @param {Date} date - 目标日期。
 * @returns {string} 日期字符串。
 */
export function getDayStamp(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
