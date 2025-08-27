import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, AlertTriangle } from 'lucide-react';

/**
 * Step resolution selector component for the drum sequencer
 * Allows switching between different step resolutions (1/8, 1/16, 1/32)
 */
export default function StepResolutionSelector({
  resolution = 16,
  onResolutionChange,
  isInitialized = false,
  hasPatternData = false,
  className = ''
}) {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingResolution, setPendingResolution] = useState(null);

  // Available resolution options
  const resolutionOptions = [
    { value: 8, label: '1/8', description: '8 steps per bar' },
    { value: 16, label: '1/16', description: '16 steps per bar' },
    { value: 32, label: '1/32', description: '32 steps per bar' }
  ];

  // Handle resolution change with pattern preservation warning
  const handleResolutionChange = useCallback((newResolution) => {
    if (!isInitialized) return;

    // If there's pattern data and resolution is changing, show warning
    if (hasPatternData && newResolution !== resolution) {
      setPendingResolution(newResolution);
      setShowWarning(true);
      return;
    }

    // No pattern data or same resolution, change immediately
    onResolutionChange?.(newResolution);
  }, [resolution, hasPatternData, isInitialized, onResolutionChange]);

  // Confirm resolution change
  const confirmResolutionChange = useCallback(() => {
    if (pendingResolution !== null) {
      onResolutionChange?.(pendingResolution);
    }
    setShowWarning(false);
    setPendingResolution(null);
  }, [pendingResolution, onResolutionChange]);

  // Cancel resolution change
  const cancelResolutionChange = useCallback(() => {
    setShowWarning(false);
    setPendingResolution(null);
  }, []);

  // Get resolution display info
  const getCurrentResolutionInfo = () => {
    return resolutionOptions.find(option => option.value === resolution) || resolutionOptions[1];
  };

  const currentInfo = getCurrentResolutionInfo();

  return (
    <div className={`relative ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-white/60" />
          <label className="text-sm font-medium text-white/80">
            Step Resolution
          </label>
        </div>

        {/* Resolution Options */}
        <div className="flex gap-2">
          {resolutionOptions.map((option) => {
            const isSelected = option.value === resolution;
            const isPending = option.value === pendingResolution;
            
            return (
              <motion.button
                key={option.value}
                onClick={() => handleResolutionChange(option.value)}
                disabled={!isInitialized}
                className={`relative px-3 py-2 text-sm rounded-lg border transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                  ${isSelected
                    ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200 shadow-lg shadow-cyan-400/20'
                    : isPending
                      ? 'border-orange-400 bg-orange-400/20 text-orange-200'
                      : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                  }
                  ${!isInitialized ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                whileHover={isInitialized ? { scale: 1.02 } : {}}
                whileTap={isInitialized ? { scale: 0.98 } : {}}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-xs opacity-70">{option.description}</div>
                
                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="resolution-indicator"
                    className="absolute inset-0 border-2 border-cyan-400 rounded-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Current Resolution Info */}
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span>Current:</span>
          <span className="font-mono text-cyan-400">{currentInfo.label}</span>
          <span>•</span>
          <span>{currentInfo.description}</span>
        </div>

        {/* Pattern Data Warning */}
        {hasPatternData && (
          <div className="flex items-center gap-2 text-xs text-yellow-400/80">
            <AlertTriangle className="w-3 h-3" />
            <span>Changing resolution may affect existing pattern data</span>
          </div>
        )}
      </motion.div>

      {/* Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={cancelResolutionChange}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-black/90 backdrop-blur-lg border border-orange-400/20 rounded-2xl p-6 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <h3 className="text-lg font-semibold text-orange-200">
                  Change Step Resolution?
                </h3>
              </div>
              
              <div className="space-y-3 mb-6">
                <p className="text-white/70">
                  You're about to change from <span className="font-mono text-cyan-400">{currentInfo.label}</span> to{' '}
                  <span className="font-mono text-cyan-400">
                    {resolutionOptions.find(opt => opt.value === pendingResolution)?.label}
                  </span>.
                </p>
                
                <p className="text-white/60 text-sm">
                  This will modify your current pattern. Steps will be preserved where possible, 
                  but some pattern data may be lost or rearranged.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelResolutionChange}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white 
                    border border-white/20 rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResolutionChange}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white 
                    rounded-lg transition-all duration-200 font-medium"
                >
                  Change Resolution
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}