/**
 * @fileoverview Integration tests for sequencer hooks
 */

import { describe, it, expect } from 'vitest';
import { useSequencer } from '../useSequencer.js';
import { useSequencerAudio } from '../useSequencerAudio.js';

describe('Sequencer Hooks Integration', () => {
  it('should export useSequencer hook', () => {
    expect(typeof useSequencer).toBe('function');
  });

  it('should export useSequencerAudio hook', () => {
    expect(typeof useSequencerAudio).toBe('function');
  });

  it('should have proper hook signatures', () => {
    // Test that hooks are functions and can be imported
    expect(useSequencer).toBeDefined();
    expect(useSequencerAudio).toBeDefined();
    expect(typeof useSequencer).toBe('function');
    expect(typeof useSequencerAudio).toBe('function');
  });
});