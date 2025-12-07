import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import type { AppConfig } from '../config';
import type { JournalAiConfig } from '../../shared/configTypes';
import type { JournalDay, JournalSummary } from '../../shared';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * 使用 AI 生成当日日志的摘要。
 * @param {JournalDay} day - 当日的日志数据。
 * @param {AppConfig} config - 应用配置。
 * @returns {Promise<JournalSummary | null>} 成功时返回摘要，失败或缺少配置时返回 null。
 */
export async function generateJournalSummary(
  day: JournalDay,
  config: AppConfig
): Promise<JournalSummary | null> {
  const aiConfig = config.journal?.ai;
  if (!aiConfig) {
    console.warn('[journal] 缺少 AI 配置，跳过摘要生成');
    return null;
  }

  const apiKey = aiConfig.apiKey?.trim();
  const model = aiConfig.model?.trim();
  const isPlaceholderKey = apiKey === 'YOUR_OPENROUTER_API_KEY';
  if (!apiKey || isPlaceholderKey || !model) {
    console.warn('[journal] 缺少 AI 配置，跳过摘要生成');
    return null;
  }
  if (!day.entries.length) return null;

  try {
    const provider = createProvider({ ...aiConfig, apiKey, model });
    const { text } = await generateText({
      model: provider(model),
      prompt: buildPrompt(day),
    });

    const draft = text?.trim();
    if (!draft) return null;

    return {
      draft,
      model: aiConfig.model,
      generatedAt: Date.now(),
    };
  } catch (error) {
    console.warn('[journal] 生成摘要失败', error);
    return null;
  }
}

function createProvider(aiConfig: JournalAiConfig) {
  return createOpenAICompatible({
    name: 'openrouter',
    apiKey: aiConfig.apiKey,
    baseURL: aiConfig.baseURL || DEFAULT_BASE_URL,
  });
}

function buildPrompt(day: JournalDay): string {
  const entriesText = day.entries
    .map((entry, index) => {
      const date = new Date(entry.ts);
      const hh = `${date.getHours()}`.padStart(2, '0');
      const mm = `${date.getMinutes()}`.padStart(2, '0');
      const timeLabel = `${hh}:${mm}`;
      const title = entry.title ? `【${entry.title}】` : '';
      const tags = entry.tags?.length ? ` 标签: ${entry.tags.join(', ')}` : '';
      return `[${index + 1}] ${timeLabel} ${title} ${entry.body}${tags}`;
    })
    .join('\n');

  return [
    '你是 Tana 的史莱姆小宠物，用轻松、口语化的中文帮我看完下方记录，写一段贴心但客观的总结：',
    `日期: ${day.date}`,
    '记录列表：',
    entriesText,
    '',
    '要求：',
    '- 只基于记录内容，不要编造细节或过度自夸。',
    '- 语气活泼一点，可以像朋友絮叨，但保持信息具体，可点缀一些 emoji。',
    '',
    '输出 Markdown，标题前只加一个 `## `，不要重复或嵌套标题。格式示例（直接输出正文，不要再写“示例”二字）：',
    '## 今天的小结',
    '一两句概括今天的主线/氛围，顺便点出重要节点（可提时间/标题/标签）。',
    '## 我看到的亮点和小坑',
    '混合写几句话，穿插具体事实：做成了什么、遇到的阻碍/风险、感受或吐槽。',
    '## 明天/接下来',
    '说想继续的动作或一句轻松的鼓励。如果没记录到就写「还没想好」。',
  ].join('\n');
}
