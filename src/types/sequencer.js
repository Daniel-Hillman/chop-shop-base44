/**
 * @fileoverview TypeScript-style interfaces for the drum sequencer
 * These are JSDoc type definitions that provide type safety in JavaScript
 */

/**
 * @typedef {Object} SequencerStep
 * @property {boolean} active - Whether the step is active/triggered
 * @property {number} velocity - Step velocity (0.0 - 1.0)
 */

/**
 * @typedef {Object} TrackRandomization
 * @property {Object} velocity - Velocity randomization settings
 * @property {boolean} velocity.enabled - Whether velocity randomization is enabled
 * @property {number} velocity.amount - Randomization amount (0-100%)
 * @property {Object} timing - Timing randomization settings
 * @property {boolean} timing.enabled - Whether timing randomization is enabled
 * @property {number} timing.amount - Randomization amount (0-100%)
 */

/**
 * @typedef {Object} Track
 * @property {string} id - Unique track identifier
 * @property {string} name - Display name for the track
 * @property {string} sampleId - ID of the assigned sample
 * @property {number} volume - Track volume (0.0 - 1.0)
 * @property {boolean} mute - Whether the track is muted
 * @property {boolean} solo - Whether the track is soloed
 * @property {string} color - Visual color for UI (#hex format)
 * @property {TrackRandomization} randomization - Randomization settings
 * @property {SequencerStep[]} steps - Array of step data
 */

/**
 * @typedef {Object} PatternMetadata
 * @property {string} created - ISO timestamp of creation
 * @property {string} modified - ISO timestamp of last modification
 * @property {string} userId - ID of the user who created the pattern
 * @property {boolean} [public] - Whether the pattern is public
 * @property {string[]} [tags] - Optional tags for categorization
 */

/**
 * @typedef {Object} Pattern
 * @property {string} id - Unique pattern identifier
 * @property {string} name - Pattern display name
 * @property {number} bpm - Beats per minute (60-200)
 * @property {number} swing - Swing amount (0-100%)
 * @property {number} stepResolution - Steps per beat (8, 16, or 32)
 * @property {Track[]} tracks - Array of track configurations
 * @property {PatternMetadata} metadata - Pattern metadata
 */

/**
 * @typedef {Object} SampleMetadata
 * @property {number} duration - Sample duration in seconds
 * @property {number} sampleRate - Audio sample rate
 * @property {number} channels - Number of audio channels
 * @property {number} size - File size in bytes
 */

/**
 * @typedef {Object} Sample
 * @property {string} id - Unique sample identifier
 * @property {string} name - Display name for the sample
 * @property {string} filename - Original filename
 * @property {AudioBuffer} audioBuffer - Web Audio API buffer
 * @property {SampleMetadata} metadata - Sample metadata
 * @property {string[]} tags - Tags for categorization
 */

/**
 * @typedef {Object} SequencerState
 * @property {boolean} isPlaying - Whether the sequencer is currently playing
 * @property {boolean} isPaused - Whether the sequencer is paused
 * @property {number} currentStep - Current playback step (0-based)
 * @property {number} bpm - Current BPM setting
 * @property {number} swing - Current swing amount (0-100%)
 * @property {number} stepResolution - Current step resolution (8, 16, or 32)
 * @property {Pattern|null} currentPattern - Currently loaded pattern
 * @property {number} nextStepTime - Scheduled time for next step (Web Audio time)
 * @property {boolean} isLooping - Whether pattern looping is enabled
 * @property {Object} performance - Performance metrics
 * @property {number} performance.actualBPM - Measured actual BPM
 * @property {number} performance.timingDrift - Timing drift in milliseconds
 * @property {number} performance.cpuUsage - CPU usage percentage
 */

/**
 * @typedef {Object} SequencerConfig
 * @property {number} lookahead - Audio scheduling lookahead in milliseconds
 * @property {number} scheduleAheadTime - Scheduling window in seconds
 * @property {number} maxTracks - Maximum number of tracks per pattern
 * @property {number} maxSteps - Maximum number of steps per pattern
 * @property {Object} bpmRange - BPM constraints
 * @property {number} bpmRange.min - Minimum BPM
 * @property {number} bpmRange.max - Maximum BPM
 */

/**
 * @typedef {Object} SongSection
 * @property {string} id - Unique section identifier
 * @property {string} patternId - ID of the pattern to play
 * @property {number} loops - Number of times to loop this pattern
 * @property {string} transitionType - Type of transition ('immediate', 'fade', 'crossfade')
 * @property {number} transitionBars - Number of bars for transition timing
 */

/**
 * @typedef {Object} SongMetadata
 * @property {string} created - ISO timestamp of creation
 * @property {string} modified - ISO timestamp of last modification
 * @property {string} userId - ID of the user who created the song
 * @property {number} bpm - Song BPM (can override pattern BPM)
 * @property {number} totalDuration - Total song duration in seconds
 */

/**
 * @typedef {Object} Song
 * @property {string} id - Unique song identifier
 * @property {string} name - Song display name
 * @property {SongSection[]} patterns - Array of pattern sections in sequence
 * @property {SongMetadata} metadata - Song metadata
 */

// Export types for JSDoc usage
export const SequencerTypes = {
  // These are just for documentation - actual validation happens in services
};