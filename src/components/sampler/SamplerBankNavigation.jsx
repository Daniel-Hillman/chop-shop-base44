import React, { memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * SamplerBankNavigation - Navigation controls for switching between chop banks
 * 
 * Features:
 * - Simple arrow navigation (< Bank A/B >)
 * - Bank indicator with chop count display
 * - Smooth transitions between banks
 * - Support for 2 banks initially with 4-bank expansion capability
 * Performance optimizations: React.memo, memoized calculations, reduced animations
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
const SamplerBankNavigation = memo(function SamplerBankNavigation({
  currentBank = 0,
  totalBanks = 2,
  onBankChange,
  chopsPerBank = [],
  className = ''
}) {
  // Memoized bank labels to prevent array recreation
  const bankLabels = useMemo(() => ['A', 'B', 'C', 'D'], []);
  
  // Memoized current bank data
  const bankData = useMemo(() => {
    const currentBankLabel = bankLabels[currentBank] || 'A';
    const currentChopCount = chopsPerBank[currentBank] || 0;
    const canGoPrevious = currentBank > 0;
    const canGoNext = currentBank < totalBanks - 1;
    
    return {
      currentBankLabel,
      currentChopCount,
      canGoPrevious,
      canGoNext
    };
  }, [currentBank, totalBanks, chopsPerBank, bankLabels]);
  
  // Handle previous bank navigation
  const handlePreviousBank = () => {
    if (bankData.canGoPrevious) {
      onBankChange?.(currentBank - 1);
    }
  };
  
  // Handle next bank navigation
  const handleNextBank = () => {
    if (bankData.canGoNext) {
      onBankChange?.(currentBank + 1);
    }
  };

  // Memoized button styles
  const prevButtonClasses = useMemo(() => {
    return `p-1.5 h-8 w-8 transition-colors duration-200 ${
      bankData.canGoPrevious 
        ? 'text-white/80 hover:text-white hover:bg-white/10' 
        : 'text-white/30 cursor-not-allowed'
    }`;
  }, [bankData.canGoPrevious]);

  const nextButtonClasses = useMemo(() => {
    return `p-1.5 h-8 w-8 transition-colors duration-200 ${
      bankData.canGoNext 
        ? 'text-white/80 hover:text-white hover:bg-white/10' 
        : 'text-white/30 cursor-not-allowed'
    }`;
  }, [bankData.canGoNext]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Removed motion.div for performance */}
      {/* Previous Bank Button */}
      <Button
        onClick={handlePreviousBank}
        disabled={!bankData.canGoPrevious}
        variant="ghost"
        size="sm"
        className={prevButtonClasses}
        title="Previous Bank"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Bank Indicator - simplified without animation for performance */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-md min-w-[100px] justify-center">
        <span className="text-sm font-medium text-white">
          Bank {bankData.currentBankLabel}
        </span>
        <span className="text-xs text-white/60">
          ({bankData.currentChopCount}/16)
        </span>
      </div>

      {/* Next Bank Button */}
      <Button
        onClick={handleNextBank}
        disabled={!bankData.canGoNext}
        variant="ghost"
        size="sm"
        className={nextButtonClasses}
        title="Next Bank"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      {/* Bank Progress Indicator (dots) - simplified without animation */}
      <div className="flex items-center gap-1 ml-2">
        {Array.from({ length: totalBanks }, (_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 cursor-pointer ${
              index === currentBank 
                ? 'bg-cyan-400' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
            onClick={() => onBankChange?.(index)}
            title={`Bank ${bankLabels[index]}`}
          />
        ))}
      </div>
    </div>
  );
});

export default SamplerBankNavigation;