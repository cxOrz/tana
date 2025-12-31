import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import type { AiConfig } from '../../../shared/configTypes';
import type { JournalDay, JournalSummary } from '../../../shared';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

interface StructuredSummary {
  title: string;
  description: string;
  markdown: string;
}

/**
 * 使用 AI 生成回顾，同时产出用于通知的标题与描述。
 */
export async function getAIJournalSummary(
  day: JournalDay,
  aiConfig?: AiConfig
): Promise<JournalSummary | null> {
  const apiKey = aiConfig?.apiKey?.trim();
  const model = aiConfig?.model?.trim();
  if (!apiKey || apiKey === 'YOUR_OPENROUTER_API_KEY' || !model) {
    return null;
  }
  if (!day.entries.length) return null;

  try {
    const provider = createProvider({ ...aiConfig, apiKey, model });
    const { text } = await generateText({
      model: provider(model),
      prompt: buildPrompt(day),
    });

    const data = parseSummary(text); // 解析响应内容

    return {
      title: data.title,
      description: data.description,
      entryTotal: day.entries.length,
      draft: data.markdown,
      model: model,
      generatedAt: Date.now(),
    };
  } catch (error) {
    console.warn('[journal] 生成回顾失败', error);
    return null;
  }
}

function createProvider(aiConfig: AiConfig) {
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
    '你是 Tana 的史莱姆小宠物，需要你用轻松、口语化的中文，写一段贴心、客观的总结，下方是用户今天的日志记录：',
    `日期: ${day.date}`,
    '记录列表：',
    entriesText,
    '',
    '要求：',
    '- 基于记录内容，不要编造细节或过度自夸。',
    '- 语气活泼一点，可以像朋友絮叨，但保持信息具体，可点缀一些 emoji。',
    '- 需要生成通知文案，用于推送系统通知，保持简洁易读，不要换行。',
    '- 请回复一段 JSON 对象字符串，不要有任何额外内容。JSON 对象仅包含 title（通知标题）、description（通知概要）、markdown（总结内容）。',
    '',
    'markdown 总结的内容参考：',
    '## 今天的小结',
    '一两句概括今天的主线/氛围，顺便点出重要节点（可提时间/标题/标签）。',
    '## 我看到的亮点和小坑',
    '混合写几句话，穿插具体事实：做成了什么、遇到的阻碍/风险、感受或吐槽。',
    '## 明天/接下来',
    '说想继续的动作或一句轻松的鼓励。如果没记录到就写「还没想好」。',
  ].join('\n');
}

function parseSummary(text: string): StructuredSummary {
  try {
    let cleaned = text.trim();
    // 尝试提取 markdown 代码块中的内容
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleaned = codeBlockMatch[1].trim();
    } else {
      // 如果没有代码块，尝试寻找第一个 { 和最后一个 }
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = text.substring(firstBrace, lastBrace + 1);
      }
    }

    const parsed = JSON.parse(cleaned) as StructuredSummary;
    const title = parsed.title?.trim();
    const description = parsed.description?.trim();
    const markdown = parsed.markdown?.trim();
    return { title, description, markdown };
  } catch (e) {
    console.error('[Journal] 解析失败', e);
    return {
      title: 'Yohoo~',
      description: '准备下班啦，快来回顾一下今天吧（模型响应解析有异常）~',
      markdown: text,
    };
  }
}
