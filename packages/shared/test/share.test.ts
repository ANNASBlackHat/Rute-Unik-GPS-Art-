import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShareMessage,
  getWhatsAppShareUrl,
  getWhatsAppSchemeUrl,
  getTelegramShareUrl,
} from '../src/share';

describe('Share Content & URL Generators', () => {
  it('formats Indonesian share message with stats and URL', () => {
    const msg = buildShareMessage({
      routeName: 'Kucing UGM',
      cityName: 'Yogyakarta',
      distanceKm: '5.20',
      elevationGain: '+15 m',
      url: 'https://rute-unik.annasblackhat.my.id/id/routes/abc',
      locale: 'id',
    });

    assert.ok(msg.includes('🏃 *Kucing UGM* (GPS Art Route)'));
    assert.ok(msg.includes('📍 Kota: Yogyakarta'));
    assert.ok(msg.includes('📏 Jarak: 5.20 km'));
    assert.ok(msg.includes('⛰️ Elevasi: +15 m'));
    assert.ok(msg.includes('Lihat rute'));
    assert.ok(msg.includes('https://rute-unik.annasblackhat.my.id/id/routes/abc'));
  });

  it('formats English share message with stats and URL', () => {
    const msg = buildShareMessage({
      routeName: 'Cat Runner',
      cityName: 'Tokyo',
      distanceKm: '10.50',
      elevationGain: '+45 m',
      url: 'https://rute-unik.annasblackhat.my.id/en/routes/xyz',
      locale: 'en',
    });

    assert.ok(msg.includes('🏃 *Cat Runner* (GPS Art Route)'));
    assert.ok(msg.includes('📍 City: Tokyo'));
    assert.ok(msg.includes('📏 Distance: 10.50 km'));
    assert.ok(msg.includes('⛰️ Elevation: +45 m'));
    assert.ok(msg.includes('View route'));
    assert.ok(msg.includes('https://rute-unik.annasblackhat.my.id/en/routes/xyz'));
  });

  it('generates a valid WhatsApp web/app share URL', () => {
    const text = '🏃 *Test Route*\nhttps://example.com';
    const waUrl = getWhatsAppShareUrl(text);
    assert.equal(
      waUrl,
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    );
  });

  it('generates a valid WhatsApp custom scheme URL for mobile chooser', () => {
    const text = '🏃 *Test Route*\nhttps://example.com';
    const waScheme = getWhatsAppSchemeUrl(text);
    assert.equal(
      waScheme,
      `whatsapp://send?text=${encodeURIComponent(text)}`
    );
  });

  it('generates a valid Telegram share URL', () => {
    const text = '🏃 *Test Route*';
    const url = 'https://example.com';
    const tgUrl = getTelegramShareUrl(url, text);
    assert.equal(
      tgUrl,
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    );
  });
});
