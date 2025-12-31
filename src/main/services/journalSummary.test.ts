import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAIJournalSummary } from './journalSummary';
import { generateText } from 'ai';
import type { JournalDay } from '../../shared';

// Mock 'ai' library
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock 'openai-compatible' provider
vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: vi.fn(() => () => ({})), // returns a provider function
}));

describe('journalSummary', () => {
  const mockDay: JournalDay = {
    date: '2025-01-01',
    entries: [{ id: '1', ts: Date.now(), body: 'Played games', type: 'note' }],
  };

  const mockConfig = {
    apiKey: 'sk-test-key',
    model: 'gpt-4o',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAIJournalSummary', () => {
    it('should return null if apiKey is missing or invalid', async () => {
      const result1 = await getAIJournalSummary(mockDay, { ...mockConfig, apiKey: '' });
      const result2 = await getAIJournalSummary(mockDay, {
        ...mockConfig,
        apiKey: 'YOUR_OPENROUTER_API_KEY',
      });

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(generateText).not.toHaveBeenCalled();
    });

    it('should return null if there are no entries', async () => {
      const emptyDay = { ...mockDay, entries: [] };
      const result = await getAIJournalSummary(emptyDay, mockConfig);

      expect(result).toBeNull();
      expect(generateText).not.toHaveBeenCalled();
    });

    it('should parse valid JSON response correctly', async () => {
      const mockResponse = {
        title: 'Happy Day',
        description: 'You played games.',
        markdown: '# Summary\nPlayed games all day.',
      };

      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify(mockResponse),
      } as Awaited<ReturnType<typeof generateText>>);

      const result = await getAIJournalSummary(mockDay, mockConfig);

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Happy Day');
      expect(result?.description).toBe('You played games.');
      expect(result?.draft).toBe('# Summary\nPlayed games all day.');
      expect(result?.model).toBe('gpt-4o');
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const jsonContent = JSON.stringify({
        title: 'Wrapped',
        description: 'Inside code block',
        markdown: 'Hidden content',
      });
      // Use concatenation to avoid template string confusion with backticks
      const wrappedText = 'Here is the JSON:\n```json\n' + jsonContent + '\n```';

      vi.mocked(generateText).mockResolvedValue({
        text: wrappedText,
      } as Awaited<ReturnType<typeof generateText>>);

      const result = await getAIJournalSummary(mockDay, mockConfig);

      expect(result?.title).toBe('Wrapped');
      expect(result?.description).toBe('Inside code block');
    });

    it('should return fallback content when parsing fails', async () => {
      const garbageText = 'I am sorry I cannot generate JSON for you.';

      vi.mocked(generateText).mockResolvedValue({
        text: garbageText,
      } as Awaited<ReturnType<typeof generateText>>);

      // Spy on console.error to suppress the expected error log
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await getAIJournalSummary(mockDay, mockConfig);

      expect(result?.title).toBe('Yohoo~');
      expect(result?.description).toContain('准备下班啦');
      // Even if parsing fails, we preserve the original text as markdown so nothing is lost
      expect(result?.draft).toBe(garbageText);

      consoleSpy.mockRestore();
    });

    it('should return null if generateText throws an error (e.g. network error)', async () => {
      vi.mocked(generateText).mockRejectedValue(new Error('Network Error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getAIJournalSummary(mockDay, mockConfig);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
