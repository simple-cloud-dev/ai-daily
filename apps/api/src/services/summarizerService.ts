import type { SummaryDepth } from '@ai-daily/types';

import type { AppConfig } from '../config.js';

const depthInstruction: Record<SummaryDepth, string> = {
  HEADLINES: 'Return one concise headline sentence.',
  SHORT: 'Return 2-3 concise sentences.',
  DETAILED: 'Return one informative paragraph.',
};

export class SummarizerService {
  constructor(private readonly config: AppConfig) {}

  async summarize(args: {
    title: string;
    content: string;
    language: string;
    depth: SummaryDepth;
  }): Promise<string> {
    if (!this.config.OPENAI_API_KEY) {
      const trimmed = args.content.trim().replace(/\s+/g, ' ');
      return `${args.title}: ${trimmed.slice(0, 240)}${trimmed.length > 240 ? '...' : ''}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.config.OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You summarize AI news for daily digests. Language: ${args.language}. ${depthInstruction[args.depth]}`,
          },
          {
            role: 'user',
            content: `Title: ${args.title}\n\nContent:\n${args.content}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const fallback = args.content.trim().replace(/\s+/g, ' ');
      return fallback.slice(0, 240);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return payload.choices?.[0]?.message?.content?.trim() || args.content.slice(0, 240);
  }
}
