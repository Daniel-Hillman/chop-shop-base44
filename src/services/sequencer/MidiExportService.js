/**
 * @fileoverview MIDI export service for drum sequencer patterns
 * Converts sequencer patterns to MIDI format for download
 */

/**
 * MIDI export service for converting patterns to MIDI files
 */
class MidiExportService {
  constructor() {
    /** @type {Object} Default MIDI settings */
    this.defaultSettings = {
      ticksPerQuarter: 480,
      tempo: 120,
      channel: 9, // Standard MIDI drum channel (0-indexed)
      velocity: 100
    };

    /** @type {Object} Standard GM drum mapping */
    this.drumMapping = {
      'kick': 36,      // Bass Drum 1
      'snare': 38,     // Acoustic Snare
      'hihat': 42,     // Closed Hi Hat
      'openhat': 46,   // Open Hi Hat
      'crash': 49,     // Crash Cymbal 1
      'ride': 51,      // Ride Cymbal 1
      'tom1': 50,      // High Tom
      'tom2': 47,      // Low-Mid Tom
      'clap': 39,      // Hand Clap
      'perc1': 54,     // Tambourine
      'perc2': 56,     // Cowbell
      'perc3': 58,     // Vibraslap
      'perc4': 60,     // Hi Bongo
      'perc5': 62,     // Mute Hi Conga
      'perc6': 64,     // Low Conga
      'perc7': 66      // High Timbale
    };
  }

  /**
   * Export pattern to MIDI file
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to export
   * @param {Object} options - Export options
   * @returns {Uint8Array} MIDI file data
   */
  exportPattern(pattern, options = {}) {
    if (!pattern) {
      throw new Error('Pattern is required for MIDI export');
    }

    const settings = { ...this.defaultSettings, ...options };
    
    // Create MIDI file structure
    const midiFile = this.createMidiFile(pattern, settings);
    
    return this.encodeMidiFile(midiFile);
  }

  /**
   * Export song (multiple patterns) to MIDI file
   * @param {import('../../types/sequencer.js').Song} song - Song to export
   * @param {import('../../types/sequencer.js').Pattern[]} patterns - Pattern data
   * @param {Object} options - Export options
   * @returns {Uint8Array} MIDI file data
   */
  exportSong(song, patterns, options = {}) {
    if (!song || !patterns) {
      throw new Error('Song and patterns are required for MIDI export');
    }

    const settings = { ...this.defaultSettings, ...options };
    settings.tempo = song.metadata.bpm || settings.tempo;
    
    // Create MIDI file with multiple patterns
    const midiFile = this.createSongMidiFile(song, patterns, settings);
    
    return this.encodeMidiFile(midiFile);
  } 
 /**
   * Create MIDI file structure for a single pattern
   * @private
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to convert
   * @param {Object} settings - MIDI settings
   * @returns {Object} MIDI file structure
   */
  createMidiFile(pattern, settings) {
    const ticksPerStep = Math.floor(settings.ticksPerQuarter * 4 / pattern.stepResolution);
    
    // Create header chunk
    const header = {
      format: 1, // Multi-track format
      tracks: 1,
      ticksPerQuarter: settings.ticksPerQuarter
    };

    // Create track with tempo and time signature
    const track = [];
    
    // Add tempo event
    track.push({
      deltaTime: 0,
      type: 'meta',
      subtype: 'setTempo',
      microsecondsPerBeat: Math.floor(60000000 / (settings.tempo || pattern.bpm))
    });

    // Add time signature (4/4)
    track.push({
      deltaTime: 0,
      type: 'meta',
      subtype: 'timeSignature',
      numerator: 4,
      denominator: 4,
      metronome: 24,
      thirtyseconds: 8
    });

    // Convert pattern steps to MIDI events
    this.addPatternToTrack(track, pattern, settings, ticksPerStep);

    // Add end of track
    track.push({
      deltaTime: 0,
      type: 'meta',
      subtype: 'endOfTrack'
    });

    return {
      header,
      tracks: [track]
    };
  }

  /**
   * Create MIDI file structure for a song (multiple patterns)
   * @private
   * @param {import('../../types/sequencer.js').Song} song - Song to convert
   * @param {import('../../types/sequencer.js').Pattern[]} patterns - Pattern data
   * @param {Object} settings - MIDI settings
   * @returns {Object} MIDI file structure
   */
  createSongMidiFile(song, patterns, settings) {
    const header = {
      format: 1,
      tracks: 1,
      ticksPerQuarter: settings.ticksPerQuarter
    };

    const track = [];
    
    // Add tempo event
    track.push({
      deltaTime: 0,
      type: 'meta',
      subtype: 'setTempo',
      microsecondsPerBeat: Math.floor(60000000 / settings.tempo)
    });

    // Add time signature
    track.push({
      deltaTime: 0,
      type: 'meta',
      subtype: 'timeSignature',
      numerator: 4,
      denominator: 4,
      metronome: 24,
      thirtyseconds: 8
    });

    let currentTick = 0;

    // Process each section in the song
    for (const section of song.patterns) {
      const pattern = patterns.find(p => p.id === section.patternId);
      if (!pattern) continue;

      const ticksPerStep = Math.floor(settings.ticksPerQuarter * 4 / pattern.stepResolution);
      const patternLength = pattern.stepResolution * ticksPerStep;

      // Add pattern multiple times based on loops
      for (let loop = 0; loop < section.loops; loop++) {
        this.addPatternToTrack(track, pattern, settings, ticksPerStep, currentTick);
        currentTick += patternLength;
      }
    }

    // Add end of track
    track.push({
      deltaTime: 0,
      type: 'meta',
      subtype: 'endOfTrack'
    });

    return {
      header,
      tracks: [track]
    };
  }  /**
   
* Add pattern data to MIDI track
   * @private
   * @param {Array} track - MIDI track events
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to add
   * @param {Object} settings - MIDI settings
   * @param {number} ticksPerStep - MIDI ticks per step
   * @param {number} startTick - Starting tick offset
   */
  addPatternToTrack(track, pattern, settings, ticksPerStep, startTick = 0) {
    const events = [];

    // Process each track in the pattern
    for (const patternTrack of pattern.tracks) {
      if (patternTrack.mute) continue;

      // Get MIDI note number for this track
      const noteNumber = this.getMidiNoteForTrack(patternTrack);
      if (noteNumber === null) continue;

      // Process each step
      for (let stepIndex = 0; stepIndex < patternTrack.steps.length; stepIndex++) {
        const step = patternTrack.steps[stepIndex];
        if (!step.active) continue;

        const tick = startTick + (stepIndex * ticksPerStep);
        const velocity = Math.floor(step.velocity * patternTrack.volume * 127);

        // Add note on event
        events.push({
          tick,
          type: 'channel',
          subtype: 'noteOn',
          channel: settings.channel,
          noteNumber,
          velocity: Math.max(1, Math.min(127, velocity))
        });

        // Add note off event (short duration for drums)
        events.push({
          tick: tick + Math.floor(ticksPerStep * 0.1), // 10% of step duration
          type: 'channel',
          subtype: 'noteOff',
          channel: settings.channel,
          noteNumber,
          velocity: 0
        });
      }
    }

    // Sort events by tick and add to track with delta times
    events.sort((a, b) => a.tick - b.tick);
    
    let lastTick = startTick;
    for (const event of events) {
      const deltaTime = event.tick - lastTick;
      track.push({
        deltaTime,
        type: event.type,
        subtype: event.subtype,
        channel: event.channel,
        noteNumber: event.noteNumber,
        velocity: event.velocity
      });
      lastTick = event.tick;
    }
  }

  /**
   * Get MIDI note number for a track
   * @private
   * @param {Object} track - Pattern track
   * @returns {number|null} MIDI note number or null if not found
   */
  getMidiNoteForTrack(track) {
    // Try to match by track name (case insensitive)
    const trackName = track.name.toLowerCase();
    
    // Direct mapping
    if (this.drumMapping[trackName]) {
      return this.drumMapping[trackName];
    }

    // Fuzzy matching for common variations
    const fuzzyMappings = {
      'kick': ['kick', 'bass', 'bd', 'bassdrum'],
      'snare': ['snare', 'sd', 'snaredrum'],
      'hihat': ['hihat', 'hh', 'closedhat', 'closedhihat', 'closed', 'hi-hat'],
      'openhat': ['openhat', 'oh', 'openhihat', 'open'],
      'crash': ['crash', 'cr', 'crashcymbal'],
      'ride': ['ride', 'rd', 'ridecymbal'],
      'tom1': ['tom1', 'hightom', 'tom', 'ht'],
      'tom2': ['tom2', 'lowtom', 'lt', 'midtom'],
      'clap': ['clap', 'handclap', 'cp'],
      'perc1': ['perc1', 'tambourine', 'tamb'],
      'perc2': ['perc2', 'cowbell', 'cb'],
      'perc3': ['perc3', 'vibraslap', 'vs'],
      'perc4': ['perc4', 'bongo', 'hibongo'],
      'perc5': ['perc5', 'conga', 'hiconga'],
      'perc6': ['perc6', 'lowconga', 'loconga'],
      'perc7': ['perc7', 'timbale', 'hitimbale']
    };

    for (const [drumType, variations] of Object.entries(fuzzyMappings)) {
      if (variations.some(variation => trackName.includes(variation))) {
        return this.drumMapping[drumType];
      }
    }

    // Default to kick drum if no match found
    console.warn(`No MIDI mapping found for track "${track.name}", using kick drum`);
    return this.drumMapping.kick;
  }  /**

   * Encode MIDI file structure to binary format
   * @private
   * @param {Object} midiFile - MIDI file structure
   * @returns {Uint8Array} Binary MIDI data
   */
  encodeMidiFile(midiFile) {
    const chunks = [];

    // Encode header chunk
    const headerData = new ArrayBuffer(6);
    const headerView = new DataView(headerData);
    headerView.setUint16(0, midiFile.header.format, false);
    headerView.setUint16(2, midiFile.header.tracks, false);
    headerView.setUint16(4, midiFile.header.ticksPerQuarter, false);

    chunks.push(this.createChunk('MThd', new Uint8Array(headerData)));

    // Encode track chunks
    for (const track of midiFile.tracks) {
      const trackData = this.encodeTrack(track);
      chunks.push(this.createChunk('MTrk', trackData));
    }

    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Create a MIDI chunk
   * @private
   * @param {string} type - Chunk type (4 characters)
   * @param {Uint8Array} data - Chunk data
   * @returns {Uint8Array} Complete chunk
   */
  createChunk(type, data) {
    const chunk = new Uint8Array(8 + data.length);
    const view = new DataView(chunk.buffer);

    // Chunk type (4 bytes)
    for (let i = 0; i < 4; i++) {
      chunk[i] = type.charCodeAt(i);
    }

    // Chunk length (4 bytes, big-endian)
    view.setUint32(4, data.length, false);

    // Chunk data
    chunk.set(data, 8);

    return chunk;
  }

  /**
   * Encode a MIDI track
   * @private
   * @param {Array} track - Track events
   * @returns {Uint8Array} Encoded track data
   */
  encodeTrack(track) {
    const data = [];

    for (const event of track) {
      // Encode delta time as variable length quantity
      data.push(...this.encodeVariableLength(event.deltaTime));

      // Encode event
      if (event.type === 'meta') {
        data.push(0xFF, this.getMetaEventType(event.subtype));
        
        if (event.subtype === 'setTempo') {
          data.push(0x03); // Length
          const tempo = event.microsecondsPerBeat;
          data.push((tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF);
        } else if (event.subtype === 'timeSignature') {
          data.push(0x04); // Length
          data.push(event.numerator, Math.log2(event.denominator), event.metronome, event.thirtyseconds);
        } else if (event.subtype === 'endOfTrack') {
          data.push(0x00); // Length
        }
      } else if (event.type === 'channel') {
        const status = this.getChannelEventStatus(event.subtype, event.channel);
        data.push(status, event.noteNumber, event.velocity);
      }
    }

    return new Uint8Array(data);
  }

  /**
   * Encode number as variable length quantity
   * @private
   * @param {number} value - Value to encode
   * @returns {Array} Encoded bytes
   */
  encodeVariableLength(value) {
    const bytes = [];
    
    if (value === 0) {
      return [0];
    }

    while (value > 0) {
      bytes.unshift(value & 0x7F);
      value >>= 7;
    }

    // Set continuation bit on all bytes except the last
    for (let i = 0; i < bytes.length - 1; i++) {
      bytes[i] |= 0x80;
    }

    return bytes;
  } 
 /**
   * Get meta event type byte
   * @private
   * @param {string} subtype - Meta event subtype
   * @returns {number} Event type byte
   */
  getMetaEventType(subtype) {
    const types = {
      'setTempo': 0x51,
      'timeSignature': 0x58,
      'endOfTrack': 0x2F
    };
    return types[subtype] || 0x00;
  }

  /**
   * Get channel event status byte
   * @private
   * @param {string} subtype - Channel event subtype
   * @param {number} channel - MIDI channel (0-15)
   * @returns {number} Status byte
   */
  getChannelEventStatus(subtype, channel) {
    const types = {
      'noteOn': 0x90,
      'noteOff': 0x80
    };
    return (types[subtype] || 0x90) | (channel & 0x0F);
  }

  /**
   * Download MIDI file
   * @param {Uint8Array} midiData - MIDI file data
   * @param {string} filename - Filename for download
   */
  downloadMidiFile(midiData, filename = 'pattern.mid') {
    const blob = new Blob([midiData], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Get export options with defaults
   * @param {Object} options - User options
   * @returns {Object} Complete options object
   */
  getExportOptions(options = {}) {
    return {
      ticksPerQuarter: options.ticksPerQuarter !== undefined ? options.ticksPerQuarter : this.defaultSettings.ticksPerQuarter,
      tempo: options.tempo !== undefined ? options.tempo : this.defaultSettings.tempo,
      channel: options.channel !== undefined ? options.channel : this.defaultSettings.channel,
      velocity: options.velocity !== undefined ? options.velocity : this.defaultSettings.velocity,
      includeSwing: options.includeSwing !== false,
      quantize: options.quantize !== false
    };
  }

  /**
   * Validate pattern for MIDI export
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to validate
   * @returns {boolean} Whether pattern is valid for export
   */
  validatePattern(pattern) {
    if (!pattern) return false;
    if (!pattern.tracks || !Array.isArray(pattern.tracks)) return false;
    if (pattern.tracks.length === 0) return false;
    
    // Check if pattern has any active steps
    const hasActiveSteps = pattern.tracks.some(track => 
      track.steps && track.steps.some(step => step.active)
    );
    
    return hasActiveSteps;
  }

  /**
   * Get MIDI export statistics
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to analyze
   * @returns {Object} Export statistics
   */
  getExportStats(pattern) {
    if (!this.validatePattern(pattern)) {
      return { valid: false, tracks: 0, activeSteps: 0, duration: 0 };
    }

    const activeSteps = pattern.tracks.reduce((total, track) => {
      return total + track.steps.filter(step => step.active).length;
    }, 0);

    const duration = (pattern.stepResolution / (pattern.bpm / 60)) * 4; // Duration in seconds

    return {
      valid: true,
      tracks: pattern.tracks.length,
      activeSteps,
      duration: Math.round(duration * 100) / 100,
      stepResolution: pattern.stepResolution,
      bpm: pattern.bpm
    };
  }
}

export { MidiExportService };