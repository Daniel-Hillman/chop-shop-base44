/**
 * Demo for ZeroCrossingDetector and SmartSnapping functionality
 * Demonstrates requirement 3.3 and 3.4 implementation
 */

import { ZeroCrossingDetector } from './ZeroCrossingDetector.js';
import { SmartSnapping } from './SmartSnapping.js';

// Demo function to showcase zero-crossing detection
export function demoZeroCrossingDetection() {
  console.log('=== Zero-Crossing Detection Demo ===');
  
  const detector = new ZeroCrossingDetector({
    minDistance: 32,
    amplitudeThreshold: 0.01,
    analysisWindow: 64,
    maxSearchDistance: 0.1
  });

  // Create test audio data - sine wave with known zero-crossings
  const sampleRate = 44100;
  const frequency = 440; // A4 note
  const duration = 0.5; // 0.5 seconds
  const samples = new Float32Array(sampleRate * duration);
  
  console.log(`Creating ${frequency}Hz sine wave, ${duration}s duration, ${sampleRate}Hz sample rate`);
  
  for (let i = 0; i < samples.length; i++) {
    const time = i / sampleRate;
    samples[i] = Math.sin(2 * Math.PI * frequency * time) * 0.8; // 80% amplitude
  }

  // Find zero-crossings
  console.log('\nFinding zero-crossings...');
  const startTime = performance.now();
  const zeroCrossings = detector.findZeroCrossings(samples, sampleRate);
  const endTime = performance.now();
  
  console.log(`Found ${zeroCrossings.length} zero-crossings in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`Expected approximately ${2 * frequency * duration} zero-crossings`);
  
  // Show first few zero-crossings
  console.log('\nFirst 10 zero-crossings:');
  zeroCrossings.slice(0, 10).forEach((crossing, index) => {
    console.log(`  ${index + 1}: ${crossing.time.toFixed(6)}s (sample ${crossing.sampleIndex}, quality: ${crossing.quality.toFixed(3)})`);
  });

  // Test finding nearest zero-crossing
  console.log('\nTesting nearest zero-crossing search:');
  const testTimes = [0.001, 0.01, 0.1, 0.2, 0.3];
  
  testTimes.forEach(targetTime => {
    const nearest = detector.findNearestZeroCrossing(samples, sampleRate, targetTime, 0.01);
    if (nearest) {
      const distance = Math.abs(nearest.time - targetTime);
      console.log(`  Target: ${targetTime.toFixed(3)}s → Nearest: ${nearest.time.toFixed(6)}s (distance: ${(distance * 1000).toFixed(2)}ms)`);
    } else {
      console.log(`  Target: ${targetTime.toFixed(3)}s → No zero-crossing within tolerance`);
    }
  });

  // Test optimal cut points
  console.log('\nTesting optimal cut point detection:');
  const cutTests = [
    { start: 0.05, end: 0.15 },
    { start: 0.1, end: 0.2 },
    { start: 0.25, end: 0.35 }
  ];
  
  cutTests.forEach(({ start, end }) => {
    const result = detector.findOptimalCutPoints(samples, sampleRate, start, end);
    console.log(`  Original: ${start.toFixed(3)}s - ${end.toFixed(3)}s`);
    console.log(`  Optimized: ${result.optimizedStart.toFixed(6)}s - ${result.optimizedEnd.toFixed(6)}s`);
    console.log(`  Quality: ${result.quality}, Improvements: start=${result.startImprovement.toFixed(3)}, end=${result.endImprovement.toFixed(3)}`);
  });

  return {
    detector,
    samples,
    sampleRate,
    zeroCrossings,
    processingTime: endTime - startTime
  };
}

// Demo function to showcase smart snapping
export function demoSmartSnapping() {
  console.log('\n=== Smart Snapping Demo ===');
  
  const smartSnapping = new SmartSnapping({
    snapTolerance: 10,
    snapToleranceTime: 0.05,
    enableZeroCrossingSnap: true,
    enableChopBoundarySnap: true,
    enableGridSnap: true,
    showSnapIndicators: true
  });

  // Create test waveform data
  const sampleRate = 44100;
  const samples = new Float32Array(44100); // 1 second
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin(2 * Math.PI * 220 * i / sampleRate) * 0.7; // 220Hz
  }
  
  const waveformData = { samples, sampleRate, duration: 1.0 };
  smartSnapping.setWaveformData(waveformData);

  // Create test chops
  const chops = [
    { id: 'chop1', startTime: 0.1, endTime: 0.3 },
    { id: 'chop2', startTime: 0.5, endTime: 0.7 },
    { id: 'chop3', startTime: 0.8, endTime: 0.95 }
  ];
  smartSnapping.setChops(chops);

  console.log('Test chops:', chops.map(c => `${c.id}: ${c.startTime}s-${c.endTime}s`).join(', '));

  // Test snapping scenarios
  console.log('\nTesting snap scenarios:');
  const testCases = [
    { time: 0.105, description: 'Close to chop1 start' },
    { time: 0.295, description: 'Close to chop1 end' },
    { time: 0.4, description: 'Between chops' },
    { time: 0.505, description: 'Close to chop2 start' },
    { time: 0.25, description: 'Inside chop1' },
    { time: 1.02, description: 'Close to 1s grid line' }
  ];

  testCases.forEach(({ time, description }) => {
    const result = smartSnapping.applySnapping(time, 1000); // 1000 pixels per second
    
    console.log(`\n  ${description} (${time}s):`);
    if (result.wasSnapped) {
      console.log(`    ✓ Snapped to ${result.snappedTime.toFixed(6)}s`);
      console.log(`    Type: ${result.snapTarget.type}, Distance: ${(result.snapDistance * 1000).toFixed(2)}ms`);
    } else {
      console.log(`    ✗ No snap (stayed at ${result.snappedTime}s)`);
    }
    
    // Show available snap indicators
    const indicators = smartSnapping.getSnapIndicators(time, 1000);
    if (indicators.length > 0) {
      console.log(`    Available snaps: ${indicators.map(i => `${i.type}@${i.time.toFixed(3)}s`).join(', ')}`);
    }
  });

  // Test different snap type configurations
  console.log('\nTesting snap type configurations:');
  
  // Only chop boundaries
  smartSnapping.setSnapTypes({
    zeroCrossing: false,
    chopBoundary: true,
    grid: false
  });
  
  const chopOnlyResult = smartSnapping.applySnapping(0.105, 1000);
  console.log(`  Chop boundaries only: ${chopOnlyResult.wasSnapped ? 'snapped to ' + chopOnlyResult.snappedTime.toFixed(6) + 's' : 'no snap'}`);
  
  // Only zero-crossings
  smartSnapping.setSnapTypes({
    zeroCrossing: true,
    chopBoundary: false,
    grid: false
  });
  
  const zeroOnlyResult = smartSnapping.applySnapping(0.105, 1000);
  console.log(`  Zero-crossings only: ${zeroOnlyResult.wasSnapped ? 'snapped to ' + zeroOnlyResult.snappedTime.toFixed(6) + 's' : 'no snap'}`);

  // Performance test
  console.log('\nPerformance test:');
  const perfTestStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    smartSnapping.applySnapping(Math.random(), 1000);
  }
  const perfTestEnd = performance.now();
  console.log(`  1000 snap operations: ${(perfTestEnd - perfTestStart).toFixed(2)}ms (${((perfTestEnd - perfTestStart) / 1000).toFixed(3)}ms per operation)`);

  // Statistics
  const stats = smartSnapping.getSnapStatistics();
  console.log('\nSnap statistics:');
  console.log(`  Zero-crossings: ${stats.zeroCrossings}`);
  console.log(`  Chop boundaries: ${stats.chopBoundaries}`);
  console.log(`  Cache entries: ${stats.cacheStats.size}`);

  return {
    smartSnapping,
    waveformData,
    chops,
    testResults: testCases.map(({ time, description }) => ({
      time,
      description,
      result: smartSnapping.applySnapping(time, 1000)
    }))
  };
}

// Combined demo function
export function runZeroCrossingDemo() {
  console.log('🎵 Zero-Crossing Detection and Smart Snapping Demo 🎵\n');
  
  const zeroCrossingResults = demoZeroCrossingDetection();
  const smartSnappingResults = demoSmartSnapping();
  
  console.log('\n=== Demo Summary ===');
  console.log(`Zero-crossing detection: ${zeroCrossingResults.zeroCrossings.length} crossings found in ${zeroCrossingResults.processingTime.toFixed(2)}ms`);
  console.log(`Smart snapping: ${smartSnappingResults.testResults.filter(r => r.result.wasSnapped).length}/${smartSnappingResults.testResults.length} test cases snapped`);
  console.log('Demo completed successfully! ✅');
  
  return {
    zeroCrossing: zeroCrossingResults,
    smartSnapping: smartSnappingResults
  };
}

// Auto-run demo if this file is executed directly
if (typeof window !== 'undefined' && window.location?.search?.includes('demo=zero-crossing')) {
  runZeroCrossingDemo();
}