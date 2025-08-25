/**
 * Web Worker for background waveform processing
 * Handles intensive audio analysis without blocking the main thread
 * Requirements: 7.2, 7.3
 */

// Worker state
let isProcessing = false;
let currentTask = null;
let performanceMetrics = {
  tasksCompleted: 0,
  averageProcessingTime: 0,
  memoryUsage: 0,
  errors: 0
};

// Processing queue for batch operations
const taskQueue = [];
let isProcessingQueue = false;

/**
 * Main message handler for worker communication
 */
self.onmessage = async function(event) {
  const { type, data, taskId } = event.data;
  
  try {
    switch (type) {
      case 'ANALYZE_WAVEFORM':
        handleWaveformAnalysis(data, taskId);
        break;
        
      case 'GENERATE_PROGRESSIVE':
        await handleProgressiveGeneration(data, taskId);
        break;
        
      case 'DOWNSAMPLE_AUDIO':
        handleDownsampling(data, taskId);
        break;
        
      case 'DETECT_ZERO_CROSSINGS':
        handleZeroCrossingDetection(data, taskId);
        break;
        
      case 'CALCULATE_PEAKS':
        handlePeakCalculation(data, taskId);
        break;
        
      case 'BATCH_PROCESS':
        handleBatchProcessing(data, taskId);
        break;
        
      case 'GET_PERFORMANCE_METRICS':
        sendPerformanceMetrics(taskId);
        break;
        
      case 'CLEANUP_MEMORY':
        handleMemoryCleanup(taskId);
        break;
        
      default:
        sendError(`Unknown task type: ${type}`, taskId);
    }
  } catch (error) {
    performanceMetrics.errors++;
    sendError(error.message, taskId);
  }
};

/**
 * Handle waveform analysis from audio buffer
 */
function handleWaveformAnalysis(data, taskId) {
  const startTime = performance.now();
  isProcessing = true;
  currentTask = { type: 'ANALYZE_WAVEFORM', taskId, startTime };
  
  try {
    const { audioBuffer, options = {} } = data;
    const {
      targetSampleRate = 1000,
      channels = 1,
      quality = 'high'
    } = options;
    
    if (!audioBuffer || !audioBuffer.length) {
      throw new Error('Invalid audio buffer provided');
    }
    
    // Convert audio buffer to waveform data
    const waveformData = analyzeAudioBuffer(audioBuffer, {
      targetSampleRate,
      channels,
      quality
    });
    
    // Calculate additional analysis data
    const analysisData = calculateAnalysisData(waveformData, options);
    
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    sendResult({
      waveformData,
      analysisData,
      processingTime,
      memoryUsage: getMemoryUsage()
    }, taskId);
    
  } catch (error) {
    sendError(error.message, taskId);
  } finally {
    isProcessing = false;
    currentTask = null;
  }
}

/**
 * Handle progressive waveform generation
 */
async function handleProgressiveGeneration(data, taskId) {
  const startTime = performance.now();
  isProcessing = true;
  currentTask = { type: 'GENERATE_PROGRESSIVE', taskId, startTime };
  
  try {
    const { audioData, chunkSize = 1024, progressCallback = true } = data;
    
    if (!audioData || !audioData.length) {
      throw new Error('Invalid audio data provided');
    }
    
    const totalChunks = Math.ceil(audioData.length / chunkSize);
    const waveformChunks = [];
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkStart = i * chunkSize;
      const chunkEnd = Math.min(chunkStart + chunkSize, audioData.length);
      const chunk = audioData.slice(chunkStart, chunkEnd);
      
      // Process chunk
      const processedChunk = processAudioChunk(chunk, i);
      waveformChunks.push(processedChunk);
      
      // Send progress update
      if (progressCallback && i % 10 === 0) {
        sendProgress({
          progress: (i + 1) / totalChunks,
          chunksCompleted: i + 1,
          totalChunks,
          currentChunk: processedChunk
        }, taskId);
      }
      
      // Yield control periodically to prevent blocking
      if (i % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Combine chunks into final waveform
    const finalWaveform = combineWaveformChunks(waveformChunks);
    
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    sendResult({
      waveformData: finalWaveform,
      chunks: waveformChunks.length,
      processingTime,
      memoryUsage: getMemoryUsage()
    }, taskId);
    
  } catch (error) {
    sendError(error.message, taskId);
  } finally {
    isProcessing = false;
    currentTask = null;
  }
}

/**
 * Handle audio downsampling for performance optimization
 */
function handleDownsampling(data, taskId) {
  const startTime = performance.now();
  
  try {
    const { audioData, originalSampleRate, targetSampleRate, method = 'linear' } = data;
    
    if (!audioData || originalSampleRate <= 0 || targetSampleRate <= 0) {
      throw new Error('Invalid downsampling parameters');
    }
    
    const downsampledData = downsampleAudio(audioData, originalSampleRate, targetSampleRate, method);
    
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    sendResult({
      downsampledData,
      originalLength: audioData.length,
      newLength: downsampledData.length,
      compressionRatio: audioData.length / downsampledData.length,
      processingTime
    }, taskId);
    
  } catch (error) {
    sendError(error.message, taskId);
  }
}

/**
 * Handle zero-crossing detection for smart snapping
 */
function handleZeroCrossingDetection(data, taskId) {
  const startTime = performance.now();
  
  try {
    const { audioData, sampleRate, tolerance = 0.01 } = data;
    
    if (!audioData || !sampleRate) {
      throw new Error('Invalid zero-crossing detection parameters');
    }
    
    const zeroCrossings = detectZeroCrossings(audioData, sampleRate, tolerance);
    
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    sendResult({
      zeroCrossings,
      count: zeroCrossings.length,
      processingTime
    }, taskId);
    
  } catch (error) {
    sendError(error.message, taskId);
  }
}

/**
 * Handle peak calculation for waveform visualization
 */
function handlePeakCalculation(data, taskId) {
  const startTime = performance.now();
  
  try {
    const { audioData, windowSize = 1024, method = 'rms' } = data;
    
    if (!audioData || windowSize <= 0) {
      throw new Error('Invalid peak calculation parameters');
    }
    
    const peaks = calculatePeaks(audioData, windowSize, method);
    
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    sendResult({
      peaks,
      windowSize,
      method,
      processingTime
    }, taskId);
    
  } catch (error) {
    sendError(error.message, taskId);
  }
}

/**
 * Handle batch processing of multiple tasks
 */
async function handleBatchProcessing(data, taskId) {
  const startTime = performance.now();
  isProcessingQueue = true;
  
  try {
    const { tasks, options = {} } = data;
    const { maxConcurrent = 1, progressCallback = true } = options;
    
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks must be an array');
    }
    
    const results = [];
    const errors = [];
    
    // Process tasks in batches
    for (let i = 0; i < tasks.length; i += maxConcurrent) {
      const batch = tasks.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(task => processBatchTask(task));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            taskIndex: i + index,
            error: result.reason
          });
        }
      });
      
      // Send progress update
      if (progressCallback) {
        sendProgress({
          progress: (i + batch.length) / tasks.length,
          completed: i + batch.length,
          total: tasks.length,
          errors: errors.length
        }, taskId);
      }
    }
    
    const processingTime = performance.now() - startTime;
    updatePerformanceMetrics(processingTime);
    
    sendResult({
      results,
      errors,
      totalTasks: tasks.length,
      successCount: results.length,
      errorCount: errors.length,
      processingTime
    }, taskId);
    
  } catch (error) {
    sendError(error.message, taskId);
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Process a single task in batch mode
 */
async function processBatchTask(task) {
  return new Promise((resolve, reject) => {
    try {
      switch (task.type) {
        case 'analyze':
          resolve(analyzeAudioBuffer(task.data.audioBuffer, task.options));
          break;
        case 'downsample':
          resolve(downsampleAudio(task.data.audioData, task.data.originalSampleRate, task.data.targetSampleRate));
          break;
        case 'peaks':
          resolve(calculatePeaks(task.data.audioData, task.data.windowSize, task.data.method));
          break;
        default:
          reject(new Error(`Unknown batch task type: ${task.type}`));
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Handle memory cleanup
 */
function handleMemoryCleanup(taskId) {
  try {
    // Clear any cached data
    if (typeof gc === 'function') {
      gc(); // Force garbage collection if available
    }
    
    // Reset performance metrics
    performanceMetrics = {
      tasksCompleted: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      errors: 0
    };
    
    sendResult({
      cleaned: true,
      memoryUsage: getMemoryUsage()
    }, taskId);
    
  } catch (error) {
    sendError(error.message, taskId);
  }
}

// Core processing functions

/**
 * Analyze audio buffer and generate waveform data
 */
function analyzeAudioBuffer(audioBuffer, options) {
  const { targetSampleRate, channels, quality } = options;
  const inputLength = audioBuffer.length;
  const outputLength = Math.floor(inputLength * targetSampleRate / 44100); // Assume 44.1kHz input
  
  const waveformData = new Float32Array(outputLength);
  const step = inputLength / outputLength;
  
  for (let i = 0; i < outputLength; i++) {
    const sourceIndex = Math.floor(i * step);
    
    if (quality === 'high') {
      // Use RMS for better quality
      let sum = 0;
      const windowSize = Math.max(1, Math.floor(step));
      for (let j = 0; j < windowSize && sourceIndex + j < inputLength; j++) {
        const sample = audioBuffer[sourceIndex + j] || 0;
        sum += sample * sample;
      }
      waveformData[i] = Math.sqrt(sum / windowSize);
    } else {
      // Simple sampling for performance
      waveformData[i] = Math.abs(audioBuffer[sourceIndex] || 0);
    }
  }
  
  return {
    samples: waveformData,
    sampleRate: targetSampleRate,
    duration: outputLength / targetSampleRate,
    channels: channels,
    metadata: {
      analysisMethod: 'web-worker',
      quality: quality,
      generatedAt: Date.now(),
      originalLength: inputLength,
      compressionRatio: inputLength / outputLength
    }
  };
}

/**
 * Calculate additional analysis data
 */
function calculateAnalysisData(waveformData, options) {
  const { samples } = waveformData;
  
  // Calculate RMS
  let rmsSum = 0;
  for (let i = 0; i < samples.length; i++) {
    rmsSum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(rmsSum / samples.length);
  
  // Calculate peak
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  
  // Calculate dynamic range
  const sortedSamples = Array.from(samples).sort((a, b) => Math.abs(b) - Math.abs(a));
  const dynamicRange = Math.abs(sortedSamples[0]) / Math.abs(sortedSamples[Math.floor(sortedSamples.length * 0.9)]);
  
  return {
    rms,
    peak,
    dynamicRange,
    silenceThreshold: rms * 0.1,
    averageAmplitude: samples.reduce((sum, sample) => sum + Math.abs(sample), 0) / samples.length
  };
}

/**
 * Process audio chunk for progressive generation
 */
function processAudioChunk(chunk, chunkIndex) {
  const processedChunk = new Float32Array(chunk.length);
  
  for (let i = 0; i < chunk.length; i++) {
    // Apply basic processing (normalize, filter, etc.)
    processedChunk[i] = Math.max(-1, Math.min(1, chunk[i]));
  }
  
  return {
    index: chunkIndex,
    data: processedChunk,
    length: chunk.length,
    rms: calculateRMS(processedChunk),
    peak: calculatePeak(processedChunk)
  };
}

/**
 * Combine waveform chunks into final result
 */
function combineWaveformChunks(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedData = new Float32Array(totalLength);
  
  let offset = 0;
  for (const chunk of chunks) {
    combinedData.set(chunk.data, offset);
    offset += chunk.length;
  }
  
  return {
    samples: combinedData,
    sampleRate: 1000, // Default for progressive generation
    duration: totalLength / 1000,
    channels: 1,
    chunks: chunks.length,
    metadata: {
      analysisMethod: 'progressive-worker',
      quality: 'medium',
      generatedAt: Date.now(),
      chunkCount: chunks.length
    }
  };
}

/**
 * Downsample audio data
 */
function downsampleAudio(audioData, originalSampleRate, targetSampleRate, method) {
  const ratio = originalSampleRate / targetSampleRate;
  const outputLength = Math.floor(audioData.length / ratio);
  const downsampledData = new Float32Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    const sourceIndex = i * ratio;
    
    if (method === 'linear') {
      // Linear interpolation
      const index1 = Math.floor(sourceIndex);
      const index2 = Math.min(index1 + 1, audioData.length - 1);
      const fraction = sourceIndex - index1;
      
      downsampledData[i] = audioData[index1] * (1 - fraction) + audioData[index2] * fraction;
    } else {
      // Simple nearest neighbor
      downsampledData[i] = audioData[Math.floor(sourceIndex)];
    }
  }
  
  return downsampledData;
}

/**
 * Detect zero crossings in audio data
 */
function detectZeroCrossings(audioData, sampleRate, tolerance) {
  const zeroCrossings = [];
  
  for (let i = 1; i < audioData.length; i++) {
    const prev = audioData[i - 1];
    const curr = audioData[i];
    
    // Check for zero crossing with tolerance
    if ((prev >= -tolerance && curr < -tolerance) || (prev < tolerance && curr >= tolerance)) {
      const timePosition = i / sampleRate;
      zeroCrossings.push({
        sampleIndex: i,
        timePosition,
        amplitude: Math.abs(curr),
        direction: curr > prev ? 'positive' : 'negative'
      });
    }
  }
  
  return zeroCrossings;
}

/**
 * Calculate peaks in audio data
 */
function calculatePeaks(audioData, windowSize, method) {
  const peaks = [];
  const numWindows = Math.floor(audioData.length / windowSize);
  
  for (let i = 0; i < numWindows; i++) {
    const windowStart = i * windowSize;
    const windowEnd = Math.min(windowStart + windowSize, audioData.length);
    const window = audioData.slice(windowStart, windowEnd);
    
    let peakValue;
    if (method === 'rms') {
      peakValue = calculateRMS(window);
    } else if (method === 'peak') {
      peakValue = calculatePeak(window);
    } else {
      peakValue = calculateAverage(window);
    }
    
    peaks.push({
      windowIndex: i,
      startSample: windowStart,
      endSample: windowEnd,
      value: peakValue,
      method
    });
  }
  
  return peaks;
}

// Utility functions

function calculateRMS(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

function calculatePeak(data) {
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    peak = Math.max(peak, Math.abs(data[i]));
  }
  return peak;
}

function calculateAverage(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += Math.abs(data[i]);
  }
  return sum / data.length;
}

function getMemoryUsage() {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };
  }
  return { used: 0, total: 0, limit: 0 };
}

function updatePerformanceMetrics(processingTime) {
  performanceMetrics.tasksCompleted++;
  performanceMetrics.averageProcessingTime = 
    (performanceMetrics.averageProcessingTime * (performanceMetrics.tasksCompleted - 1) + processingTime) / 
    performanceMetrics.tasksCompleted;
  performanceMetrics.memoryUsage = getMemoryUsage().used;
}

// Communication functions

function sendResult(result, taskId) {
  self.postMessage({
    type: 'RESULT',
    taskId,
    data: result
  });
}

function sendError(error, taskId) {
  self.postMessage({
    type: 'ERROR',
    taskId,
    error: error
  });
}

function sendProgress(progress, taskId) {
  self.postMessage({
    type: 'PROGRESS',
    taskId,
    data: progress
  });
}

function sendPerformanceMetrics(taskId) {
  self.postMessage({
    type: 'PERFORMANCE_METRICS',
    taskId,
    data: performanceMetrics
  });
}