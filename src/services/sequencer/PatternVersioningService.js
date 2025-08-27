import { firestorePatternService } from './FirestorePatternService.js';

/**
 * Pattern Versioning Service
 * Handles pattern versioning, metadata management, and conflict resolution
 */
export class PatternVersioningService {
  constructor() {
    this.maxVersionHistory = 10; // Keep last 10 versions
  }

  /**
   * Create a new version of a pattern
   * @param {string} patternId - Original pattern ID
   * @param {Object} updatedPattern - Updated pattern data
   * @param {string} changeDescription - Description of changes
   * @returns {Promise<string>} New version ID
   */
  async createVersion(patternId, updatedPattern, changeDescription = '') {
    try {
      // Load current pattern to get version history
      const currentPattern = await firestorePatternService.loadPattern(patternId);
      
      // Increment version number
      const newVersion = (currentPattern.metadata.version || 1) + 1;
      
      // Create version metadata
      const versionMetadata = {
        ...updatedPattern.metadata,
        version: newVersion,
        previousVersion: currentPattern.metadata.version || 1,
        changeDescription,
        versionHistory: this.updateVersionHistory(
          currentPattern.metadata.versionHistory || [],
          {
            version: currentPattern.metadata.version || 1,
            timestamp: currentPattern.metadata.modified,
            changeDescription: currentPattern.metadata.changeDescription || 'Initial version'
          }
        )
      };

      // Update pattern with new version
      const versionedPattern = {
        ...updatedPattern,
        metadata: versionMetadata
      };

      // Validate pattern before saving
      firestorePatternService.validatePattern(versionedPattern);

      // Save updated pattern
      await firestorePatternService.updatePattern(patternId, versionedPattern);
      
      return patternId;
    } catch (error) {
      throw new Error(`Failed to create pattern version: ${error.message}`);
    }
  }

  /**
   * Get version history for a pattern
   * @param {string} patternId - Pattern ID
   * @returns {Promise<Array>} Version history
   */
  async getVersionHistory(patternId) {
    try {
      const pattern = await firestorePatternService.loadPattern(patternId);
      return pattern.metadata.versionHistory || [];
    } catch (error) {
      throw new Error(`Failed to get version history: ${error.message}`);
    }
  }

  /**
   * Compare two pattern versions
   * @param {Object} pattern1 - First pattern
   * @param {Object} pattern2 - Second pattern
   * @returns {Object} Comparison result
   */
  comparePatterns(pattern1, pattern2) {
    const differences = {
      metadata: {},
      tracks: {},
      settings: {}
    };

    // Compare basic settings
    if (pattern1.bpm !== pattern2.bpm) {
      differences.settings.bpm = { from: pattern1.bpm, to: pattern2.bpm };
    }
    
    if (pattern1.swing !== pattern2.swing) {
      differences.settings.swing = { from: pattern1.swing, to: pattern2.swing };
    }
    
    if (pattern1.stepResolution !== pattern2.stepResolution) {
      differences.settings.stepResolution = { 
        from: pattern1.stepResolution, 
        to: pattern2.stepResolution 
      };
    }

    // Compare tracks
    pattern1.tracks.forEach((track1, index) => {
      const track2 = pattern2.tracks[index];
      if (!track2) {
        differences.tracks[track1.id] = { status: 'removed' };
        return;
      }

      const trackDiffs = this.compareTrack(track1, track2);
      if (Object.keys(trackDiffs).length > 0) {
        differences.tracks[track1.id] = trackDiffs;
      }
    });

    // Check for new tracks
    pattern2.tracks.forEach((track2, index) => {
      if (!pattern1.tracks[index]) {
        differences.tracks[track2.id] = { status: 'added' };
      }
    });

    return differences;
  }

  /**
   * Compare two tracks
   * @param {Object} track1 - First track
   * @param {Object} track2 - Second track
   * @returns {Object} Track differences
   */
  compareTrack(track1, track2) {
    const differences = {};

    // Compare basic properties
    ['name', 'sampleId', 'volume', 'mute', 'solo'].forEach(prop => {
      if (track1[prop] !== track2[prop]) {
        differences[prop] = { from: track1[prop], to: track2[prop] };
      }
    });

    // Compare steps
    const stepDifferences = [];
    track1.steps.forEach((step1, index) => {
      const step2 = track2.steps[index];
      if (step1.active !== step2.active || step1.velocity !== step2.velocity) {
        stepDifferences.push({
          index,
          from: step1,
          to: step2
        });
      }
    });

    if (stepDifferences.length > 0) {
      differences.steps = stepDifferences;
    }

    // Compare randomization settings
    if (JSON.stringify(track1.randomization) !== JSON.stringify(track2.randomization)) {
      differences.randomization = {
        from: track1.randomization,
        to: track2.randomization
      };
    }

    return differences;
  }

  /**
   * Merge pattern changes (for conflict resolution)
   * @param {Object} basePattern - Base pattern
   * @param {Object} localChanges - Local changes
   * @param {Object} remoteChanges - Remote changes
   * @returns {Object} Merged pattern
   */
  mergePatterns(basePattern, localChanges, remoteChanges) {
    // Simple merge strategy - remote changes take precedence for conflicts
    // In a more sophisticated implementation, this could be more intelligent
    
    const merged = JSON.parse(JSON.stringify(basePattern));

    // Apply local changes first
    this.applyChanges(merged, localChanges);
    
    // Apply remote changes (overriding conflicts)
    this.applyChanges(merged, remoteChanges);

    // Update version metadata
    merged.metadata.version = Math.max(
      localChanges.metadata?.version || 1,
      remoteChanges.metadata?.version || 1
    ) + 1;
    
    merged.metadata.changeDescription = 'Merged changes';

    return merged;
  }

  /**
   * Apply changes to a pattern
   * @param {Object} pattern - Pattern to modify
   * @param {Object} changes - Changes to apply
   */
  applyChanges(pattern, changes) {
    // Apply setting changes
    if (changes.settings) {
      Object.keys(changes.settings).forEach(key => {
        if (changes.settings[key].to !== undefined) {
          pattern[key] = changes.settings[key].to;
        }
      });
    }

    // Apply track changes
    if (changes.tracks) {
      Object.keys(changes.tracks).forEach(trackId => {
        const trackChanges = changes.tracks[trackId];
        const trackIndex = pattern.tracks.findIndex(t => t.id === trackId);
        
        if (trackChanges.status === 'removed' && trackIndex >= 0) {
          pattern.tracks.splice(trackIndex, 1);
        } else if (trackChanges.status === 'added') {
          // Add new track (would need track data)
          console.warn('Adding new tracks in merge not fully implemented');
        } else if (trackIndex >= 0) {
          // Apply changes to existing track
          const track = pattern.tracks[trackIndex];
          
          Object.keys(trackChanges).forEach(prop => {
            if (prop === 'steps') {
              trackChanges.steps.forEach(stepChange => {
                track.steps[stepChange.index] = stepChange.to;
              });
            } else if (trackChanges[prop]?.to !== undefined) {
              track[prop] = trackChanges[prop].to;
            }
          });
        }
      });
    }
  }

  /**
   * Update version history, keeping only the most recent versions
   * @param {Array} currentHistory - Current version history
   * @param {Object} newEntry - New history entry
   * @returns {Array} Updated history
   */
  updateVersionHistory(currentHistory, newEntry) {
    const updatedHistory = [...currentHistory, newEntry];
    
    // Keep only the most recent versions
    if (updatedHistory.length > this.maxVersionHistory) {
      return updatedHistory.slice(-this.maxVersionHistory);
    }
    
    return updatedHistory;
  }

  /**
   * Generate pattern metadata
   * @param {Object} pattern - Pattern data
   * @param {Object} options - Metadata options
   * @returns {Object} Generated metadata
   */
  generateMetadata(pattern, options = {}) {
    const metadata = {
      public: options.public || false,
      tags: options.tags || [],
      description: options.description || '',
      version: 1,
      changeDescription: options.changeDescription || 'Initial version',
      versionHistory: [],
      stats: this.generatePatternStats(pattern)
    };

    return metadata;
  }

  /**
   * Generate pattern statistics
   * @param {Object} pattern - Pattern data
   * @returns {Object} Pattern statistics
   */
  generatePatternStats(pattern) {
    const stats = {
      totalSteps: pattern.stepResolution,
      activeSteps: 0,
      trackCount: pattern.tracks.length,
      averageVelocity: 0,
      complexity: 0
    };

    let totalVelocity = 0;
    let activeStepCount = 0;

    pattern.tracks.forEach(track => {
      track.steps.forEach(step => {
        if (step.active) {
          activeStepCount++;
          totalVelocity += step.velocity;
        }
      });
    });

    stats.activeSteps = activeStepCount;
    stats.averageVelocity = activeStepCount > 0 ? totalVelocity / activeStepCount : 0;
    
    // Simple complexity calculation based on active steps and track count
    stats.complexity = (activeStepCount / (pattern.stepResolution * pattern.tracks.length)) * 100;

    return stats;
  }
}

// Export singleton instance
export const patternVersioningService = new PatternVersioningService();