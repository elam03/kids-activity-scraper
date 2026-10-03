import test from 'node:test';
import assert from 'node:assert/strict';
import {
  heuristicTriageUrl,
  heuristicRouteScraper,
  heuristicFilterContentHasEvents,
  heuristicTriageExtractedEvent,
  JevClient,
} from './jev';
import type { ExtractedEvent } from './llm-extractor';

test('Gate 1: heuristicTriageUrl rejects invalid URLs and spam', () => {
  // Invalid protocol
  const ftp = heuristicTriageUrl('ftp://example.com/event');
  assert.equal(ftp.isRelevant, false);

  // Obvious non-web or dangerous payload
  const js = heuristicTriageUrl('javascript:alert(1)');
  assert.equal(js.isRelevant, false);

  // Obvious spam / executable download
  const exe = heuristicTriageUrl('https://suspicious-site.com/installer.exe');
  assert.equal(exe.isRelevant, false);

  // Legitimate community and event urls
  const eventbrite = heuristicTriageUrl('https://www.eventbrite.com/e/kids-maker-workshop-tickets-12345');
  assert.equal(eventbrite.isRelevant, true);

  const library = heuristicTriageUrl('https://library.cityofpaloalto.org/events/toddler-storytime');
  assert.equal(library.isRelevant, true);
});

test('Gate 2: heuristicRouteScraper routes URLs to correct extractor', () => {
  // Instagram post or reel
  assert.equal(
    heuristicRouteScraper('https://www.instagram.com/p/DBcd12345/').route,
    'instagram'
  );
  assert.equal(
    heuristicRouteScraper('https://instagram.com/reel/DBcd12345/?utm_source=ig_web').route,
    'instagram'
  );

  // Direct image flyer
  assert.equal(
    heuristicRouteScraper('https://community-center.org/flyers/summer-camp-2026.png').route,
    'image'
  );
  assert.equal(
    heuristicRouteScraper('https://example.com/poster.jpg?v=2').route,
    'image'
  );

  // General web page -> direct HTTP fetch
  assert.equal(
    heuristicRouteScraper('https://www.eventbrite.com/e/puppet-show-123').route,
    'direct'
  );
  assert.equal(
    heuristicRouteScraper('https://cityofberkeley.info/parks/harvest-festival').route,
    'direct'
  );
});

test('Gate 3: heuristicFilterContentHasEvents detects events vs general prose', () => {
  // Clear event content
  const eventContent = {
    title: 'Spring Storytime & Puppet Show at Main Library',
    text: 'Join us Saturday, October 10 at 10:30 AM for a fun puppet show! Free admission for toddlers and kids.',
  };
  const eventFilter = heuristicFilterContentHasEvents(eventContent);
  assert.equal(eventFilter.hasEvents, true);
  assert.ok(eventFilter.confidence >= 0.7);

  // General article / recipe without event signals
  const nonEventContent = {
    title: '10 Best Gluten-Free Lunchbox Ideas for School',
    text: 'Packing lunch every morning can be stressful. Here are our favorite recipes featuring quinoa and fresh fruits.',
  };
  const nonEventFilter = heuristicFilterContentHasEvents(nonEventContent);
  assert.equal(nonEventFilter.hasEvents, false);
});

test('Gate 4: heuristicTriageExtractedEvent assigns approved or pending', () => {
  // High confidence event with specific location and valid date
  const solidEvent: ExtractedEvent = {
    title: 'Toddler Art Studio',
    startDate: '2026-10-15',
    startTime: '10:00',
    endTime: '11:30',
    location: 'Children’s Discovery Museum, San Jose',
    ageRange: '2-5 years',
    ageGroup: 'toddlers',
    category: 'arts',
    cost: 'Free with admission',
    isFree: false,
    registrationUrl: 'https://cdm.org/register',
    description: 'Hands-on finger painting and clay sculpting.',
  };
  const solidTriage = heuristicTriageExtractedEvent(solidEvent);
  assert.equal(solidTriage.status, 'approved');
  assert.ok(solidTriage.confidence >= 0.8);

  // Ambiguous event missing location
  const vagueEvent: ExtractedEvent = {
    title: 'Online Storytime',
    startDate: '2026-10-16',
    location: null,
    ageGroup: 'kids',
    category: 'education',
    isFree: true,
    description: 'Live read aloud.',
  };
  const vagueTriage = heuristicTriageExtractedEvent(vagueEvent);
  assert.equal(vagueTriage.status, 'pending');
});

test('JevClient falls back to heuristics when OPENROUTER_API_KEY is unset', async () => {
  const client = new JevClient({ apiKey: '' });

  const triage = await client.triageUrl('https://sfkids.org/events/pumpkin-patch');
  assert.equal(triage.isRelevant, true);

  const route = await client.routeScraper('https://www.instagram.com/p/12345');
  assert.equal(route.route, 'instagram');

  const filter = await client.filterContentHasEvents({
    title: 'Halloween Carnival 2026',
    text: 'Carnival games, costumes, and treats this Sunday at 2pm.',
  });
  assert.equal(filter.hasEvents, true);

  const eventTriage = await client.triageExtractedEvent({
    title: 'Free Zoo Day',
    startDate: '2026-10-20',
    location: 'Oakland Zoo',
    ageGroup: 'all',
    category: 'festival',
    isFree: true,
    description: 'Complimentary admission for local families.',
  });
  assert.equal(eventTriage.status, 'approved');
});

test('JevClient calls OpenRouter API when key is configured', async () => {
  let calledUrl = '';
  let calledBody: any = null;

  const mockFetch = (async (url: string, init?: RequestInit) => {
    calledUrl = url;
    calledBody = JSON.parse(init?.body as string);
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isRelevant: true,
                reason: 'Family activity website in Bay Area',
              }),
            },
          },
        ],
      }),
    } as any;
  }) as typeof fetch;

  const client = new JevClient({
    apiKey: 'test-openrouter-key',
    fetcher: mockFetch,
  });

  const res = await client.triageUrl('https://example.com/family-fun');
  assert.equal(calledUrl, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calledBody.model, 'typesafe/jev-1.13');
  assert.equal(res.isRelevant, true);
  assert.equal(res.reason, 'Family activity website in Bay Area');
});
