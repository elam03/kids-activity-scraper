export interface ExtractedEvent {
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  startTime?: string | null; // HH:MM (24-hour format)
  endTime?: string | null; // HH:MM (24-hour format)
  location?: string | null;
  ageRange?: string | null;
  ageGroup?: 'infants' | 'toddlers' | 'preschoolers' | 'kids' | 'teens' | 'all';
  category: 'sports' | 'arts' | 'nature' | 'music' | 'education' | 'festival' | 'other';
  cost?: string | null;
  isFree: boolean;
  registrationUrl?: string | null;
  description: string;
}

export interface ExtractionResult {
  isEvent: boolean;
  confidence: number; // 0.0 - 1.0
  events: ExtractedEvent[];
}

export interface LLMExtractorInput {
  text?: string | null;
  images?: string[]; // array of base64 data URLs or image URLs
  currentDate?: string;
}

export interface LLMExtractor {
  extractEvents(input: LLMExtractorInput): Promise<ExtractionResult>;
}

export function buildExtractionPrompt(currentDate: string): string {
  const currentYear = currentDate.split('-')[0] || '2026';
  return `You are an expert at identifying kids' events from social media posts.
Analyze the provided information and extract any events.
Assume the current date is ${currentDate} (use the current year ${currentYear} unless the text specifies a different year).
Return a JSON object strictly matching this schema:
{
  "isEvent": boolean,
  "confidence": number, // float between 0.0 and 1.0 indicating extraction quality
  "events": [
    {
      "title": string,
      "startDate": string, // YYYY-MM-DD
      "endDate": string or null, // YYYY-MM-DD
      "startTime": string or null, // HH:MM (24-hour format)
      "endTime": string or null, // HH:MM (24-hour format)
      "location": string or null, // City/venue name
      "ageRange": string or null, // e.g. "0-4 years"
      "ageGroup": "infants" | "toddlers" | "preschoolers" | "kids" | "teens" | "all", // Classify based on ageRange details
      "category": "sports" | "arts" | "nature" | "music" | "education" | "festival" | "other",
      "cost": string or null, // e.g. "Free" or price details
      "isFree": boolean, // true if free event, false otherwise
      "registrationUrl": string or null,
      "description": string
    }
  ]
}
If no events are present in the post, return { "isEvent": false, "confidence": 1.0, "events": [] }.`;
}

export function parseLLMResponse(rawJson: string): ExtractionResult {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    throw new Error(`Failed to parse LLM extraction response as JSON: ${(err as Error).message}`);
  }

  const isEvent = Boolean(parsed?.isEvent);
  const confidence = typeof parsed?.confidence === 'number' ? parsed.confidence : 0;
  const rawEvents = Array.isArray(parsed?.events) ? parsed.events : [];

  const validCategories = new Set([
    'sports',
    'arts',
    'nature',
    'music',
    'education',
    'festival',
    'other',
  ]);

  const events: ExtractedEvent[] = rawEvents.map((e: any) => ({
    title: typeof e.title === 'string' ? e.title : 'Untitled Event',
    startDate: typeof e.startDate === 'string' ? e.startDate : '',
    endDate: typeof e.endDate === 'string' ? e.endDate : null,
    startTime: typeof e.startTime === 'string' ? e.startTime : null,
    endTime: typeof e.endTime === 'string' ? e.endTime : null,
    location: typeof e.location === 'string' ? e.location : null,
    ageRange: typeof e.ageRange === 'string' ? e.ageRange : null,
    ageGroup: e.ageGroup || 'all',
    category: validCategories.has(e.category) ? e.category : 'other',
    cost: typeof e.cost === 'string' ? e.cost : null,
    isFree: typeof e.isFree === 'boolean' ? e.isFree : false,
    registrationUrl: typeof e.registrationUrl === 'string' ? e.registrationUrl : null,
    description: typeof e.description === 'string' ? e.description : '',
  }));

  return {
    isEvent,
    confidence,
    events,
  };
}

export interface OpenAILLMExtractorOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

export class OpenAILLMExtractor implements LLMExtractor {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: OpenAILLMExtractorOptions = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.model = options.model || 'gpt-4o-mini';
    this.fetchFn = options.fetchFn || fetch;
  }

  async extractEvents(input: LLMExtractorInput): Promise<ExtractionResult> {
    if (!this.apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    const currentDate = input.currentDate || new Date().toISOString().split('T')[0];
    const promptText = buildExtractionPrompt(currentDate);

    let messages: any[] = [];

    const hasImages = Array.isArray(input.images) && input.images.length > 0;

    if (hasImages) {
      const contentPayload: any[] = [{ type: 'text', text: promptText }];
      if (input.text) {
        contentPayload.push({ type: 'text', text: `Post Caption/Details:\n${input.text}` });
      }

      for (const img of input.images!) {
        contentPayload.push({
          type: 'image_url',
          image_url: { url: img },
        });
      }

      messages.push({ role: 'user', content: contentPayload });
    } else {
      messages.push({
        role: 'user',
        content: `${promptText}\n\nPost Content:\n${input.text || ''}`,
      });
    }

    const response = await this.fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API failed: ${response.status} ${response.statusText} - ${errText}`);
    }

    const resultData = await response.json();
    const rawContent = resultData?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenAI API returned empty response');
    }

    return parseLLMResponse(rawContent);
  }
}
