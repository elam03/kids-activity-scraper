import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanHandle,
  formatInstagramUrl,
  generateCreatorOutreachText,
  formatCuratorStats,
  type CuratorSummary,
} from './curator-utils';

test('cleanHandle strips leading @ and whitespace and lowercases', () => {
  assert.equal(cleanHandle('@BayArea_Moms'), 'bayarea_moms');
  assert.equal(cleanHandle('  @SF_Kids_Fun  '), 'sf_kids_fun');
  assert.equal(cleanHandle('peninsula_family'), 'peninsula_family');
});

test('formatInstagramUrl creates valid canonical Instagram profile link', () => {
  assert.equal(
    formatInstagramUrl('@bayarea_toddlerexplorer'),
    'https://www.instagram.com/bayarea_toddlerexplorer'
  );
  assert.equal(
    formatInstagramUrl('sf_playgrounds'),
    'https://www.instagram.com/sf_playgrounds'
  );
});

test('generateCreatorOutreachText produces friendly, non-spammy DM templates', () => {
  const outreach = generateCreatorOutreachText({
    curatorName: 'Bay Area Explorer',
    handle: 'bayarea_explorer',
    featuredEventTitle: 'Toddler Music in the Park',
    eventUrl: 'https://www.littledaysout.com/?event=123',
  });

  assert.ok(outreach.instagramDm.includes('@bayarea_explorer'));
  assert.ok(outreach.instagramDm.includes('Toddler Music in the Park'));
  assert.ok(outreach.instagramDm.includes('https://www.littledaysout.com/?event=123'));
  assert.ok(outreach.storyShoutout.includes('Little Days Out'));
  assert.ok(outreach.subject.includes('Featured on Little Days Out'));
});

test('formatCuratorStats formats pluralized events and verification status', () => {
  const summary: CuratorSummary = {
    id: 'src-1',
    handle: 'bayarea_kids',
    name: 'Bay Area Kids',
    eventCount: 5,
    upcomingCount: 3,
    isActive: true,
  };

  const formatted = formatCuratorStats(summary);
  assert.equal(formatted.eventCountLabel, '5 activities curated');
  assert.equal(formatted.upcomingCountLabel, '3 upcoming');
  assert.equal(formatted.isVerified, true);
});
