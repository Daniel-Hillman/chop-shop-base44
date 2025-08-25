/**
 * FallbackAnalysisChain - Orchestrates multiple analysis strategies with intelligent fallback
 * Tries different analysis methods in order of quality and reliability
 */
import { VideoFrameAnalyzer } from './VideoFrameAnalyzer.js';
import { MetadataAnalyzer } from './MetadataAnalyzer.js';
import { ProceduralGenerator } from './ProceduralGenerator.js';

export class FallbackAnalysisChain {
  constructor(options = {}) {
    this.options = {
      sampleRate: 44100,
      preferredQuality: 'high', // 'high', 'medium', 'low'
      timeoutMs: 30000, // 30 second timeout per method
      retryAttempts: 2,
      ...options
    };
    
    this.analyzers = {
      video: new VideoFrameAnalyzer(this.options),
      metadata: new MetadataAnalyzer(this.options),
      procedural: new ProceduralGenerator(this.options)
    };
    
    this.analysisHistory = [];
  }

  /**
   * Analyze audio using fallback chain
   */
  async analyzeWithFallback(source, metadata = {}, onProgress, onMethodChange) {
    const methods = this.determineAnalysisMethods(source, metadata);
    let lastError = null;
    
    for (const method of methods) {
      try {
        if (onMethodChange) {
          onMethodChange(method.name, method.expectedQuality);
        }
        
        const result = await this.executeAnalysisMethod(method, source, metadata, onProgress);
        
        // Record successful analysis
        this.recordAnalysisAttempt(method.name, true, null, result.metadata);
        
        return result;
      } catch (error) {
        lastError = error;
        this.recordAnalysisAttempt(method.name, false, error);
        
        console.warn(`Analysis method ${method.name} failed:`, error.message);
        
        // Continue to next method
        continue;
      }
    }
    
    // If all methods failed, throw the last error
    throw new Error(`All analysis methods failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Determine which analysis methods to try based on available data
   */
  determineAnalysisMethods(source, metadata) {
    const methods = [];
    
    // Video frame analysis - requires video element
    if (source && source.tagName === 'VIDEO') {
      methods.push({
        name: 'video-frame',
        analyzer: this.analyzers.video,
        expectedQuality: 'medium',
        priority: 1
      });
    }
    
    // Metadata analysis - requires metadata
    if (metadata && (metadata.title || metadata.description || metadata.duration)) {
      methods.push({
        name: 'metadata',
        analyzer: this.analyzers.metadata,
        expectedQuality: 'low',
        priority: 2
      });
    }
    
    // Procedural generation - always available as last resort
    methods.push({
      name: 'procedural',
      analyzer: this.analyzers.procedural,
      expectedQuality: 'low',
      priority: 3
    });
    
    // Sort by priority (lower number = higher priority)
    return methods.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute a specific analysis method with timeout and retry logic
   */
  async executeAnalysisMethod(method, source, metadata, onProgress) {
    const { analyzer, name } = method;
    let attempt = 0;
    let lastError = null;
    
    while (attempt < this.options.retryAttempts) {
      try {
        const result = await this.executeWithTimeout(
          () => this.runAnalysisMethod(analyzer, name, source, metadata, onProgress),
          this.options.timeoutMs
        );
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;
        
        if (attempt < this.options.retryAttempts) {
          console.warn(`Analysis attempt ${attempt} failed for ${name}, retrying...`);
          await this.delay(1000 * attempt); // Progressive delay
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Run the appropriate analysis method
   */
  async runAnalysisMethod(analyzer, methodName, source, metadata, onProgress) {
    switch (methodName) {
      case 'video-frame':
        await analyzer.initialize(source);
        return await analyzer.analyzeVideo(
          metadata.duration || this.estimateDuration(source),
          onProgress
        );
        
      case 'metadata':
        return await analyzer.analyzeMetadata(metadata, onProgress);
        
      case 'procedural':
        const duration = metadata.duration || this.estimateDuration(source) || 180;
        const options = this.extractProceduralOptions(metadata);
        return await analyzer.generateWaveform(duration, options, onProgress);
        
      default:
        throw new Error(`Unknown analysis method: ${methodName}`);
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Analysis timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      fn()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Estimate duration from source if not provided
   */
  estimateDuration(source) {
    if (source && source.duration && !isNaN(source.duration)) {
      return source.duration;
    }
    return null;
  }

  /**
   * Extract options for procedural generation from metadata
   */
  extractProceduralOptions(metadata) {
    const options = {};
    
    // Extract BPM if mentioned in title/description
    const text = `${metadata.title || ''} ${metadata.description || ''}`.toLowerCase();
    const bpmMatch = text.match(/(\d+)\s*bpm/);
    if (bpmMatch) {
      options.bpm = parseInt(bpmMatch[1]);
    }
    
    // Extract key if mentioned
    const keyMatch = text.match(/\b([a-g][#b]?)\s*(major|minor|maj|min)\b/i);
    if (keyMatch) {
      options.key = keyMatch[1].toUpperCase();
      options.mode = keyMatch[2].toLowerCase().startsWith('maj') ? 'major' : 'minor';
    }
    
    // Determine complexity based on metadata richness
    const hasRichMetadata = (metadata.title?.length || 0) > 20 || (metadata.description?.length || 0) > 100;
    options.complexity = hasRichMetadata ? 0.8 : 0.5;
    
    return options;
  }

  /**
   * Record analysis attempt for analytics and debugging
   */
  recordAnalysisAttempt(method, success, error, resultMetadata = null) {
    const record = {
      timestamp: Date.now(),
      method: method,
      success: success,
      error: error?.message || null,
      resultMetadata: resultMetadata
    };
    
    this.analysisHistory.push(record);
    
    // Keep only last 50 records
    if (this.analysisHistory.length > 50) {
      this.analysisHistory.shift();
    }
  }

  /**
   * Get analysis statistics
   */
  getAnalysisStats() {
    const stats = {
      totalAttempts: this.analysisHistory.length,
      successfulAttempts: 0,
      methodStats: {}
    };
    
    for (const record of this.analysisHistory) {
      if (record.success) {
        stats.successfulAttempts++;
      }
      
      if (!stats.methodStats[record.method]) {
        stats.methodStats[record.method] = {
          attempts: 0,
          successes: 0,
          failures: 0
        };
      }
      
      stats.methodStats[record.method].attempts++;
      if (record.success) {
        stats.methodStats[record.method].successes++;
      } else {
        stats.methodStats[record.method].failures++;
      }
    }
    
    stats.successRate = stats.totalAttempts > 0 ? 
      (stats.successfulAttempts / stats.totalAttempts) : 0;
    
    return stats;
  }

  /**
   * Get the most reliable analysis method based on history
   */
  getMostReliableMethod() {
    const stats = this.getAnalysisStats();
    let bestMethod = null;
    let bestSuccessRate = 0;
    
    for (const [method, methodStats] of Object.entries(stats.methodStats)) {
      if (methodStats.attempts >= 3) { // Only consider methods with enough data
        const successRate = methodStats.successes / methodStats.attempts;
        if (successRate > bestSuccessRate) {
          bestSuccessRate = successRate;
          bestMethod = method;
        }
      }
    }
    
    return {
      method: bestMethod,
      successRate: bestSuccessRate
    };
  }

  /**
   * Test all available analysis methods
   */
  async testAllMethods(source, metadata = {}) {
    const methods = this.determineAnalysisMethods(source, metadata);
    const results = {};
    
    for (const method of methods) {
      try {
        const startTime = performance.now();
        const result = await this.executeAnalysisMethod(method, source, metadata);
        const endTime = performance.now();
        
        results[method.name] = {
          success: true,
          duration: endTime - startTime,
          quality: result.metadata.quality,
          sampleCount: result.samples.length,
          metadata: result.metadata
        };
      } catch (error) {
        results[method.name] = {
          success: false,
          error: error.message
        };
      }
    }
    
    return results;
  }

  /**
   * Utility delay function
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up all analyzers
   */
  dispose() {
    for (const analyzer of Object.values(this.analyzers)) {
      if (analyzer.dispose) {
        analyzer.dispose();
      }
    }
  }
}