import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordTelemetryEvent,
  getTelemetrySummary,
  clearTelemetryStore,
  type TelemetryEvent,
} from './telemetry';

describe('Telemetry - First-Party Analytics Collector', () => {
  beforeEach(() => {
    clearTelemetryStore();
  });

  test('records event views and tracks top viewed events', () => {
    recordTelemetryEvent({
      eventName: 'view_event_detail',
      params: { event_id: 'ev-1', event_title: 'Toddler Music in the Park', category: 'music' },
      timestamp: Date.now(),
    });
    recordTelemetryEvent({
      eventName: 'view_event_detail',
      params: { event_id: 'ev-1', event_title: 'Toddler Music in the Park', category: 'music' },
      timestamp: Date.now(),
    });
    recordTelemetryEvent({
      eventName: 'view_event_detail',
      params: { event_id: 'ev-2', event_title: 'Science Fair Discovery Day', category: 'education' },
      timestamp: Date.now(),
    });

    const summary = getTelemetrySummary();
    assert.equal(summary.totalViews, 3);
    assert.equal(summary.topEvents.length, 2);
    assert.equal(summary.topEvents[0].eventId, 'ev-1');
    assert.equal(summary.topEvents[0].views, 2);
    assert.equal(summary.topEvents[1].eventId, 'ev-2');
    assert.equal(summary.topEvents[1].views, 1);
  });

  test('tracks outbound ticket clicks, destination domains, and computes CTR', () => {
    // 4 views, 2 ticket clicks -> 50% CTR
    recordTelemetryEvent({
      eventName: 'view_event_detail',
      params: { event_id: 'ev-1', event_title: 'Pumpkin Patch' },
      timestamp: Date.now(),
    });
    recordTelemetryEvent({
      eventName: 'view_event_detail',
      params: { event_id: 'ev-1', event_title: 'Pumpkin Patch' },
      timestamp: Date.now(),
    });
    recordTelemetryEvent({
      eventName: 'view_event_detail',
      params: { event_id: 'ev-2', event_title: 'Puppet Show' },
      timestamp: Date.now(),
    });
    recordTelemetryEvent({
      eventName: 'view_event_detail',
      params: { event_id: 'ev-3', event_title: 'Kids Clay Art' },
      timestamp: Date.now(),
    });

    recordTelemetryEvent({
      eventName: 'click_outbound_ticket',
      params: { event_id: 'ev-1', destination_domain: 'eventbrite.com' },
      timestamp: Date.now(),
    });
    recordTelemetryEvent({
      eventName: 'click_outbound_ticket',
      params: { event_id: 'ev-2', destination_domain: 'sfmoma.org' },
      timestamp: Date.now(),
    });

    const summary = getTelemetrySummary();
    assert.equal(summary.totalViews, 4);
    assert.equal(summary.totalTicketClicks, 2);
    assert.equal(summary.outboundCtr, 50); // (2 / 4) * 100 = 50%

    assert.equal(summary.topTicketDomains.length, 2);
    assert.ok(summary.topTicketDomains.some((d) => d.domain === 'eventbrite.com' && d.clicks === 1));
    assert.ok(summary.topTicketDomains.some((d) => d.domain === 'sfmoma.org' && d.clicks === 1));
  });

  test('handles zero views gracefully without NaN CTR', () => {
    const summary = getTelemetrySummary();
    assert.equal(summary.totalViews, 0);
    assert.equal(summary.totalTicketClicks, 0);
    assert.equal(summary.outboundCtr, 0);
  });

  test('tracks age group demand and category filter preferences', () => {
    recordTelemetryEvent({
      eventName: 'filter_age_group',
      params: { age_group: 'toddlers', action: 'add' },
      timestamp: Date.now(),
    });
    recordTelemetryEvent({
      eventName: 'filter_age_group',
      params: { age_group: 'toddlers', action: 'add' },
      timestamp: Date.now(),
    });
    recordTelemetryEvent({
      eventName: 'filter_age_group',
      params: { age_group: 'preschoolers', action: 'add' },
      timestamp: Date.now(),
    });

    recordTelemetryEvent({
      eventName: 'filter_category',
      params: { category: 'arts' },
      timestamp: Date.now(),
    });

    recordTelemetryEvent({
      eventName: 'toggle_view_mode',
      params: { view_mode: 'map' },
      timestamp: Date.now(),
    });

    const summary = getTelemetrySummary();
    assert.equal(summary.ageGroupDemand['toddlers'], 2);
    assert.equal(summary.ageGroupDemand['preschoolers'], 1);
    assert.equal(summary.categoryDemand['arts'], 1);
    assert.equal(summary.viewModePreferences['map'], 1);
  });

  test('tracks outbound creator source links', () => {
    recordTelemetryEvent({
      eventName: 'click_outbound_source',
      params: { event_id: 'ev-1', source_handle: 'bayarea_toddlerexplorer' },
      timestamp: Date.now(),
    });
    recordTelemetryEvent({
      eventName: 'click_outbound_source',
      params: { event_id: 'ev-2', source_handle: 'bayarea_toddlerexplorer' },
      timestamp: Date.now(),
    });

    const summary = getTelemetrySummary();
    assert.equal(summary.totalSourceClicks, 2);
    assert.equal(summary.topSourcesReferred.length, 1);
    assert.equal(summary.topSourcesReferred[0].handle, 'bayarea_toddlerexplorer');
    assert.equal(summary.topSourcesReferred[0].clicks, 2);
  });

  test('bounds recent events buffer to max capacity', () => {
    for (let i = 0; i < 60; i++) {
      recordTelemetryEvent({
        eventName: 'view_event_detail',
        params: { event_id: `ev-${i}`, event_title: `Event ${i}` },
        timestamp: Date.now() + i,
      });
    }

    const summary = getTelemetrySummary();
    assert.ok(summary.recentEvents.length <= 50);
    // Most recent is at index 0
    assert.equal(summary.recentEvents[0].params?.event_id, 'ev-59');
  });
});
