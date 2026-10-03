import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateWebUrl,
  extractJsonLdEvents,
  extractReadableText,
  scrapeWebPage,
} from './web-scraper';

test('validateWebUrl rejects SSRF risks and invalid protocols', () => {
  // Reject non-http protocols
  assert.equal(validateWebUrl('file:///etc/passwd').valid, false);
  assert.equal(validateWebUrl('ftp://server/file').valid, false);
  assert.equal(validateWebUrl('javascript:alert(1)').valid, false);

  // Reject localhost and loopback
  assert.equal(validateWebUrl('http://localhost:3000/api').valid, false);
  assert.equal(validateWebUrl('http://127.0.0.1:8080').valid, false);
  assert.equal(validateWebUrl('http://0.0.0.0/').valid, false);

  // Reject AWS/Railway metadata IP
  assert.equal(validateWebUrl('http://169.254.169.254/latest/meta-data').valid, false);

  // Reject private network subnets
  assert.equal(validateWebUrl('http://192.168.1.1/admin').valid, false);
  assert.equal(validateWebUrl('http://10.0.0.15/internal').valid, false);
  assert.equal(validateWebUrl('http://172.20.0.5/events').valid, false);

  // Valid public web URLs
  assert.equal(validateWebUrl('https://cityofpaloalto.org/events').valid, true);
  assert.equal(validateWebUrl('http://www.eventbrite.com/e/12345').valid, true);
});

test('extractJsonLdEvents parses Schema.org Event metadata accurately', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Community Fair 2026</title>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": "Berkeley Kids STEM Fair",
          "startDate": "2026-10-25T10:00:00-07:00",
          "endDate": "2026-10-25T15:00:00-07:00",
          "location": {
            "@type": "Place",
            "name": "Lawrence Hall of Science",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "1 Centennial Dr",
              "addressLocality": "Berkeley",
              "addressRegion": "CA"
            }
          },
          "description": "Interactive science exhibits and robotics demos for all ages.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "url": "https://lawrencehallofscience.org/stem-fair"
        }
        </script>
      </head>
      <body>
        <h1>Berkeley Kids STEM Fair</h1>
      </body>
    </html>
  `;

  const events = extractJsonLdEvents(sampleHtml);
  assert.equal(events.length, 1);
  assert.equal(events[0].title, 'Berkeley Kids STEM Fair');
  assert.equal(events[0].startDate, '2026-10-25');
  assert.equal(events[0].startTime, '10:00');
  assert.equal(events[0].endTime, '15:00');
  assert.ok(events[0].location?.includes('Lawrence Hall of Science'));
  assert.ok(events[0].location?.includes('Berkeley'));
  assert.equal(events[0].isFree, true);
  assert.equal(events[0].registrationUrl, 'https://lawrencehallofscience.org/stem-fair');
});

test('extractJsonLdEvents parses @graph and arrays of events', () => {
  const sampleGraphHtml = `
    <html>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "name": "City Library"
          },
          {
            "@type": "Event",
            "name": "Bilingual Storytime",
            "startDate": "2026-11-02T10:30:00"
          },
          {
            "@type": "Event",
            "name": "Lego Club",
            "startDate": "2026-11-03T15:30:00"
          }
        ]
      }
      </script>
    </html>
  `;

  const events = extractJsonLdEvents(sampleGraphHtml);
  assert.equal(events.length, 2);
  assert.equal(events[0].title, 'Bilingual Storytime');
  assert.equal(events[0].startDate, '2026-11-02');
  assert.equal(events[1].title, 'Lego Club');
  assert.equal(events[1].startDate, '2026-11-03');
});

test('extractReadableText strips boilerplate HTML and extracts page text', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Halloween Spooktacular - San Mateo</title>
        <style>.hidden { display: none; }</style>
        <script>console.log("analytics");</script>
      </head>
      <body>
        <nav><a href="/">Home</a><a href="/about">About</a></nav>
        <main>
          <h1>Halloween Spooktacular</h1>
          <p>Join us on <b>Saturday, October 31</b> at Central Park!</p>
          <p>Trick-or-treating, costume parade &amp; carnival games from 2:00 PM to 5:00 PM.</p>
        </main>
        <footer>&copy; 2026 San Mateo City</footer>
      </body>
    </html>
  `;

  const { title, text } = extractReadableText(html);
  assert.equal(title, 'Halloween Spooktacular - San Mateo');
  assert.ok(text.includes('Halloween Spooktacular'));
  assert.ok(text.includes('Saturday, October 31'));
  assert.ok(text.includes('costume parade & carnival games'));
  assert.ok(!text.includes('console.log'));
  assert.ok(!text.includes('&copy; 2026 San Mateo City'));
});

test('scrapeWebPage returns Tier 1 JSON-LD when present', async () => {
  const mockFetch = (async () => {
    return {
      ok: true,
      status: 200,
      text: async () => `
        <html>
          <head>
            <script type="application/ld+json">
              {"@type": "Event", "name": "Story Hour", "startDate": "2026-10-14"}
            </script>
          </head>
          <body>Story Hour</body>
        </html>
      `,
    } as any;
  }) as typeof fetch;

  const result = await scrapeWebPage('https://example.com/story-hour', {
    fetcher: mockFetch,
  });

  assert.equal(result.tier, 'jsonld');
  assert.equal(result.events?.length, 1);
  assert.equal(result.events?.[0].title, 'Story Hour');
});

test('scrapeWebPage returns Tier 2 readability text when no JSON-LD is found', async () => {
  const mockFetch = (async () => {
    return {
      ok: true,
      status: 200,
      text: async () => `
        <html>
          <head><title>Fall Pumpkin Festival</title></head>
          <body>
            <h1>Fall Pumpkin Festival</h1>
            <p>Visit Half Moon Bay for our annual pumpkin celebration.</p>
          </body>
        </html>
      `,
    } as any;
  }) as typeof fetch;

  const result = await scrapeWebPage('https://example.com/festival', {
    fetcher: mockFetch,
  });

  assert.equal(result.tier, 'direct_html');
  assert.equal(result.title, 'Fall Pumpkin Festival');
  assert.ok(result.text.includes('Visit Half Moon Bay'));
});
