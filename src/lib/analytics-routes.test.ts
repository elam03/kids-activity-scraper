import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as collectPOST } from '../app/api/analytics/collect/route';
import { GET as analyticsGET } from '../app/api/admin/analytics/route';
import { clearTelemetryStore } from './telemetry';

test('POST /api/analytics/collect rejects request with missing eventName', async () => {
  const req = new Request('http://localhost:3000/api/analytics/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params: { some: 'value' } }),
  });
  const res = await collectPOST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.error, 'Missing eventName');
});

test('POST /api/analytics/collect accepts json payload and records telemetry', async () => {
  clearTelemetryStore();
  const req = new Request('http://localhost:3000/api/analytics/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName: 'view_event_detail',
      params: { event_id: 'evt-test-1', event_title: 'Zoo Adventure' },
    }),
  });
  const res = await collectPOST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
});

test('POST /api/analytics/collect accepts text/plain beacon payload', async () => {
  clearTelemetryStore();
  const req = new Request('http://localhost:3000/api/analytics/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      eventName: 'click_outbound_ticket',
      params: { event_id: 'evt-test-1', destination_domain: 'zoo.org' },
    }),
  });
  const res = await collectPOST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
});

test('GET /api/admin/analytics returns aggregated telemetry summary and DB metrics', async () => {
  const res = await analyticsGET();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.telemetry);
  assert.ok(data.dbMetrics);
  assert.ok(data.gaConfig);
  assert.equal(typeof data.telemetry.totalEvents, 'number');
});
