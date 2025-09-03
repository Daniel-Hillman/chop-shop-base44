/**
 * @fileoverview Responsive Layout Components for Sampler
 * Ensures optimal display across different screen sizes
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { useState, useEffect, memo, useMemo } from 'react';
import { ChevronDown, ChevronUp, Monitor, Smartphone, Tablet } from 'lucide-react';

/**
 * Hook to detect screen size and provide responsive utilities
 */
export const useResponsiveLayout = () => {
  const [screenSize, setScreenSize] = useState('desktop');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDimensions({ width, height });

      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isDesktop = screenSize === 'desktop';
  const isSmallScreen = isMobile || isTablet;

  return {
    screenSize,
    dimensions,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen
  };
};

/**
 * Responsive container that adapts layout based on screen size
 */
export const SamplerResponsiveContainer = memo(function SamplerResponsiveContainer({
  children,
  className = ''
}) {
  const { screenSize, isSmallScreen } = useResponsiveLayout();

  const containerClasses = useMemo(() => {
    const baseClasses = 'w-full';
    
    switch (screenSize) {
      case 'mobile':
        return `${baseClasses} px-2 py-2 space-y-3`;
      case 'tablet':
        return `${baseClasses} px-4 py-3 space-y-4`;
      case 'desktop':
      default:
        return `${baseClasses} px-6 py-4 space-y-6`;
    }
  }, [screenSize]);

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Screen size indicator (dev mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50 px-2 py-1 bg-black/80 text-white text-xs rounded">
          {screenSize} ({window.innerWidth}×{window.innerHeight})
        </div>
      )}
      {children}
    </div>
  );
});

/**
 * Responsive grid that adapts step size and layout
 */
export const SamplerResponsiveGrid = memo(function SamplerResponsiveGrid({
  children,
  className = ''
}) {
  const { screenSize } = useResponsiveLayout();

  const gridClasses = useMemo(() => {
    switch (screenSize) {
      case 'mobile':
        return 'gap-0.5'; // Tighter spacing on mobile
      case 'tablet':
        return 'gap-1';
      case 'desktop':
      default:
        return 'gap-1';
    }
  }, [screenSize]);

  return (
    <div className={`${gridClasses} ${className}`}>
      {children}
    </div>
  );
});

/**
 * Collapsible section for mobile optimization
 */
export const SamplerCollapsibleSection = memo(function SamplerCollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  alwaysExpanded = false,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { isSmallScreen } = useResponsiveLayout();

  // Always expanded on desktop or when specified
  const shouldShowCollapse = isSmallScreen && !alwaysExpanded;
  const actuallyExpanded = alwaysExpanded || isExpanded;

  return (
    <div className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className={`flex items-center justify-between p-4 ${
          shouldShowCollapse ? 'cursor-pointer hover:bg-white/5' : ''
        }`}
        onClick={shouldShowCollapse ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {shouldShowCollapse && (
          <div className="text-white/60">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        )}
      </div>

      {/* Content */}
      {actuallyExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
});

/**
 * Responsive transport controls layout
 */
export const SamplerResponsiveTransport = memo(function SamplerResponsiveTransport({
  transportControls,
  tapTempo,
  bankNavigation,
  className = ''
}) {
  const { screenSize } = useResponsiveLayout();

  if (screenSize === 'mobile') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Row 1: Transport Controls */}
        <div className="flex justify-center">
          {transportControls}
        </div>
        
        {/* Row 2: Tap Tempo and Bank Navigation */}
        <div className="flex items-center justify-between gap-4">
          {tapTempo}
          {bankNavigation}
        </div>
      </div>
    );
  }

  if (screenSize === 'tablet') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Row 1: Transport Controls centered */}
        <div className="flex justify-center">
          {transportControls}
        </div>
        
        {/* Row 2: Tap Tempo and Bank Navigation */}
        <div className="flex items-center justify-between">
          {tapTempo}
          {bankNavigation}
        </div>
      </div>
    );
  }

  // Desktop layout - single row
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {transportControls}
      <div className="flex items-center gap-4">
        {tapTempo}
        {bankNavigation}
      </div>
    </div>
  );
});

/**
 * Responsive step size calculator
 */
export const useResponsiveStepSize = () => {
  const { screenSize, dimensions } = useResponsiveLayout();

  return useMemo(() => {
    const baseSize = Math.min(dimensions.width / 20, dimensions.height / 25);
    
    switch (screenSize) {
      case 'mobile':
        return Math.max(24, Math.min(32, baseSize)); // 24-32px on mobile
      case 'tablet':
        return Math.max(32, Math.min(40, baseSize)); // 32-40px on tablet
      case 'desktop':
      default:
        return Math.max(40, Math.min(48, baseSize)); // 40-48px on desktop
    }
  }, [screenSize, dimensions]);
};

/**
 * Responsive text size utilities
 */
export const useResponsiveText = () => {
  const { screenSize } = useResponsiveLayout();

  return useMemo(() => ({
    title: screenSize === 'mobile' ? 'text-lg' : screenSize === 'tablet' ? 'text-xl' : 'text-2xl',
    subtitle: screenSize === 'mobile' ? 'text-sm' : 'text-base',
    body: screenSize === 'mobile' ? 'text-xs' : 'text-sm',
    caption: screenSize === 'mobile' ? 'text-xs' : 'text-xs',
    button: screenSize === 'mobile' ? 'text-sm' : 'text-base'
  }), [screenSize]);
};

/**
 * Screen size indicator component
 */
export const SamplerScreenSizeIndicator = memo(function SamplerScreenSizeIndicator({
  className = ''
}) {
  const { screenSize } = useResponsiveLayout();

  const icons = {
    mobile: Smartphone,
    tablet: Tablet,
    desktop: Monitor
  };

  const IconComponent = icons[screenSize];

  return (
    <div className={`flex items-center gap-2 text-white/60 text-xs ${className}`}>
      <IconComponent className="w-3 h-3" />
      <span className="capitalize">{screenSize}</span>
    </div>
  );
});

/**
 * Responsive breakpoint component
 */
export const SamplerBreakpoint = memo(function SamplerBreakpoint({
  mobile,
  tablet,
  desktop,
  className = ''
}) {
  const { screenSize } = useResponsiveLayout();

  let content = null;
  switch (screenSize) {
    case 'mobile':
      content = mobile;
      break;
    case 'tablet':
      content = tablet || mobile;
      break;
    case 'desktop':
    default:
      content = desktop || tablet || mobile;
      break;
  }

  return content ? <div className={className}>{content}</div> : null;
});

/**
 * Responsive spacing utilities
 */
export const useResponsiveSpacing = () => {
  const { screenSize } = useResponsiveLayout();

  return useMemo(() => ({
    xs: screenSize === 'mobile' ? 'gap-1' : screenSize === 'tablet' ? 'gap-1.5' : 'gap-2',
    sm: screenSize === 'mobile' ? 'gap-2' : screenSize === 'tablet' ? 'gap-3' : 'gap-4',
    md: screenSize === 'mobile' ? 'gap-3' : screenSize === 'tablet' ? 'gap-4' : 'gap-6',
    lg: screenSize === 'mobile' ? 'gap-4' : screenSize === 'tablet' ? 'gap-6' : 'gap-8',
    xl: screenSize === 'mobile' ? 'gap-6' : screenSize === 'tablet' ? 'gap-8' : 'gap-12'
  }), [screenSize]);
};

export default {
  useResponsiveLayout,
  SamplerResponsiveContainer,
  SamplerResponsiveGrid,
  SamplerCollapsibleSection,
  SamplerResponsiveTransport,
  useResponsiveStepSize,
  useResponsiveText,
  SamplerScreenSizeIndicator,
  SamplerBreakpoint,
  useResponsiveSpacing
};