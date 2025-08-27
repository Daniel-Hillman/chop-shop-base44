/**
 * AudioScheduler - Precise audio scheduling service for the drum sequencer
 * 
 * Provides sample-accurate scheduling using Web Audio API with lookahead
 * scheduling to prevent timing drift and maintain stable BPM.
 */

import sequencerPerformanceMonitor from './SequencerPerformanceMonitor.js';

export class AudioScheduler {
  constructor(audioContext) {
    this.audioContext = audioContext;
    
    // Timing configuration
    this.lookahead = 25.0; // 25ms lookahead for scheduling
    this.scheduleAheadTime = 0.1; // 100ms scheduling window
    this.timerWorker = null;
    this.isRunning = false;
    
    // Scheduling state
    this.nextStepTime = 0;
    this.currentStep = 0;
    this.bpm = 120;
    this.swing = 0; // 0-100%
    this.stepResolution = 16; // 16th notes by default
    
    // Absolute timing reference to prevent drift
    this.startTime = 0;
    this.stepCount = 0;
    
    // Callbacks
    this.onStep = null; // Callback for step events
    this.onScheduleNote = null; // Callback for note scheduling
    
    // Performance tracking
    this.schedulingStats = {
      totalScheduled: 0,
      averageLatency: 0,
      maxLatency: 0
    };
  }

  /**
   * Initialize the scheduler with Web Worker for precise timing
   */
  initialize() {
    if (!this.audioContext) {
      throw new Error('AudioContext is required for AudioScheduler');
    }

    // Create a simple timer worker for precise scheduling
    const workerScript = `
      let timerID = null;
      let isRunning = false;
      const TIMER_INTERVAL = 25; // Fixed 25ms for stability
      
      self.onmessage = function(e) {
        if (e.data === "start" && !isRunning) {
          isRunning = true;
          timerID = setInterval(() => {
            if (isRunning) {
              self.postMessage("tick");
            }
          }, TIMER_INTERVAL);
        } else if (e.data === "stop") {
          isRunning = false;
          if (timerID) {
            clearInterval(timerID);
            timerID = null;
          }
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    this.timerWorker = new Worker(URL.createObjectURL(blob));
    
    this.timerWorker.onmessage = (e) => {
      if (e.data === "tick") {
        this.scheduler();
      }
    };
  }

  /**
   * Start the scheduler
   */
  start() {
    if (!this.timerWorker) {
      this.initialize();
    }

    this.isRunning = true;
    
    // Initialize absolute timing reference
    this.startTime = this.audioContext.currentTime + 0.005; // 5ms buffer
    this.nextStepTime = this.startTime;
    this.currentStep = 0;
    this.stepCount = 0;
    
    this.timerWorker.postMessage("start");
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.isRunning = false;
    if (this.timerWorker) {
      this.timerWorker.postMessage("stop");
    }
    this.currentStep = 0;
    this.nextStepTime = 0;
  }

  /**
   * Pause the scheduler (maintains current position)
   */
  pause() {
    this.isRunning = false;
    if (this.timerWorker) {
      this.timerWorker.postMessage("stop");
    }
  }

  /**
   * Resume the scheduler from current position
   */
  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      
      // Recalculate timing from current position to maintain sync
      const currentTime = this.audioContext.currentTime + 0.005; // 5ms buffer
      const stepDuration = this.getStepDuration();
      
      // Adjust start time to maintain current step position
      this.startTime = currentTime - (this.stepCount * stepDuration);
      this.nextStepTime = currentTime;
      
      if (this.timerWorker) {
        this.timerWorker.postMessage("start");
      }
    }
  }

  /**
   * Set BPM and recalculate timing
   */
  setBPM(bpm) {
    if (bpm < 60 || bpm > 200) {
      throw new Error('BPM must be between 60 and 200');
    }
    
    const oldBPM = this.bpm;
    this.bpm = bpm;
    
    // Log BPM changes for debugging
    if (oldBPM !== bpm && this.isRunning) {
      console.log(`AudioScheduler: BPM changed from ${oldBPM} to ${bpm}`);
    }
    
    // If running, recalculate timing to maintain sync
    if (this.isRunning && oldBPM !== bpm) {
      const currentTime = this.audioContext.currentTime;
      const newStepDuration = this.getStepDuration();
      
      // Recalculate start time to maintain current position
      this.startTime = currentTime - (this.stepCount * newStepDuration);
      this.nextStepTime = currentTime;
    }
  }

  /**
   * Set swing amount (0-100%)
   */
  setSwing(swing) {
    if (swing < 0 || swing > 100) {
      throw new Error('Swing must be between 0 and 100');
    }
    
    // Log swing changes for debugging
    if (this.swing !== swing && this.isRunning) {
      console.log(`AudioScheduler: Swing changed from ${this.swing}% to ${swing}%`);
    }
    
    this.swing = swing;
  }

  /**
   * Set step resolution (8, 16, 32, or 64)
   */
  setStepResolution(resolution) {
    if (![8, 16, 32, 64].includes(resolution)) {
      throw new Error('Step resolution must be 8, 16, 32, or 64');
    }
    this.stepResolution = resolution;
  }

  /**
   * Calculate the time between steps based on BPM and resolution
   */
  getStepDuration() {
    // Calculate seconds per beat
    const secondsPerBeat = 60.0 / this.bpm;
    
    // Calculate step duration based on resolution
    // 16th notes = 1/4 of a beat, 8th notes = 1/2 of a beat, etc.
    const stepsPerBeat = this.stepResolution / 4;
    return secondsPerBeat / stepsPerBeat;
  }

  /**
   * Calculate swing timing for a step
   */
  calculateSwingTiming(stepTime, stepIndex) {
    if (this.swing === 0) {
      return stepTime;
    }

    // Apply swing to off-beats (odd-numbered steps)
    if (stepIndex % 2 === 1) {
      const swingAmount = this.swing / 100;
      const stepDuration = this.getStepDuration();
      const maxSwingDelay = stepDuration * 0.3; // Max 30% of step duration
      return stepTime + (maxSwingDelay * swingAmount);
    }

    return stepTime;
  }

  /**
   * Apply randomization to timing and velocity
   */
  applyRandomization(timing, velocity, randomizationSettings) {
    let adjustedTiming = timing;
    let adjustedVelocity = velocity;

    if (randomizationSettings.timing && randomizationSettings.timing.enabled) {
      const timingAmount = randomizationSettings.timing.amount / 100;
      const stepDuration = this.getStepDuration();
      const maxTimingVariation = stepDuration * 0.1; // Max 10% variation
      const timingVariation = (Math.random() - 0.5) * 2 * maxTimingVariation * timingAmount;
      adjustedTiming += timingVariation;
    }

    if (randomizationSettings.velocity && randomizationSettings.velocity.enabled) {
      const velocityAmount = randomizationSettings.velocity.amount / 100;
      const velocityVariation = (Math.random() - 0.5) * 2 * velocityAmount;
      adjustedVelocity = Math.max(0.1, Math.min(1.0, velocity + velocityVariation));
    }

    return {
      timing: adjustedTiming,
      velocity: adjustedVelocity
    };
  }

  /**
   * Schedule a note to be played at a specific time
   */
  scheduleNote(time, sample, velocity = 1.0, randomizationSettings = {}, trackId = null) {
    const startTime = performance.now();

    try {
      // Apply randomization
      const adjusted = this.applyRandomization(time, velocity, randomizationSettings);

      // Call the note scheduling callback
      if (this.onScheduleNote) {
        this.onScheduleNote(adjusted.timing, sample, adjusted.velocity, trackId);
      }

      // Update performance stats
      const latency = performance.now() - startTime;
      this.updateSchedulingStats(latency);
      
      // Record performance metrics
      sequencerPerformanceMonitor.baseMonitor.recordMetric('audio_scheduler_note', latency, {
        trackId,
        velocity: adjusted.velocity,
        hasRandomization: Object.keys(randomizationSettings).length > 0,
        timingAdjustment: adjusted.timing - time
      });

    } catch (error) {
      console.error('Error scheduling note:', error);
      sequencerPerformanceMonitor.baseMonitor.recordMetric('audio_scheduler_error', 0, {
        error: error.message,
        trackId
      });
    }
  }

  /**
   * Main scheduler loop - called by timer worker
   */
  scheduler() {
    if (!this.isRunning) return;

    const schedulerStart = performance.now();
    const currentTime = this.audioContext.currentTime;

    // Look ahead and schedule notes using absolute timing
    while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
      // Calculate swing timing for audio playback only
      const audioPlayTime = this.calculateSwingTiming(this.nextStepTime, this.currentStep);

      // Trigger step callback
      if (this.onStep) {
        this.onStep(this.currentStep, audioPlayTime);
      }

      // Advance to next step using absolute timing to prevent drift
      this.advanceStepAbsolute();
    }
    
    // Record scheduler loop performance
    const schedulerLatency = performance.now() - schedulerStart;
    if (schedulerLatency > 1) { // Only record if significant
      sequencerPerformanceMonitor.baseMonitor.recordMetric('audio_scheduler_loop', schedulerLatency, {
        currentStep: this.currentStep,
        nextStepTime: this.nextStepTime,
        audioContextTime: currentTime
      });
    }
  }

  /**
   * Advance to the next step using absolute timing to prevent drift
   */
  advanceStepAbsolute() {
    // Increment step counters
    this.stepCount++;
    this.currentStep = (this.currentStep + 1) % this.stepResolution;
    
    // Calculate next step time from absolute start time
    // This prevents accumulating timing errors
    const stepDuration = this.getStepDuration();
    this.nextStepTime = this.startTime + (this.stepCount * stepDuration);
  }

  /**
   * Update scheduling performance statistics
   */
  updateSchedulingStats(latency) {
    this.schedulingStats.totalScheduled++;
    
    // Update average latency
    const total = this.schedulingStats.averageLatency * (this.schedulingStats.totalScheduled - 1);
    this.schedulingStats.averageLatency = (total + latency) / this.schedulingStats.totalScheduled;
    
    // Update max latency
    if (latency > this.schedulingStats.maxLatency) {
      this.schedulingStats.maxLatency = latency;
    }
  }

  /**
   * Get current scheduling statistics
   */
  getSchedulingStats() {
    return { ...this.schedulingStats };
  }

  /**
   * Reset scheduling statistics
   */
  resetSchedulingStats() {
    this.schedulingStats = {
      totalScheduled: 0,
      averageLatency: 0,
      maxLatency: 0
    };
  }

  /**
   * Get current step position
   */
  getCurrentStep() {
    return this.currentStep;
  }

  /**
   * Get next step time
   */
  getNextStepTime() {
    return this.nextStepTime;
  }

  /**
   * Check if scheduler is running
   */
  getIsRunning() {
    return this.isRunning;
  }

  /**
   * Get timing diagnostics for debugging
   */
  getTimingDiagnostics() {
    const currentTime = this.audioContext.currentTime;
    const expectedStepTime = this.startTime + (this.stepCount * this.getStepDuration());
    const timingDrift = Math.abs(this.nextStepTime - expectedStepTime);
    
    return {
      isRunning: this.isRunning,
      currentStep: this.currentStep,
      stepCount: this.stepCount,
      bpm: this.bpm,
      swing: this.swing,
      currentTime: currentTime,
      nextStepTime: this.nextStepTime,
      expectedStepTime: expectedStepTime,
      timingDrift: timingDrift,
      stepDuration: this.getStepDuration(),
      startTime: this.startTime
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();
    if (this.timerWorker) {
      this.timerWorker.terminate();
      this.timerWorker = null;
    }
  }
}

export default AudioScheduler;