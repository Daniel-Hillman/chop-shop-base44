/**
 * Lazy-loaded SamplerDrumSequencer component for code splitting
 * This helps reduce the initial bundle size by loading the sequencer only when needed
 */

import { lazy, Suspense, Component } from 'react';

// Lazy load the main sampler component
const SamplerDrumSequencerComponent = lazy(() => 
  import('./SamplerDrumSequencer').then(module => ({
    default: module.default
  }))
);

// Loading fallback component
const SamplerLoadingFallback = () => (
  <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-4">
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-white/80">Loading Sampler Sequencer...</span>
      </div>
    </div>
  </div>
);

// Error boundary for lazy loading failures
class SamplerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Sampler lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <div className="text-red-400 text-center">
            <h3 className="font-semibold mb-2">Failed to load Sampler Sequencer</h3>
            <p className="text-sm text-red-300">Please refresh the page to try again.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lazy-loaded SamplerDrumSequencer with loading state and error boundary
 */
const LazySamplerDrumSequencer = (props) => {
  return (
    <SamplerErrorBoundary>
      <Suspense fallback={<SamplerLoadingFallback />}>
        <SamplerDrumSequencerComponent {...props} />
      </Suspense>
    </SamplerErrorBoundary>
  );
};

export default LazySamplerDrumSequencer;