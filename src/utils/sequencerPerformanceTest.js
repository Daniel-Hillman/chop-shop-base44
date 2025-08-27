/**
 * Simple performance testing utilities for the sequencer
 * Helps measure UI response times and identify bottlenecks
 */

export class SequencerPerformanceTest {
  constructor() {
    this.measurements = [];
  }

  /**
   * Measure the time between a user action and visual feedback
   * @param {string} actionName - Name of the action being measured
   * @param {Function} action - The action to perform
   * @returns {Promise<number>} Time in milliseconds
   */
  async measureUIResponse(actionName, action) {
    const startTime = performance.now();
    
    // Perform the action
    await action();
    
    // Wait for next frame to ensure DOM updates
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.measurements.push({
      action: actionName,
      duration,
      timestamp: Date.now()
    });
    
    console.log(`${actionName}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getStats() {
    if (this.measurements.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0 };
    }

    const durations = this.measurements.map(m => m.duration);
    const average = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      count: this.measurements.length,
      average: parseFloat(average.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      measurements: this.measurements
    };
  }

  /**
   * Clear all measurements
   */
  clear() {
    this.measurements = [];
  }

  /**
   * Log performance report to console
   */
  logReport() {
    const stats = this.getStats();
    console.group('Sequencer Performance Report');
    console.log(`Total measurements: ${stats.count}`);
    console.log(`Average response time: ${stats.average}ms`);
    console.log(`Fastest response: ${stats.min}ms`);
    console.log(`Slowest response: ${stats.max}ms`);
    
    if (stats.average > 16) {
      console.warn('⚠️ Average response time exceeds 16ms (60fps threshold)');
    } else {
      console.log('✅ Performance looks good!');
    }
    
    console.groupEnd();
  }
}

// Global instance for easy access
export const sequencerPerf = new SequencerPerformanceTest();

// Helper function to test step toggle performance
export const testStepTogglePerformance = async (toggleFunction, trackId, stepIndex) => {
  return sequencerPerf.measureUIResponse(
    `Step Toggle (${trackId}-${stepIndex})`,
    () => toggleFunction(trackId, stepIndex)
  );
};

// Helper function to test mute/solo performance
export const testMuteTogglePerformance = async (muteFunction, trackId) => {
  return sequencerPerf.measureUIResponse(
    `Mute Toggle (${trackId})`,
    () => muteFunction(trackId)
  );
};

export const testSoloTogglePerformance = async (soloFunction, trackId) => {
  return sequencerPerf.measureUIResponse(
    `Solo Toggle (${trackId})`,
    () => soloFunction(trackId)
  );
};