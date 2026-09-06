import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lightTheme, darkTheme } from '../services/themeContext';

describe('Mobile App Theme Tokens & Style Guide Conformance', () => {
  it('strictly adheres to .specs/style-guide.md color tokens in Light (Paper) mode', () => {
    // Style guide section 1: Color tokens
    // --color-paper: #EDE8DC (page background)
    assert.equal(lightTheme.paper, '#EDE8DC');

    // --color-ink: #1F2A1E (text, linework, borders on dark)
    assert.equal(lightTheme.ink, '#1F2A1E');

    // --color-trail-orange: #E8562C (the one accent — CTAs, Official badge)
    assert.equal(lightTheme.trailOrange, '#E8562C');
    assert.equal(lightTheme.primaryButtonBg, '#E8562C');

    // --color-moss: #5C6E4F (secondary / completed / success state)
    assert.equal(lightTheme.moss, '#5C6E4F');

    // --color-contour-tan: #C9BFA6 (hairline borders, dividers)
    assert.equal(lightTheme.contourTan, '#C9BFA6');

    // --color-chalk: #F7F5EF (card surfaces sitting on paper)
    assert.equal(lightTheme.chalk, '#F7F5EF');

    // Rule: Route linework itself is always ink, regardless of surrounding color
    assert.equal(lightTheme.routeStroke, '#1F2A1E');
  });

  it('provides high-contrast AMOLED tokens in Dark mode for outdoor running legibility', () => {
    assert.equal(darkTheme.mode, 'dark');
    assert.equal(darkTheme.paper, '#0C100D');
    assert.equal(darkTheme.chalk, '#131A15');
    // In dark AMOLED mode, route stroke is neon glowing emerald for visibility
    assert.equal(darkTheme.routeStroke, '#34D399');
    assert.equal(darkTheme.primaryButtonBg, '#10B981');
  });

  it('ensures all required theme keys are defined in both themes', () => {
    const lightKeys = Object.keys(lightTheme).sort();
    const darkKeys = Object.keys(darkTheme).sort();
    assert.deepEqual(lightKeys, darkKeys);
    assert.ok(lightKeys.length >= 20);
  });
});
