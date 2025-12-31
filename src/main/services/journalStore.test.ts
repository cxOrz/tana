import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadJournalDay, appendJournalEntry, listJournalDays, getDayStamp } from './journalStore';
import { promises as fs } from 'fs';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock-user-data'),
  },
}));

// Mock fs.promises
vi.mock('fs', async () => {
  // 这里的 import 是必须的，因为我们要保留 path 等模块的真实行为（如果它们在原模块里被导出了），
  // 虽然这里我们主要 mock promises
  return {
    promises: {
      mkdir: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn(),
    },
  };
});

describe('journalStore', () => {
  const mockDate = new Date(2025, 0, 1); // 2025-01-01 (Month is 0-indexed)
  const dayStamp = '2025-1-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDayStamp', () => {
    it('should format date correctly', () => {
      // Month is 0-indexed in JS Date: 0 = January
      expect(getDayStamp(mockDate)).toBe('2025-1-1');
    });
  });

  describe('loadJournalDay', () => {
    it('should return empty journal day if file not found', async () => {
      // Mock readFile to throw ENOENT
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });

      const result = await loadJournalDay(dayStamp);

      expect(result).toEqual({ date: dayStamp, entries: [] });
      expect(fs.mkdir).toHaveBeenCalled(); // 确保目录被创建
    });

    it('should return parsed content if file exists', async () => {
      const mockData = { date: dayStamp, entries: [{ id: '1', body: 'test' }] };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));

      const result = await loadJournalDay(dayStamp);

      expect(result).toEqual(mockData);
    });

    it('should return empty entries on JSON parse error (simulated)', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');

      // JSON.parse throws, catch block returns default
      // 我们的 loadJournalDay 实现里捕获了所有错误并 warn
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await loadJournalDay(dayStamp);

      expect(result.entries).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('appendJournalEntry', () => {
    it('should add new entry to existing day', async () => {
      // Setup existing data
      const existingData = { date: dayStamp, entries: [] };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData));

      const input = { body: 'New Entry', ts: mockDate.getTime() };
      const entry = await appendJournalEntry(input);

      expect(entry.body).toBe('New Entry');
      expect(entry.id).toBeDefined();

      // Verify writeFile was called with updated data
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.entries).toHaveLength(1);
      expect(writtenContent.entries[0].body).toBe('New Entry');
    });
  });

  describe('listJournalDays', () => {
    it('should list files matching the pattern', async () => {
      const mockFiles = [
        'journal-2025-1-1.json',
        'journal-2025-1-2.json',
        'other.txt',
        '.DS_Store',
      ];
      vi.mocked(fs.readdir).mockResolvedValue(
        mockFiles as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );

      const days = await listJournalDays();

      // Should sort desc (newest first)
      expect(days).toEqual(['2025-1-2', '2025-1-1']);
    });
  });
});
