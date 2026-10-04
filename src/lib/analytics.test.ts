import test from 'node:test';
import assert from 'node:assert/strict';
import { trackAnalyticsEvent, analytics } from './analytics';

test('trackAnalyticsEvent does not throw when window or window.gtag is undefined in Node', () => {
  assert.doesNotThrow(() => {
    trackAnalyticsEvent('test_event', { key: 'value' });
  });
});

test('trackAnalyticsEvent filters out undefined params and invokes window.gtag when present', () => {
  const calls: any[] = [];
  (global as any).window = {
    gtag: (cmd: string, eventName: string, params?: any) => {
      calls.push({ cmd, eventName, params });
    },
  };

  try {
    trackAnalyticsEvent('sample_event', {
      stringVal: 'hello',
      numVal: 42,
      boolVal: true,
      undefVal: undefined,
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].cmd, 'event');
    assert.equal(calls[0].eventName, 'sample_event');
    assert.deepEqual(calls[0].params, {
      stringVal: 'hello',
      numVal: 42,
      boolVal: true,
    });
  } finally {
    delete (global as any).window;
  }
});

test('analytics.viewEventDetail formats event parameters accurately', () => {
  const calls: any[] = [];
  (global as any).window = {
    gtag: (cmd: string, eventName: string, params?: any) => {
      calls.push({ cmd, eventName, params });
    },
  };

  try {
    analytics.viewEventDetail({
      id: 'ev-1',
      title: 'Preschool Storytime',
      category: 'education',
      isFree: true,
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].eventName, 'view_event_detail');
    assert.deepEqual(calls[0].params, {
      event_id: 'ev-1',
      event_title: 'Preschool Storytime',
      category: 'education',
      is_free: true,
    });
  } finally {
    delete (global as any).window;
  }
});

test('analytics.clickOutboundTicket extracts destination domain safely', () => {
  const calls: any[] = [];
  (global as any).window = {
    gtag: (cmd: string, eventName: string, params?: any) => {
      calls.push({ cmd, eventName, params });
    },
  };

  try {
    analytics.clickOutboundTicket('ev-2', 'https://www.eventbrite.com/e/family-fair-tickets-12345');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].eventName, 'click_outbound_ticket');
    assert.equal(calls[0].params.event_id, 'ev-2');
    assert.equal(calls[0].params.destination_domain, 'www.eventbrite.com');

    // Handles invalid URL gracefully
    analytics.clickOutboundTicket('ev-3', 'not-a-valid-url');
    assert.equal(calls.length, 2);
    assert.equal(calls[1].params.event_id, 'ev-3');
    assert.equal(calls[1].params.destination_domain, undefined);
  } finally {
    delete (global as any).window;
  }
});

test('analytics.clickOutboundSource tracks source handle referral', () => {
  const calls: any[] = [];
  (global as any).window = {
    gtag: (cmd: string, eventName: string, params?: any) => {
      calls.push({ cmd, eventName, params });
    },
  };

  try {
    analytics.clickOutboundSource('ev-4', '@bayareaparents');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].eventName, 'click_outbound_source');
    assert.equal(calls[0].params.event_id, 'ev-4');
    assert.equal(calls[0].params.source_handle, 'bayareaparents');
  } finally {
    delete (global as any).window;
  }
});

test('analytics.filterAgeGroup and filterCategory format correctly', () => {
  const calls: any[] = [];
  (global as any).window = {
    gtag: (cmd: string, eventName: string, params?: any) => {
      calls.push({ cmd, eventName, params });
    },
  };

  try {
    analytics.filterAgeGroup('toddlers', true);
    analytics.filterAgeGroup('kids', false);
    analytics.filterCategory('nature');

    assert.equal(calls.length, 3);
    assert.deepEqual(calls[0].params, { age_group: 'toddlers', action: 'add' });
    assert.deepEqual(calls[1].params, { age_group: 'kids', action: 'remove' });
    assert.deepEqual(calls[2].params, { category: 'nature' });
  } finally {
    delete (global as any).window;
  }
});

test('analytics.toggleViewMode, bookmarkEvent, and clickKofiTip format correctly', () => {
  const calls: any[] = [];
  (global as any).window = {
    gtag: (cmd: string, eventName: string, params?: any) => {
      calls.push({ cmd, eventName, params });
    },
  };

  try {
    analytics.toggleViewMode('month');
    analytics.bookmarkEvent('ev-99', true);
    analytics.bookmarkEvent('ev-99', false);
    analytics.clickKofiTip('header');

    assert.equal(calls.length, 4);
    assert.deepEqual(calls[0].params, { view_mode: 'month' });
    assert.deepEqual(calls[1].params, { event_id: 'ev-99', action: 'save' });
    assert.deepEqual(calls[2].params, { event_id: 'ev-99', action: 'unsave' });
    assert.deepEqual(calls[3].params, { placement: 'header' });
  } finally {
    delete (global as any).window;
  }
});
