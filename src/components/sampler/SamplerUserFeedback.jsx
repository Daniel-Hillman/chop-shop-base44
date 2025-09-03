/**
 * @fileoverview Enhanced User Feedback System for Sampler
 * Provides visual and audio feedback for user interactions
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Check, AlertCircle, Info, Zap, Volume2, VolumeX } from 'lucide-react';

/**
 * Toast notification system for sampler feedback
 */
export const useSamplerToast = () => {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((toast) => {
    const id = ++toastIdRef.current;
    const newToast = {
      id,
      type: 'info',
      duration: 3000,
      ...toast,
      timestamp: Date.now()
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast
    if (newToast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ type: 'error', message, duration: 5000, ...options });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ type: 'warning', message, duration: 4000, ...options });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    info,
    warning
  };
};

/**
 * Toast container component
 */
export const SamplerToastContainer = memo(function SamplerToastContainer({
  toasts = [],
  onRemove,
  position = 'top-right',
  className = ''
}) {
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50'
  };

  return (
    <div className={`${positionClasses[position]} space-y-2 max-w-sm w-full ${className}`}>
      {toasts.map(toast => (
        <SamplerToast
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
});

/**
 * Individual toast component
 */
export const SamplerToast = memo(function SamplerToast({
  toast,
  onRemove,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = useCallback(() => {
    setIsVisible(false);
    setTimeout(onRemove, 200); // Wait for animation
  }, [onRemove]);

  const typeConfig = {
    success: {
      icon: Check,
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/40',
      textColor: 'text-green-300',
      iconColor: 'text-green-400'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/40',
      textColor: 'text-red-300',
      iconColor: 'text-red-400'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/40',
      textColor: 'text-yellow-300',
      iconColor: 'text-yellow-400'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/40',
      textColor: 'text-blue-300',
      iconColor: 'text-blue-400'
    }
  };

  const config = typeConfig[toast.type] || typeConfig.info;
  const IconComponent = config.icon;

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        backdrop-blur-lg border rounded-lg p-3 shadow-lg
        transform transition-all duration-200 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <IconComponent className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-medium text-sm mb-1">{toast.title}</div>
          )}
          <div className="text-sm opacity-90">{toast.message}</div>
          {toast.action && (
            <button
              onClick={toast.action.handler}
              className="mt-2 text-xs underline hover:no-underline opacity-80 hover:opacity-100"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="text-white/60 hover:text-white/80 transition-colors flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
});

/**
 * Visual feedback for step interactions
 */
export const SamplerStepFeedback = memo(function SamplerStepFeedback({
  isActive = false,
  isTriggered = false,
  hasChop = false,
  className = ''
}) {
  const [ripple, setRipple] = useState(false);

  useEffect(() => {
    if (isTriggered) {
      setRipple(true);
      const timer = setTimeout(() => setRipple(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isTriggered]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Ripple effect */}
      {ripple && (
        <div className="absolute inset-0 bg-cyan-400/30 rounded animate-ping" />
      )}
      
      {/* Active state glow */}
      {isActive && hasChop && (
        <div className="absolute inset-0 bg-cyan-400/20 rounded animate-pulse" />
      )}
    </div>
  );
});

/**
 * Audio feedback system
 */
export const useSamplerAudioFeedback = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const audioContextRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    if (isEnabled && !audioContextRef.current) {
      try {
        // Skip audio context in test environment
        if (typeof window !== 'undefined' && window.AudioContext && !window.navigator?.userAgent?.includes('jsdom')) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        } else {
          setIsEnabled(false);
        }
      } catch (error) {
        console.warn('Audio feedback not available:', error);
        setIsEnabled(false);
      }
    }
  }, [isEnabled]);

  const playTone = useCallback((frequency = 800, duration = 100, volume = 0.1) => {
    if (!isEnabled || !audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Audio feedback error:', error);
    }
  }, [isEnabled]);

  // Predefined feedback sounds
  const feedback = {
    stepToggle: () => playTone(600, 80, 0.05),
    play: () => playTone(800, 120, 0.08),
    stop: () => playTone(400, 150, 0.08),
    bankChange: () => playTone(1000, 100, 0.06),
    error: () => playTone(200, 200, 0.1),
    success: () => {
      playTone(600, 100, 0.05);
      setTimeout(() => playTone(800, 100, 0.05), 100);
    }
  };

  return {
    isEnabled,
    setIsEnabled,
    playTone,
    feedback
  };
};

/**
 * Audio feedback toggle component
 */
export const SamplerAudioFeedbackToggle = memo(function SamplerAudioFeedbackToggle({
  isEnabled,
  onToggle,
  className = ''
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors
        ${isEnabled 
          ? 'text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20' 
          : 'text-white/40 hover:text-white/60 bg-white/5 hover:bg-white/10'
        } ${className}`}
      title={`Audio feedback ${isEnabled ? 'enabled' : 'disabled'}`}
    >
      {isEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
      <span>Audio</span>
    </button>
  );
});

/**
 * Progress indicator for loading states
 */
export const SamplerProgressIndicator = memo(function SamplerProgressIndicator({
  progress = 0,
  label = '',
  showPercentage = true,
  size = 'md',
  className = ''
}) {
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs text-white/70">
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(progress)}%</span>}
        </div>
      )}
      <div className={`w-full bg-white/10 rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
});

/**
 * Status indicator component
 */
export const SamplerStatusIndicator = memo(function SamplerStatusIndicator({
  status = 'idle',
  label = '',
  pulse = false,
  className = ''
}) {
  const statusConfig = {
    idle: { color: 'bg-gray-400', text: 'Idle' },
    loading: { color: 'bg-yellow-400', text: 'Loading' },
    playing: { color: 'bg-green-400', text: 'Playing' },
    error: { color: 'bg-red-400', text: 'Error' },
    success: { color: 'bg-emerald-400', text: 'Ready' }
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.color} ${pulse ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-white/70">{label || config.text}</span>
    </div>
  );
});

/**
 * Haptic feedback hook (for supported devices)
 */
export const useSamplerHapticFeedback = () => {
  const isSupported = 'vibrate' in navigator;

  const vibrate = useCallback((pattern = 50) => {
    if (isSupported) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Haptic feedback error:', error);
      }
    }
  }, [isSupported]);

  const feedback = {
    light: () => vibrate(25),
    medium: () => vibrate(50),
    heavy: () => vibrate(100),
    double: () => vibrate([50, 50, 50]),
    success: () => vibrate([25, 25, 50]),
    error: () => vibrate([100, 50, 100])
  };

  return {
    isSupported,
    vibrate,
    feedback
  };
};

export default {
  useSamplerToast,
  SamplerToastContainer,
  SamplerToast,
  SamplerStepFeedback,
  useSamplerAudioFeedback,
  SamplerAudioFeedbackToggle,
  SamplerProgressIndicator,
  SamplerStatusIndicator,
  useSamplerHapticFeedback
};