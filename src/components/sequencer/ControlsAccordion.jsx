import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Settings, Volume2, Shuffle, Music } from 'lucide-react';

/**
 * Modern accordion component for sequencer controls
 * Provides collapsible sections for different control groups
 */
const ControlsAccordion = memo(function ControlsAccordion({
  children,
  className = ''
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
});

/**
 * Individual accordion section
 */
const AccordionSection = memo(function AccordionSection({
  title,
  icon: Icon = Settings,
  defaultOpen = false,
  children,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={toggleOpen}
        className="w-full px-4 py-3 flex items-center justify-between text-left
          hover:bg-white/5 transition-colors duration-200 group"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-cyan-400" />
          <span className="font-medium text-white text-sm">{title}</span>
        </div>
        
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-4 h-4 text-white/60 group-hover:text-white/80" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/10">
              <div className="pt-3">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Export both components
export { ControlsAccordion, AccordionSection };
export default ControlsAccordion;