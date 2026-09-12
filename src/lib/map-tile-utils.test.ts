import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CARTO_KEY,
  getCartoTileUrl,
  getMapTileLayerConfig,
} from './map-tile-utils';

test('DEFAULT_CARTO_KEY matches the provided Carto key', () => {
  assert.equal(DEFAULT_CARTO_KEY, 'cb1_3iop_1_315a1f76eca6cd80f7b3b86f');
});

test('getCartoTileUrl generates voyager tile URL with key by default', () => {
  const url = getCartoTileUrl();
  assert.equal(
    url,
    `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${DEFAULT_CARTO_KEY}`
  );
});

test('getCartoTileUrl generates dark_all tile URL when requested', () => {
  const url = getCartoTileUrl({ style: 'dark_all' });
  assert.equal(
    url,
    `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${DEFAULT_CARTO_KEY}`
  );
});

test('getCartoTileUrl allows custom key override', () => {
  const url = getCartoTileUrl({ key: 'custom-key-123' });
  assert.equal(
    url,
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=custom-key-123'
  );
});

test('getMapTileLayerConfig returns complete Leaflet tileLayer configuration', () => {
  const config = getMapTileLayerConfig();
  assert.ok(config.url.includes('voyager'));
  assert.ok(config.url.includes(`key=${DEFAULT_CARTO_KEY}`));
  assert.equal(config.options.subdomains, 'abcd');
  assert.equal(config.options.maxZoom, 20);
  assert.ok(config.options.attribution.includes('OpenStreetMap'));
  assert.ok(config.options.attribution.includes('CARTO'));
});
