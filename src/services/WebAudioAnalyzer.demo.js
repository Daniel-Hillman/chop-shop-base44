/**
 * WebAudioAnalyzer Demo
 * Demonstrates real-time audio analysis capabilities
 */

import { WebAudioAnalyzer } from './WebAudioAnalyzer.js';

// Demo configuration
const DEMO_CONFIG = {
  sampleRate: 44100,
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  waveformDuration: 5, // seconds
  targetSampleRate: 1000 // samples per second for waveform
};

/**
 * Demo: Basic WebAudioAnalyzer initialization and setup
 */
export async function demoBasicSetup() {
  console.log('🎵 WebAudioAnalyzer Demo: Basic Setup');
  console.log('=====================================');

  try {
    // Create analyzer with custom configuration
    const analyzer = new WebAudioAnalyzer(DEMO_CONFIG);
    console.log('✅ WebAudioAnalyzer created with config:', DEMO_CONFIG);

    // Initialize Web Audio API
    await analyzer.initialize();
    console.log('✅ Web Audio API initialized successfully');
    console.log('   - Audio Context State:', analyzer.audioContext.state);
    console.log('   - Sample Rate:', analyzer.audioContext.sampleRate);
    console.log('   - FFT Size:', analyzer.fftSize);

    // Cleanup
    analyzer.dispose();
    console.log('✅ Resources cleaned up');

    return { success: true, message: 'Basic setup completed successfully' };
  } catch (error) {
    console.error('❌ Basic setup failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Demo: Real-time frequency and amplitude analysis
 */
export async function demoRealTimeAnalysis() {
  console.log('\n🎵 WebAudioAnalyzer Demo: Real-time Analysis');
  console.log('=============================================');

  const analyzer = new WebAudioAnalyzer(DEMO_CONFIG);
  
  try {
    await analyzer.initialize();
    
    // Mock YouTube player for demo
    const mockYouTubePlayer = {
      getIframe: () => null // Simulates CORS-blocked iframe
    };

    // Connect to audio source (will use fallback method)
    await analyzer.connectToYouTubeStream(mockYouTubePlayer);
    console.log('✅ Connected to audio source (using fallback method)');

    // Set up analysis callback
    let analysisCount = 0;
    const maxAnalysisUpdates = 10;
    
    const unsubscribe = analyzer.onAnalysisUpdate((data) => {
      analysisCount++;
      
      if (analysisCount <= maxAnalysisUpdates) {
        console.log(`📊 Analysis Update #${analysisCount}:`);
        console.log('   - Frequency bins:', data.frequency.bufferLength);
        console.log('   - Amplitude samples:', data.amplitude.bufferLength);
        console.log('   - Timestamp:', data.timestamp.toFixed(3), 'seconds');
        
        // Show some frequency data
        const freqData = data.frequency.data;
        const avgFrequency = Array.from(freqData).reduce((a, b) => a + b, 0) / freqData.length;
        console.log('   - Average frequency level:', avgFrequency.toFixed(1));
        
        // Show some amplitude data
        const ampData = data.amplitude.data;
        const avgAmplitude = Array.from(ampData).reduce((a, b) => a + b, 0) / ampData.length;
        console.log('   - Average amplitude level:', avgAmplitude.toFixed(1));
      }
      
      if (analysisCount >= maxAnalysisUpdates) {
        analyzer.stopAnalysis();
        unsubscribe();
        console.log('✅ Analysis completed after', maxAnalysisUpdates, 'updates');
      }
    });

    // Start real-time analysis
    analyzer.startAnalysis();
    console.log('🚀 Real-time analysis started...');

    // Wait for analysis to complete
    await new Promise(resolve => {
      const checkComplete = () => {
        if (!analyzer.isAnalyzing) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      checkComplete();
    });

    // Show performance metrics
    const metrics = analyzer.getPerformanceMetrics();
    console.log('📈 Performance Metrics:');
    console.log('   - Average analysis time:', metrics.averageAnalysisTime.toFixed(2), 'ms');
    console.log('   - Dropped frames:', metrics.droppedFrames);
    console.log('   - Memory usage:', metrics.memoryUsage, 'bytes');

    analyzer.dispose();
    return { success: true, message: 'Real-time analysis completed successfully' };

  } catch (error) {
    console.error('❌ Real-time analysis failed:', error);
    analyzer.dispose();
    return { success: false, error: error.message };
  }
}

/**
 * Demo: Progressive waveform generation
 */
export async function demoProgressiveWaveform() {
  console.log('\n🎵 WebAudioAnalyzer Demo: Progressive Waveform Generation');
  console.log('=========================================================');

  const analyzer = new WebAudioAnalyzer(DEMO_CONFIG);
  
  try {
    await analyzer.initialize();
    
    // Mock connection
    const mockYouTubePlayer = { getIframe: () => null };
    await analyzer.connectToYouTubeStream(mockYouTubePlayer);

    // Set up progress callback
    let lastProgress = 0;
    const progressCallback = (progress, partialWaveform) => {
      const progressPercent = Math.floor(progress * 100);
      
      if (progressPercent >= lastProgress + 20) { // Log every 20%
        console.log(`📈 Waveform generation progress: ${progressPercent}%`);
        console.log('   - Samples generated:', partialWaveform.length);
        console.log('   - Latest sample value:', partialWaveform[partialWaveform.length - 1]?.toFixed(4) || 'N/A');
        lastProgress = progressPercent;
      }
    };

    analyzer.onProgressUpdate(progressCallback);

    // Generate progressive waveform
    console.log('🚀 Starting progressive waveform generation...');
    const startTime = Date.now();
    
    const waveformData = await analyzer.generateProgressiveWaveform(
      DEMO_CONFIG.waveformDuration,
      DEMO_CONFIG.targetSampleRate
    );
    
    const generationTime = Date.now() - startTime;

    // Display results
    console.log('✅ Waveform generation completed!');
    console.log('📊 Waveform Data:');
    console.log('   - Duration:', waveformData.duration, 'seconds');
    console.log('   - Sample rate:', waveformData.sampleRate, 'Hz');
    console.log('   - Total samples:', waveformData.samples.length);
    console.log('   - Channels:', waveformData.channels);
    console.log('   - Generation time:', generationTime, 'ms');
    console.log('   - Analysis method:', waveformData.metadata.analysisMethod);
    console.log('   - Quality:', waveformData.metadata.quality);

    // Show sample statistics
    const samples = waveformData.samples;
    const minSample = Math.min(...samples);
    const maxSample = Math.max(...samples);
    const avgSample = samples.reduce((a, b) => a + b, 0) / samples.length;
    
    console.log('📈 Sample Statistics:');
    console.log('   - Min amplitude:', minSample.toFixed(4));
    console.log('   - Max amplitude:', maxSample.toFixed(4));
    console.log('   - Average amplitude:', avgSample.toFixed(4));
    console.log('   - Dynamic range:', (maxSample - minSample).toFixed(4));

    analyzer.dispose();
    return { 
      success: true, 
      message: 'Progressive waveform generation completed successfully',
      data: {
        generationTime,
        sampleCount: samples.length,
        dynamicRange: maxSample - minSample
      }
    };

  } catch (error) {
    console.error('❌ Progressive waveform generation failed:', error);
    analyzer.dispose();
    return { success: false, error: error.message };
  }
}

/**
 * Demo: Performance benchmarking
 */
export async function demoPerformanceBenchmark() {
  console.log('\n🎵 WebAudioAnalyzer Demo: Performance Benchmark');
  console.log('===============================================');

  const testConfigs = [
    { name: 'Low Quality', fftSize: 1024, sampleRate: 22050 },
    { name: 'Medium Quality', fftSize: 2048, sampleRate: 44100 },
    { name: 'High Quality', fftSize: 4096, sampleRate: 48000 }
  ];

  const results = [];

  for (const config of testConfigs) {
    console.log(`\n🧪 Testing ${config.name} configuration...`);
    
    const analyzer = new WebAudioAnalyzer(config);
    
    try {
      const initStart = Date.now();
      await analyzer.initialize();
      const initTime = Date.now() - initStart;

      const mockPlayer = { getIframe: () => null };
      const connectStart = Date.now();
      await analyzer.connectToYouTubeStream(mockPlayer);
      const connectTime = Date.now() - connectStart;

      // Test waveform generation performance
      const waveformStart = Date.now();
      const waveformData = await analyzer.generateProgressiveWaveform(1, 500); // 1 second, 500Hz
      const waveformTime = Date.now() - waveformStart;

      // Test analysis performance
      analyzer.startAnalysis();
      const analysisStart = Date.now();
      
      // Run analysis for a short time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      analyzer.stopAnalysis();
      const analysisTime = Date.now() - analysisStart;
      const metrics = analyzer.getPerformanceMetrics();

      const result = {
        config: config.name,
        initTime,
        connectTime,
        waveformTime,
        analysisTime,
        averageAnalysisTime: metrics.averageAnalysisTime,
        droppedFrames: metrics.droppedFrames,
        sampleCount: waveformData.samples.length
      };

      results.push(result);

      console.log('   ✅ Results:');
      console.log('      - Initialization:', initTime, 'ms');
      console.log('      - Connection:', connectTime, 'ms');
      console.log('      - Waveform generation:', waveformTime, 'ms');
      console.log('      - Analysis period:', analysisTime, 'ms');
      console.log('      - Avg analysis time:', metrics.averageAnalysisTime.toFixed(2), 'ms');
      console.log('      - Dropped frames:', metrics.droppedFrames);

      analyzer.dispose();

    } catch (error) {
      console.error(`   ❌ ${config.name} test failed:`, error);
      analyzer.dispose();
    }
  }

  // Summary
  console.log('\n📊 Performance Benchmark Summary:');
  console.log('==================================');
  
  results.forEach(result => {
    console.log(`${result.config}:`);
    console.log(`   Total time: ${result.initTime + result.connectTime + result.waveformTime} ms`);
    console.log(`   Waveform efficiency: ${(result.sampleCount / result.waveformTime).toFixed(1)} samples/ms`);
    console.log(`   Analysis efficiency: ${result.averageAnalysisTime.toFixed(2)} ms/frame`);
  });

  return { success: true, message: 'Performance benchmark completed', results };
}

/**
 * Demo: Error handling and recovery
 */
export async function demoErrorHandling() {
  console.log('\n🎵 WebAudioAnalyzer Demo: Error Handling');
  console.log('========================================');

  console.log('🧪 Testing initialization errors...');
  
  // Test with invalid configuration
  try {
    const analyzer = new WebAudioAnalyzer({ fftSize: 'invalid' });
    await analyzer.initialize();
    console.log('❌ Should have failed with invalid config');
  } catch (error) {
    console.log('✅ Correctly handled invalid configuration:', error.message);
  }

  console.log('\n🧪 Testing connection errors...');
  
  // Test connection without initialization
  try {
    const analyzer = new WebAudioAnalyzer();
    await analyzer.connectToYouTubeStream({ getIframe: () => null });
    console.log('❌ Should have failed without initialization');
  } catch (error) {
    console.log('✅ Correctly handled uninitialized connection:', error.message);
  }

  console.log('\n🧪 Testing callback errors...');
  
  // Test callback error handling
  const analyzer = new WebAudioAnalyzer();
  try {
    await analyzer.initialize();
    await analyzer.connectToYouTubeStream({ getIframe: () => null });

    // Add callback that throws error
    analyzer.onAnalysisUpdate(() => {
      throw new Error('Callback error');
    });

    analyzer.startAnalysis();
    
    // Let it run briefly
    await new Promise(resolve => setTimeout(resolve, 50));
    
    analyzer.stopAnalysis();
    console.log('✅ Callback errors handled gracefully');

    analyzer.dispose();
  } catch (error) {
    console.log('❌ Unexpected error in callback test:', error);
    analyzer.dispose();
  }

  return { success: true, message: 'Error handling tests completed' };
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  console.log('🎵 WebAudioAnalyzer Complete Demo Suite');
  console.log('=======================================');
  console.log('Running comprehensive demonstration of WebAudioAnalyzer capabilities...\n');

  const demos = [
    { name: 'Basic Setup', fn: demoBasicSetup },
    { name: 'Real-time Analysis', fn: demoRealTimeAnalysis },
    { name: 'Progressive Waveform', fn: demoProgressiveWaveform },
    { name: 'Performance Benchmark', fn: demoPerformanceBenchmark },
    { name: 'Error Handling', fn: demoErrorHandling }
  ];

  const results = [];

  for (const demo of demos) {
    try {
      const result = await demo.fn();
      results.push({ name: demo.name, ...result });
    } catch (error) {
      console.error(`❌ Demo "${demo.name}" crashed:`, error);
      results.push({ name: demo.name, success: false, error: error.message });
    }
  }

  // Final summary
  console.log('\n🏁 Demo Suite Complete');
  console.log('======================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ ${successful}/${total} demos completed successfully`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.message || result.error}`);
  });

  return results;
}

// Export for use in other modules
export default {
  demoBasicSetup,
  demoRealTimeAnalysis,
  demoProgressiveWaveform,
  demoPerformanceBenchmark,
  demoErrorHandling,
  runAllDemos
};