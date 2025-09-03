/**
 * @fileoverview Main SamplerDrumSequencer Container Component
 * Orchestrates all sampler sequencer functionality and integrates with chopper state
 * Requirements: 1.1, 6.1, 6.4
 * Performance optimized with React.memo, debouncing, and efficient re-render strategies
 * Enhanced with responsive design, keyboard shortcuts, and improved user feedback
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import SamplerTransportControls from './SamplerTransportControls';
import SamplerSequencerGrid from './SamplerSequencerGrid';

import SamplerBankNavigation from './SamplerBankNavigation';
import SamplerTapTempo from './SamplerTapTempo';
import SamplerErrorBoundary from './SamplerErrorBoundary';
import SamplerErrorNotifications, { useSamplerErrorNotifications } from './SamplerErrorNotifications';
import { SamplerSequencerLoading } from './SamplerLoadingStates';
import { useSamplerKeyboardShortcuts, SamplerKeyboardHelp, SamplerKeyboardIndicator } from './SamplerKeyboardShortcuts';
import { SamplerResponsiveContainer, SamplerResponsiveTransport, useResponsiveLayout, useResponsiveText } from './SamplerResponsiveLayout';
import { useSamplerToast, SamplerToastContainer, useSamplerAudioFeedback, SamplerAudioFeedbackToggle, SamplerStatusIndicator } from './SamplerUserFeedback';
import { SamplerSequencerService } from '../../services/sequencer/SamplerSequencerService';
import { useDebounce, usePerformanceMonitor, useBatchedState } from '../../utils/samplerPerformanceUtils';

/**
 * Main container component for the sampler drum sequencer
 * Integrates all sub-components and manages sequencer state
 * Performance optimized with React.memo and efficient state management
 */
const SamplerDrumSequencer = memo(function SamplerDrumSequencer({
  chops = [],
  activeBank = 'A',
  youtubePlayer = null,
  onBankChange,
  onServiceRef,
  className = ''
}) {
  // Core sequencer state
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(140); // Faster default BPM for better loop feel
  const [currentStep, setCurrentStep] = useState(0);
  const [currentBank, setCurrentBank] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);
  const [degradationReason, setDegradationReason] = useState(null);

  // Error handling and user feedback
  const errorNotifications = useSamplerErrorNotifications();
  const toast = useSamplerToast();
  const audioFeedback = useSamplerAudioFeedback();

  // Pattern and chop state
  const [pattern, setPattern] = useState(null);
  const [bankChops, setBankChops] = useState([]);
  const [chopsPerBank, setChopsPerBank] = useState([0, 0, 0, 0]);

  // UI state
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [loadingStage, setLoadingStage] = useState('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);


  // Service reference
  const serviceRef = useRef(null);
  const initializationRef = useRef(false);

  // Responsive design and text sizing
  const { isSmallScreen } = useResponsiveLayout();
  const textSizes = useResponsiveText();

  // Performance monitoring
  usePerformanceMonitor('SamplerDrumSequencer', [chops, pattern, isPlaying, currentStep]);

  // Batched state updates for performance
  const setBatchedPattern = useBatchedState(setPattern, 16);

  // Debounced handlers for performance optimization

  const debouncedBpmChange = useDebounce((newBpm) => {
    if (!serviceRef.current) return;
    
    try {
      serviceRef.current.setBPM(newBpm);
      setBpm(newBpm);
    } catch (err) {
      console.error('BPM change error:', err);
      handleServiceError(err);
    }
  }, 300);

  // Convert activeBank letter to index
  const activeBankIndex = useMemo(() => {
    if (typeof activeBank === 'string') {
      return activeBank.charCodeAt(0) - 65; // A=0, B=1, etc.
    }
    return activeBank || 0;
  }, [activeBank]);

  // Initialize sequencer service
  useEffect(() => {
    if (!serviceRef.current && !initializationRef.current) {
      initializationRef.current = true;
      
      const initializeService = async () => {
        try {
          setLoadingStage('initializing');
          setLoadingProgress(10);
          
          const service = new SamplerSequencerService();
          serviceRef.current = service;
          setLoadingProgress(30);

          // Setup callbacks
          service.onStep((stepIndex, time, activeSteps) => {
            setCurrentStep(stepIndex);
          });

          service.onStateChange((state) => {
            setIsPlaying(state.isPlaying);
            setBpm(state.bpm);
            setCurrentStep(state.currentStep);
          });

          service.onError((error) => {
            console.error('Sequencer service error:', error);
            handleServiceError(error);
          });

          // Setup YouTube player degradation monitoring
          if (service.youtubeInterface) {
            service.youtubeInterface.onDegradation((event) => {
              if (event.type === 'degradation') {
                setIsDegraded(true);
                setDegradationReason(event.reason);
                errorNotifications.addYouTubeError(
                  `YouTube player degraded: ${event.reason}`,
                  false
                );
              } else if (event.type === 'recovery') {
                setIsDegraded(false);
                setDegradationReason(null);
                errorNotifications.addSuccess({
                  title: 'YouTube Player Recovered',
                  message: 'Full functionality restored'
                });
              }
            });
          }

          // Initialize with YouTube player and chops
          if (youtubePlayer) {
            setLoadingStage('connecting');
            setLoadingProgress(50);
            
            // Wait a bit for YouTube player to be fully ready
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const success = await service.initialize(youtubePlayer, chops);
            if (success) {
              setLoadingStage('loading_chops');
              setLoadingProgress(80);
              
              setIsInitialized(true);
              setPattern(service.getCurrentBankPattern());
              updateBankData(service);
              
              setLoadingStage('ready');
              setLoadingProgress(100);
              
              // Show success feedback
              toast.success('Sampler sequencer ready!', {
                title: 'Initialization Complete'
              });
              audioFeedback.feedback.success();
              
              // Expose service reference to parent
              if (onServiceRef) {
                onServiceRef(service);
              }
            } else {
              handleInitializationError('Failed to initialize sequencer service');
            }
          } else {
            // Initialize without YouTube player (safe mode from start)
            setLoadingStage('ready');
            setLoadingProgress(100);
            setIsInitialized(true);
            setIsDegraded(true);
            setDegradationReason('No YouTube player available');
            
            setPattern(service.getCurrentBankPattern());
            updateBankData(service);
            
            toast.info('Sequencer ready in safe mode', {
              title: 'Limited functionality - no video control'
            });
            
            if (onServiceRef) {
              onServiceRef(service);
            }
          }
        } catch (err) {
          console.error('Failed to create sequencer service:', err);
          handleInitializationError(`Failed to create sequencer service: ${err.message}`);
        }
      };

      initializeService();
    }

    // Cleanup on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
        
        // Clear service reference from parent
        if (onServiceRef) {
          onServiceRef(null);
        }
      }
      initializationRef.current = false;
    };
  }, [youtubePlayer]);

  // Update bank data helper
  const updateBankData = useCallback((service) => {
    if (!service) return;

    // Get chops for current bank
    const currentBankChops = service.getCurrentBankChops();
    setBankChops(currentBankChops);

    // Calculate chops per bank
    const chopsCount = [0, 0, 0, 0];
    chops.forEach(chop => {
      if (chop?.padId) {
        const bankIndex = chop.padId.charCodeAt(0) - 65;
        if (bankIndex >= 0 && bankIndex < 4) {
          chopsCount[bankIndex]++;
        }
      }
    });
    setChopsPerBank(chopsCount);
  }, [chops]);

  // Update chops when they change - enhanced with real-time integration
  useEffect(() => {
    if (serviceRef.current && isInitialized) {
      console.log('🔄 Updating chops data in sequencer:', chops.length, 'chops');
      
      // Update chops data with enhanced integration
      serviceRef.current.updateChopsData(chops);
      
      // Get the current bank pattern in the format expected by the grid
      const currentBankPattern = serviceRef.current.getCurrentBankPattern();
      console.log('🔄 Updated pattern after chops change:', currentBankPattern);
      setPattern(currentBankPattern);
      
      // Update bank data to reflect new assignments
      updateBankData(serviceRef.current);
      console.log('🎯 Updated bank chops:', serviceRef.current.getCurrentBankChops());
      
      // Log integration stats for debugging
      if (serviceRef.current.chopIntegration) {
        const stats = serviceRef.current.chopIntegration.getIntegrationStats();
        console.log('📊 Chop integration stats:', stats);
      }
    }
  }, [chops, isInitialized, updateBankData]);

  // Sync bank changes
  useEffect(() => {
    if (serviceRef.current && isInitialized && activeBankIndex !== currentBank) {
      serviceRef.current.switchBank(activeBankIndex);
      setCurrentBank(activeBankIndex);
      
      // Update pattern to show the new bank's data
      const updatedPattern = serviceRef.current.getCurrentBankPattern();
      setPattern(updatedPattern);
      
      updateBankData(serviceRef.current);
    }
  }, [activeBankIndex, currentBank, isInitialized]);

  // Transport control handlers
  const handlePlay = useCallback(async () => {
    if (!serviceRef.current || !isInitialized) return;

    try {
      const success = await serviceRef.current.start();
      if (success) {
        toast.info('Playback started');
        audioFeedback.feedback.play();
      } else {
        errorNotifications.addError({
          title: 'Playback Failed',
          message: 'Unable to start sequencer playback',
          canRetry: true
        });
        audioFeedback.feedback.error();
      }
    } catch (err) {
      console.error('Play error:', err);
      handleServiceError(err);
      audioFeedback.feedback.error();
    }
  }, [isInitialized, toast, audioFeedback]);

  const handleStop = useCallback(() => {
    if (!serviceRef.current) return;

    try {
      serviceRef.current.stop();
      setCurrentStep(0);
      toast.info('Playback stopped');
      audioFeedback.feedback.stop();
    } catch (err) {
      console.error('Stop error:', err);
      handleServiceError(err);
      audioFeedback.feedback.error();
    }
  }, [toast, audioFeedback]);

  const handleBpmChange = useCallback((newBpm) => {
    // Immediate UI update for responsiveness
    setBpm(newBpm);
    
    // Debounced service update to prevent excessive calls
    debouncedBpmChange(newBpm);
  }, [debouncedBpmChange]);

  // Grid interaction handlers with single/double click support
  const handleStepToggle = useCallback((trackIndex, stepIndex, newState) => {
    if (!serviceRef.current) return;
    
    try {
      // Handle special case for manual chop assignment
      if (trackIndex === 'ASSIGN_CHOPS') {
        if (serviceRef.current.chopIntegration) {
          serviceRef.current.chopIntegration.reassignAllChops();
          const updatedPattern = serviceRef.current.getCurrentBankPattern();
          setPattern(updatedPattern);
          updateBankData(serviceRef.current);
          toast.success('Chops assigned to tracks!');
          audioFeedback.feedback.success();
        }
        return;
      }
      
      // Handle special case for creating test chops
      if (trackIndex === 'CREATE_TEST_CHOPS') {
        const testChops = [];
        for (let i = 0; i < 4; i++) {
          testChops.push({
            padId: `A${i + 1}`,
            startTime: i * 10,
            endTime: (i * 10) + 5,
            color: '#06b6d4'
          });
        }
        
        // Update chops in the service
        if (serviceRef.current) {
          serviceRef.current.updateChopsData(testChops);
          const updatedPattern = serviceRef.current.getCurrentBankPattern();
          setPattern(updatedPattern);
          updateBankData(serviceRef.current);
          toast.success('Test chops created and assigned!');
          audioFeedback.feedback.success();
        }
        return;
      }
      
      // Set step to the new state
      serviceRef.current.setStep(trackIndex, stepIndex, newState);
      
      // Get updated pattern in the format expected by the grid
      const updatedPattern = serviceRef.current.getCurrentBankPattern();
      setPattern(updatedPattern);
      
      // Audio feedback for step toggle
      audioFeedback.feedback.stepToggle();
      
    } catch (err) {
      console.error('Step toggle error:', err);
      toast.error('Failed to toggle step');
      audioFeedback.feedback.error();
    }
  }, [audioFeedback, toast, bankChops, updateBankData]);

  // Bank navigation handlers
  const handleBankChange = useCallback((bankIndex) => {
    if (!serviceRef.current) return;

    try {
      serviceRef.current.switchBank(bankIndex);
      setCurrentBank(bankIndex);
      updateBankData(serviceRef.current);
      
      // User feedback
      const bankLetter = String.fromCharCode(65 + bankIndex);
      toast.info(`Switched to Bank ${bankLetter}`, { duration: 2000 });
      audioFeedback.feedback.bankChange();
      
      // Notify parent component
      onBankChange?.(bankLetter);
    } catch (err) {
      console.error('Bank change error:', err);
      handleServiceError(err);
      audioFeedback.feedback.error();
    }
  }, [onBankChange, updateBankData, toast, audioFeedback]);

  // Tap tempo handler
  const handleTempoCalculated = useCallback((calculatedBpm) => {
    handleBpmChange(calculatedBpm);
    toast.success(`Tempo set to ${calculatedBpm} BPM`, { duration: 2000 });
  }, [handleBpmChange, toast]);

  // Error handling methods
  const handleServiceError = useCallback((error) => {
    const errorMessage = error?.message || 'Unknown sequencer error';
    
    // Classify error type
    if (errorMessage.toLowerCase().includes('youtube')) {
      errorNotifications.addYouTubeError(errorMessage, true);
    } else if (errorMessage.toLowerCase().includes('timing')) {
      errorNotifications.addTimingError(errorMessage, true);
    } else if (errorMessage.toLowerCase().includes('pattern')) {
      errorNotifications.addPatternError(errorMessage, true);
    } else if (errorMessage.toLowerCase().includes('chop')) {
      errorNotifications.addChopError(errorMessage, true);
    } else if (errorMessage.toLowerCase().includes('network')) {
      errorNotifications.addNetworkError(errorMessage, true);
    } else {
      errorNotifications.addError({
        title: 'Sequencer Error',
        message: errorMessage,
        canRetry: true
      });
    }
  }, [errorNotifications]);

  const handleInitializationError = useCallback((message) => {
    errorNotifications.addError({
      title: 'Initialization Failed',
      message,
      canRetry: true,
      autoHide: false,
      actions: [{
        label: 'Refresh Page',
        handler: () => window.location.reload(),
        dismissAfter: true
      }]
    });
  }, [errorNotifications]);

  const handleDegradedMode = useCallback(() => {
    setIsDegraded(true);
    setDegradationReason('User requested safe mode');
    
    errorNotifications.addInfo({
      title: 'Safe Mode Enabled',
      message: 'Running with limited functionality for better stability',
      autoHide: false
    });
  }, [errorNotifications]);

  const handleErrorRetry = useCallback(async (errorId) => {
    try {
      // Attempt to recover based on current state
      if (!isInitialized && serviceRef.current) {
        // Try to reinitialize
        const success = await serviceRef.current.initialize(youtubePlayer, chops);
        if (success) {
          setIsInitialized(true);
          errorNotifications.addSuccess({
            title: 'Recovery Successful',
            message: 'Sequencer has been restored'
          });
        }
      } else if (isDegraded && serviceRef.current?.youtubeInterface) {
        // Try to recover from degraded mode
        const recovered = await serviceRef.current.youtubeInterface.forceRecovery();
        if (recovered) {
          setIsDegraded(false);
          setDegradationReason(null);
        }
      }
    } catch (error) {
      console.error('Error retry failed:', error);
      errorNotifications.addError({
        title: 'Recovery Failed',
        message: 'Unable to recover automatically. Try refreshing the page.',
        canRetry: false
      });
    }
  }, [isInitialized, isDegraded, youtubePlayer, chops, errorNotifications]);

  // Keyboard shortcuts integration
  useSamplerKeyboardShortcuts({
    onPlay: handlePlay,
    onStop: handleStop,
    onBpmChange: handleBpmChange,
    onBankChange: handleBankChange,
    onStepToggle: handleStepToggle,
    onTapTempo: handleTempoCalculated,
    isPlaying,
    currentBpm: bpm,
    currentBank,
    totalBanks: 2,
    isEnabled: isInitialized && !showKeyboardHelp
  });

  // Loading state with enhanced feedback
  if (!isInitialized) {
    return (
      <SamplerResponsiveContainer className={className}>
        <SamplerSequencerLoading
          progress={loadingProgress}
          stage={loadingStage}
        />
      </SamplerResponsiveContainer>
    );
  }

  return (
    <SamplerErrorBoundary
      onError={handleServiceError}
      onRetry={handleErrorRetry}
      onDegradedMode={handleDegradedMode}
      onReset={() => {
        // Reset component state
        setIsInitialized(false);
        setIsDegraded(false);
        setDegradationReason(null);
        errorNotifications.clearAll();
        
        // Reinitialize service
        if (serviceRef.current) {
          serviceRef.current.destroy();
          serviceRef.current = null;
        }
      }}
    >
      <div className="relative">
        {/* Error Notifications */}
        <SamplerErrorNotifications
          errors={errorNotifications.errors}
          onDismiss={errorNotifications.removeError}
          onRetry={handleErrorRetry}
          maxVisible={3}
          autoHideDelay={5000}
        />

        {/* Main Sequencer Interface */}
        <SamplerResponsiveContainer className={className}>
          <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex-1 min-w-0">
                <h2 className={`font-bold text-white ${textSizes.title}`}>
                  Sampler Drum Sequencer
                </h2>
                <div className={`text-white/60 ${textSizes.subtitle} flex items-center gap-2 flex-wrap`}>
                  <span>Sequence your YouTube chops • {chops.length} chops loaded</span>
                  {isDegraded && (
                    <button
                      onClick={async () => {
                        if (serviceRef.current?.youtubeInterface) {
                          const recovered = await serviceRef.current.youtubeInterface.forceRecovery();
                          if (recovered) {
                            toast.success('Safe mode disabled', { duration: 3000 });
                          } else {
                            toast.error('Could not exit safe mode', { duration: 3000 });
                          }
                        }
                      }}
                      className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded hover:bg-yellow-500/30 transition-colors cursor-pointer"
                      title="Click to exit safe mode"
                    >
                      Safe Mode ✕
                    </button>
                  )}
                </div>
              </div>
              
              {/* Status and Controls */}
              <div className="flex items-center gap-3">
                <SamplerStatusIndicator
                  status={isPlaying ? 'playing' : 'idle'}
                  pulse={isPlaying}
                />
                
                {!isSmallScreen && (
                  <div className={`text-white/60 ${textSizes.caption}`}>
                    Bank {String.fromCharCode(65 + currentBank)} • {chopsPerBank[currentBank]}/16 chops
                  </div>
                )}

                <SamplerAudioFeedbackToggle
                  isEnabled={audioFeedback.isEnabled}
                  onToggle={() => audioFeedback.setIsEnabled(!audioFeedback.isEnabled)}
                />

                <SamplerKeyboardIndicator
                  onShowHelp={() => setShowKeyboardHelp(true)}
                />

                {isDegraded && (
                  <button
                    onClick={async () => {
                      if (serviceRef.current?.youtubeInterface) {
                        const recovered = await serviceRef.current.youtubeInterface.forceRecovery();
                        if (recovered) {
                          toast.success('Safe mode disabled', { duration: 3000 });
                        } else {
                          toast.error('Could not exit safe mode', { duration: 3000 });
                        }
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
                    title="Click to exit safe mode"
                  >
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    Safe Mode (Click to exit)
                  </button>
                )}
              </div>
            </div>

            {/* Transport Controls */}
            <div className="p-4 border-b border-white/10">
              <SamplerResponsiveTransport
                transportControls={
                  <SamplerTransportControls
                    isPlaying={isPlaying}
                    bpm={bpm}
                    onPlay={handlePlay}
                    onStop={handleStop}
                    onBpmChange={handleBpmChange}
                  />
                }
                tapTempo={
                  <SamplerTapTempo
                    onTempoCalculated={handleTempoCalculated}
                    currentBpm={bpm}
                  />
                }
                bankNavigation={
                  <SamplerBankNavigation
                    currentBank={currentBank}
                    totalBanks={2}
                    onBankChange={handleBankChange}
                    chopsPerBank={chopsPerBank}
                  />
                }
              />
            </div>

            {/* Sequencer Grid */}
            <div className="p-4">
              <SamplerSequencerGrid
                pattern={pattern}
                chops={bankChops}
                currentStep={currentStep}
                isPlaying={isPlaying}
                onStepToggle={handleStepToggle}
              />
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between p-4 pt-2 border-t border-white/10 text-white/50 ${textSizes.caption}`}>
              <div className="flex-1 min-w-0">
                <span>Press Space to play/stop • Click grid steps to program patterns</span>
                {isDegraded && (
                  <span className="ml-2 text-yellow-400">
                    • Video control disabled in safe mode
                  </span>
                )}
              </div>
              {!isSmallScreen && (
                <div className="ml-4 flex-shrink-0">
                  {pattern ? `Pattern: ${pattern.name}` : 'No pattern loaded'}
                </div>
              )}
            </div>
          </div>
        </SamplerResponsiveContainer>
        {/* Toast Notifications */}
        <SamplerToastContainer
          toasts={toast.toasts}
          onRemove={toast.removeToast}
          position="top-right"
        />

        {/* Keyboard Help Overlay */}
        <SamplerKeyboardHelp
          isVisible={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
        />
      </div>


    </SamplerErrorBoundary>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo optimization
  return (
    prevProps.chops === nextProps.chops &&
    prevProps.activeBank === nextProps.activeBank &&
    prevProps.youtubePlayer === nextProps.youtubePlayer &&
    prevProps.className === nextProps.className &&
    prevProps.onBankChange === nextProps.onBankChange &&
    prevProps.onServiceRef === nextProps.onServiceRef
  );
});

export default SamplerDrumSequencer;