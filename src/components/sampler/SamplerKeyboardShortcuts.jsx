/**
 * @fileoverview Enhanced Keyboard Shortcuts for Sampler Components
 * Provides comprehensive keyboard interaction support
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { useEffect, useCallback, useRef, memo } from 'react';
import { Keyboard, Info } from 'lucide-react';

/**
 * Keyboard shortcut manager hook
 */
export const useSamplerKeyboardShortcuts = ({
  onPlay,
  onStop,
  onBpmChange,
  onBankChange,
  onStepToggle,
  onTapTempo,
  isPlaying = false,
  currentBpm = 120,
  currentBank = 0,
  totalBanks = 2,
  isEnabled = true
}) => {
  const lastTapRef = useRef(0);
  const tapCountRef = useRef(0);
  const tapTimesRef = useRef([]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (!isEnabled) return;

    // Skip if typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Prevent default for handled keys
    const handledKeys = [
      'Space', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyT', 'KeyB', 'KeyM', 'KeyS'
    ];

    if (handledKeys.includes(e.code)) {
      e.preventDefault();
    }

    switch (e.code) {
      // Transport Controls
      case 'Space':
        if (isPlaying) {
          onStop?.();
        } else {
          onPlay?.();
        }
        break;

      case 'Enter':
        onPlay?.();
        break;

      case 'Escape':
        onStop?.();
        break;

      // Bank Navigation
      case 'ArrowLeft':
        if (e.shiftKey && currentBank > 0) {
          onBankChange?.(currentBank - 1);
        }
        break;

      case 'ArrowRight':
        if (e.shiftKey && currentBank < totalBanks - 1) {
          onBankChange?.(currentBank + 1);
        }
        break;

      // BPM Controls
      case 'ArrowUp':
        if (e.ctrlKey || e.metaKey) {
          const newBpm = Math.min(200, currentBpm + (e.shiftKey ? 10 : 1));
          onBpmChange?.(newBpm);
        }
        break;

      case 'ArrowDown':
        if (e.ctrlKey || e.metaKey) {
          const newBpm = Math.max(60, currentBpm - (e.shiftKey ? 10 : 1));
          onBpmChange?.(newBpm);
        }
        break;

      // Quick BPM Presets
      case 'Digit1':
        if (e.ctrlKey || e.metaKey) {
          onBpmChange?.(90); // Slow
        }
        break;

      case 'Digit2':
        if (e.ctrlKey || e.metaKey) {
          onBpmChange?.(120); // Medium
        }
        break;

      case 'Digit3':
        if (e.ctrlKey || e.metaKey) {
          onBpmChange?.(140); // Fast
        }
        break;

      case 'Digit4':
        if (e.ctrlKey || e.metaKey) {
          onBpmChange?.(160); // Very Fast
        }
        break;

      // Tap Tempo
      case 'KeyT':
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          handleTapTempo();
        }
        break;

      // Utility Functions
      case 'KeyB':
        if (e.ctrlKey || e.metaKey) {
          // Toggle between banks quickly
          onBankChange?.((currentBank + 1) % totalBanks);
        }
        break;

      case 'KeyM':
        if (e.ctrlKey || e.metaKey) {
          // Mute/unmute (stop/play)
          if (isPlaying) {
            onStop?.();
          } else {
            onPlay?.();
          }
        }
        break;

      case 'KeyS':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault(); // Prevent browser save
          onStop?.();
        }
        break;

      default:
        break;
    }
  }, [
    isEnabled, isPlaying, onPlay, onStop, onBpmChange, onBankChange, 
    currentBpm, currentBank, totalBanks
  ]);

  // Tap tempo implementation
  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    tapTimesRef.current.push(now);

    // Keep only the last 8 taps
    if (tapTimesRef.current.length > 8) {
      tapTimesRef.current.shift();
    }

    // Calculate BPM if we have at least 4 taps
    if (tapTimesRef.current.length >= 4) {
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }

      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      const clampedBpm = Math.max(60, Math.min(200, bpm));

      onTapTempo?.(clampedBpm);
      onBpmChange?.(clampedBpm);
    }

    // Reset taps after 3 seconds of inactivity
    setTimeout(() => {
      const timeSinceLastTap = Date.now() - now;
      if (timeSinceLastTap >= 3000) {
        tapTimesRef.current = [];
      }
    }, 3000);
  }, [onTapTempo, onBpmChange]);

  // Set up event listeners
  useEffect(() => {
    if (!isEnabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, isEnabled]);

  return {
    handleTapTempo
  };
};

/**
 * Keyboard shortcuts help overlay
 */
export const SamplerKeyboardHelp = memo(function SamplerKeyboardHelp({
  isVisible = false,
  onClose,
  className = ''
}) {
  const shortcuts = [
    {
      category: 'Transport',
      items: [
        { key: 'Space', description: 'Play/Stop toggle' },
        { key: 'Enter', description: 'Play' },
        { key: 'Esc', description: 'Stop' },
        { key: 'Ctrl/Cmd + M', description: 'Mute toggle' },
        { key: 'Ctrl/Cmd + S', description: 'Stop (override save)' }
      ]
    },
    {
      category: 'Tempo',
      items: [
        { key: 'T', description: 'Tap tempo' },
        { key: 'Ctrl/Cmd + ↑/↓', description: 'Adjust BPM ±1' },
        { key: 'Ctrl/Cmd + Shift + ↑/↓', description: 'Adjust BPM ±10' },
        { key: 'Ctrl/Cmd + 1-4', description: 'BPM presets (90/120/140/160)' }
      ]
    },
    {
      category: 'Navigation',
      items: [
        { key: 'Shift + ←/→', description: 'Switch banks' },
        { key: 'Ctrl/Cmd + B', description: 'Cycle through banks' }
      ]
    },
    {
      category: 'Grid (Future)',
      items: [
        { key: 'Click', description: 'Toggle step' },
        { key: 'Shift + Click', description: 'Multi-select steps' },
        { key: 'Ctrl/Cmd + Click', description: 'Add to selection' }
      ]
    }
  ];

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-black/80 backdrop-blur-lg border border-white/20 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shortcuts.map((category) => (
            <div key={category.category} className="space-y-3">
              <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-400/20 pb-2">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-white/80 text-sm">{item.description}</span>
                    <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs font-mono text-white/90">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-white/60 text-sm">
            Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-xs">Esc</kbd> to close this help
          </p>
        </div>
      </div>
    </div>
  );
});

/**
 * Keyboard shortcuts indicator component
 */
export const SamplerKeyboardIndicator = memo(function SamplerKeyboardIndicator({
  onShowHelp,
  className = ''
}) {
  return (
    <button
      onClick={onShowHelp}
      className={`flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 
        border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200 
        text-white/60 hover:text-white/80 text-xs ${className}`}
      title="Show keyboard shortcuts"
    >
      <Keyboard className="w-3 h-3" />
      <span>Shortcuts</span>
    </button>
  );
});

export default {
  useSamplerKeyboardShortcuts,
  SamplerKeyboardHelp,
  SamplerKeyboardIndicator
};