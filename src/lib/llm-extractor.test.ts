import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExtractionPrompt,
  parseLLMResponse,
  OpenAILLMExtractor,
  type LLMExtractorInput,
  type ExtractionResult,
} from './llm-extractor';

test('buildExtractionPrompt includes reference date and schema requirements', () => {
  const prompt = buildExtractionPrompt('2026-09-12');
  assert.ok(prompt.includes('2026-09-12'), 'Prompt should include current date');
  assert.ok(prompt.includes('isEvent'), 'Prompt should include schema field isEvent');
  assert.ok(prompt.includes('confidence'), 'Prompt should include schema field confidence');
  assert.ok(prompt.includes('events'), 'Prompt should include schema field events');
});

test('parseLLMResponse successfully parses valid JSON extraction response', () => {
  const jsonResponse = JSON.stringify({
    isEvent: true,
    confidence: 0.95,
    events: [
      {
        title: 'Storytime in the Park',
        startDate: '2026-09-20',
        endDate: null,
        startTime: '10:00',
        endTime: '11:00',
        location: 'San Jose Public Library',
        ageRange: '0-5 years',
        ageGroup: 'toddlers',
        category: 'education',
        cost: 'Free',
        isFree: true,
        registrationUrl: null,
        description: 'Fun storytime for little ones.',
      },
    ],
  });

  const parsed = parseLLMResponse(jsonResponse);
  assert.equal(parsed.isEvent, true);
  assert.equal(parsed.confidence, 0.95);
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.events[0].title, 'Storytime in the Park');
  assert.equal(parsed.events[0].category, 'education');
  assert.equal(parsed.events[0].isFree, true);
});

test('parseLLMResponse handles non-event responses gracefully', () => {
  const jsonResponse = JSON.stringify({
    isEvent: false,
    confidence: 1.0,
    events: [],
  });

  const parsed = parseLLMResponse(jsonResponse);
  assert.equal(parsed.isEvent, false);
  assert.equal(parsed.events.length, 0);
});

test('parseLLMResponse falls back safely if JSON is missing expected array or fields', () => {
  const parsedEmpty = parseLLMResponse('{}');
  assert.equal(parsedEmpty.isEvent, false);
  assert.deepEqual(parsedEmpty.events, []);

  assert.throws(() => parseLLMResponse('invalid-json'), /Failed to parse LLM extraction response/);
});

test('OpenAILLMExtractor constructs expected messages for text-only input', async () => {
  let capturedBody: any = null;

  const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedBody = JSON.parse(init?.body as string);
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isEvent: true,
                confidence: 0.9,
                events: [{ title: 'Soccer Camp', startDate: '2026-10-01', category: 'sports', isFree: false, description: 'Soccer camp' }],
              }),
            },
          },
        ],
      }),
    } as Response;
  }) as unknown as typeof fetch;

  const extractor = new OpenAILLMExtractor({
    apiKey: 'test-key',
    fetchFn: mockFetch,
  });

  const result = await extractor.extractEvents({
    text: 'Join our fall soccer camp!',
    currentDate: '2026-09-12',
  });

  assert.equal(result.isEvent, true);
  assert.equal(result.events[0].title, 'Soccer Camp');
  assert.ok(capturedBody);
  assert.equal(capturedBody.model, 'gpt-4o-mini');
  assert.equal(capturedBody.messages[0].role, 'user');
  assert.ok(typeof capturedBody.messages[0].content === 'string');
  assert.ok(capturedBody.messages[0].content.includes('Join our fall soccer camp!'));
});

test('OpenAILLMExtractor constructs multimodal image messages when images provided', async () => {
  let capturedBody: any = null;

  const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedBody = JSON.parse(init?.body as string);
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isEvent: true,
                confidence: 0.85,
                events: [{ title: 'Art Workshop', startDate: '2026-10-05', category: 'arts', isFree: true, description: 'Kids art' }],
              }),
            },
          },
        ],
      }),
    } as Response;
  }) as unknown as typeof fetch;

  const extractor = new OpenAILLMExtractor({
    apiKey: 'test-key',
    fetchFn: mockFetch,
  });

  const result = await extractor.extractEvents({
    text: 'Flyer details',
    images: ['data:image/webp;base64,ABC1234'],
    currentDate: '2026-09-12',
  });

  assert.equal(result.isEvent, true);
  assert.equal(result.events[0].title, 'Art Workshop');
  assert.ok(capturedBody);
  assert.ok(Array.isArray(capturedBody.messages[0].content));
  const imageItem = capturedBody.messages[0].content.find((item: any) => item.type === 'image_url');
  assert.ok(imageItem);
  assert.equal(imageItem.image_url.url, 'data:image/webp;base64,ABC1234');
});
