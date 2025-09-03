/**
 * @fileoverview Sampler Chop Integration Service
 * Handles integration between chopper functionality and sampler sequencer
 * Manages automatic chop assignment and updates
 */

/**
 * Manages integration between chops and sampler sequencer
 */
class SamplerChopIntegration {
  constructor(patternManager) {
    /** @type {SamplerPatternManager} */
    this.patternManager = patternManager;
    
    /** @type {Array} */
    this.currentChops = [];
    
    /** @type {Map} */
    this.chopListeners = new Map();
    
    /** @type {Function|null} */
    this.onChopAssignmentChange = null;
  }

  /**
   * Set callback for chop assignment changes
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  setChopAssignmentChangeCallback(callback) {
    this.onChopAssignmentChange = callback;
  }

  /**
   * Update chops and handle automatic assignment
   * @param {Array} chops - Array of chop objects
   * @returns {void}
   */
  updateChops(chops) {
    if (!Array.isArray(chops)) {
      console.warn('Invalid chops data provided to updateChops');
      return;
    }

    const previousChops = [...this.currentChops];
    this.currentChops = [...chops];

    // Detect changes
    const changes = this.detectChopChanges(previousChops, chops);
    
    if (changes.added.length > 0) {
      this.handleNewChops(changes.added);
    }
    
    if (changes.removed.length > 0) {
      this.handleRemovedChops(changes.removed);
    }
    
    if (changes.modified.length > 0) {
      this.handleModifiedChops(changes.modified);
    }

    // If this is the first time we're getting chops, auto-assign them all
    if (previousChops.length === 0 && chops.length > 0) {
      this.patternManager.autoAssignChops(this.currentChops);
    }

    // Always notify listeners of potential changes
    this.notifyChopAssignmentChange();
  }

  /**
   * Detect changes between previous and current chops
   * @private
   * @param {Array} previousChops - Previous chops array
   * @param {Array} currentChops - Current chops array
   * @returns {Object} Changes object with added, removed, and modified arrays
   */
  detectChopChanges(previousChops, currentChops) {
    const changes = {
      added: [],
      removed: [],
      modified: []
    };

    // Create maps for efficient lookup
    const previousMap = new Map(previousChops.map(chop => [chop.padId, chop]));
    const currentMap = new Map(currentChops.map(chop => [chop.padId, chop]));

    // Find added chops
    for (const chop of currentChops) {
      if (!previousMap.has(chop.padId)) {
        changes.added.push(chop);
      }
    }

    // Find removed chops
    for (const chop of previousChops) {
      if (!currentMap.has(chop.padId)) {
        changes.removed.push(chop);
      }
    }

    // Find modified chops (timestamp changes)
    for (const chop of currentChops) {
      const previousChop = previousMap.get(chop.padId);
      if (previousChop && this.hasChopChanged(previousChop, chop)) {
        changes.modified.push({
          previous: previousChop,
          current: chop
        });
      }
    }

    return changes;
  }

  /**
   * Check if chop has changed (timestamps or other properties)
   * @private
   * @param {Object} previousChop - Previous chop
   * @param {Object} currentChop - Current chop
   * @returns {boolean} Whether chop has changed
   */
  hasChopChanged(previousChop, currentChop) {
    return (
      previousChop.startTime !== currentChop.startTime ||
      previousChop.endTime !== currentChop.endTime ||
      previousChop.color !== currentChop.color
    );
  }

  /**
   * Handle new chops - auto-assign to next available tracks
   * @private
   * @param {Array} newChops - Array of new chops
   * @returns {void}
   */
  handleNewChops(newChops) {
    if (!this.patternManager.getCurrentPattern()) {
      console.warn('No pattern loaded, cannot assign new chops');
      return;
    }

    console.log(`🎯 Handling ${newChops.length} new chops - auto-assigning to tracks`);

    // Use the pattern manager's auto-assignment for immediate assignment
    this.patternManager.autoAssignChops(this.currentChops);
    
    console.log('✅ Auto-assignment complete');
  }

  /**
   * Handle removed chops - clear track assignments
   * @private
   * @param {Array} removedChops - Array of removed chops
   * @returns {void}
   */
  handleRemovedChops(removedChops) {
    if (!this.patternManager.getCurrentPattern()) {
      return;
    }

    console.log(`Handling ${removedChops.length} removed chops`);

    removedChops.forEach(chop => {
      // Find and clear the track assignment across all banks
      const pattern = this.patternManager.getCurrentPattern();
      
      pattern.banks.forEach((bank, bankIndex) => {
        bank.tracks.forEach((track, trackIndex) => {
          if (track.chopId === chop.padId) {
            // Switch to the bank temporarily to clear the assignment
            const originalBank = this.patternManager.currentBank;
            this.patternManager.switchBank(bankIndex);
            this.patternManager.assignChopToTrack(null, trackIndex);
            this.patternManager.switchBank(originalBank);
            
            console.log(`Cleared chop assignment for track ${trackIndex} in bank ${bankIndex} (chop ${chop.padId})`);
          }
        });
      });
    });
  }

  /**
   * Handle modified chops - update existing assignments
   * @private
   * @param {Array} modifiedChops - Array of modified chop objects
   * @returns {void}
   */
  handleModifiedChops(modifiedChops) {
    console.log(`Handling ${modifiedChops.length} modified chops`);

    // For modified chops, we don't need to change track assignments
    // The sequencer will automatically use the updated timestamps
    // Just log the changes for debugging
    modifiedChops.forEach(({ previous, current }) => {
      console.log(`Chop ${current.padId} modified:`, {
        startTime: `${previous.startTime} -> ${current.startTime}`,
        endTime: `${previous.endTime} -> ${current.endTime}`
      });
    });
  }

  /**
   * Group chops by bank letter
   * @private
   * @param {Array} chops - Array of chops
   * @returns {Object} Chops grouped by bank letter
   */
  groupChopsByBank(chops) {
    const grouped = {};
    
    chops.forEach(chop => {
      // Skip invalid chops
      if (!chop || typeof chop !== 'object' || !chop.padId || typeof chop.padId !== 'string') {
        return;
      }
      
      const bankLetter = chop.padId.charAt(0).toUpperCase();
      if (!grouped[bankLetter]) {
        grouped[bankLetter] = [];
      }
      grouped[bankLetter].push(chop);
    });

    // Sort chops within each bank by pad number
    Object.keys(grouped).forEach(bankLetter => {
      grouped[bankLetter].sort((a, b) => {
        const aNum = parseInt(a.padId.slice(1)) || 0;
        const bNum = parseInt(b.padId.slice(1)) || 0;
        return aNum - bNum;
      });
    });

    return grouped;
  }

  /**
   * Assign chops to tracks in a specific bank
   * @private
   * @param {Array} chops - Chops to assign
   * @param {number} bankIndex - Bank index
   * @returns {void}
   */
  assignChopsToBank(chops, bankIndex) {
    const pattern = this.patternManager.getCurrentPattern();
    
    if (!pattern || !pattern.banks[bankIndex]) {
      console.warn(`Bank ${bankIndex} not found in current pattern`);
      return;
    }

    const bank = pattern.banks[bankIndex];
    console.log(`🎯 Assigning ${chops.length} chops to bank ${bankIndex}:`, chops.map(c => c.padId));
    
    chops.forEach((chop, index) => {
      if (index < bank.tracks.length) {
        // Find next available track or use the track corresponding to the chop number
        const chopNumber = parseInt(chop.padId.slice(1)) || 0;
        const targetTrackIndex = Math.min(chopNumber, bank.tracks.length - 1);
        
        console.log(`🔍 Assigning chop ${chop.padId} (number ${chopNumber}) to target track ${targetTrackIndex}`);
        
        // Switch to the target bank before assignment
        const originalBank = this.patternManager.currentBank;
        this.patternManager.switchBank(bankIndex);
        
        // Check if target track is available
        if (!bank.tracks[targetTrackIndex].chopId) {
          this.patternManager.assignChopToTrack(chop.padId, targetTrackIndex);
          console.log(`✅ Assigned chop ${chop.padId} to track ${targetTrackIndex} in bank ${bankIndex}`);
        } else {
          // Find next available track
          const availableTrackIndex = this.findNextAvailableTrack(bank);
          if (availableTrackIndex !== -1) {
            this.patternManager.assignChopToTrack(chop.padId, availableTrackIndex);
            console.log(`✅ Assigned chop ${chop.padId} to available track ${availableTrackIndex} in bank ${bankIndex}`);
          } else {
            console.warn(`❌ No available tracks in bank ${bankIndex} for chop ${chop.padId}`);
          }
        }
        
        // Switch back to original bank
        this.patternManager.switchBank(originalBank);
      }
    });
    
    // Debug: Show final assignments
    console.log(`📊 Final track assignments for bank ${bankIndex}:`, 
      bank.tracks.map((track, i) => ({ track: i, chopId: track.chopId })).filter(t => t.chopId)
    );
  }

  /**
   * Find next available track in a bank
   * @private
   * @param {Object} bank - Bank object
   * @returns {number} Track index or -1 if none available
   */
  findNextAvailableTrack(bank) {
    for (let i = 0; i < bank.tracks.length; i++) {
      if (!bank.tracks[i].chopId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get chop data for a specific track
   * @param {number} trackIndex - Track index
   * @returns {Object|null} Chop data or null
   */
  getChopForTrack(trackIndex) {
    const chopId = this.patternManager.getChopForTrack(trackIndex);
    
    if (!chopId) {
      return null;
    }

    return this.currentChops.find(chop => chop.padId === chopId) || null;
  }

  /**
   * Get all chops for current bank
   * @returns {Array} Array of chops for current bank
   */
  getChopsForCurrentBank() {
    const pattern = this.patternManager.getCurrentPattern();
    
    if (!pattern) {
      return [];
    }

    const currentBankData = this.patternManager.getCurrentBankData();
    
    if (!currentBankData) {
      return [];
    }

    const chops = [];
    
    currentBankData.tracks.forEach(track => {
      if (track.chopId) {
        const chop = this.currentChops.find(c => c.padId === track.chopId);
        if (chop) {
          chops.push(chop);
        }
      }
    });

    return chops;
  }

  /**
   * Get chop assignments for current bank
   * @returns {Array} Array of track assignments
   */
  getCurrentBankAssignments() {
    const currentBankData = this.patternManager.getCurrentBankData();
    
    if (!currentBankData) {
      return [];
    }

    return currentBankData.tracks.map((track, index) => ({
      trackIndex: index,
      chopId: track.chopId,
      chop: track.chopId ? this.currentChops.find(c => c.padId === track.chopId) : null
    }));
  }

  /**
   * Force reassignment of all chops
   * @returns {void}
   */
  reassignAllChops() {
    if (!this.patternManager.getCurrentPattern()) {
      console.warn('No pattern loaded, cannot reassign chops');
      return;
    }

    console.log('Force reassigning all chops');
    
    // Clear all existing assignments
    this.clearAllAssignments();
    
    // Reassign all current chops
    this.patternManager.autoAssignChops(this.currentChops);
    
    // Notify listeners
    this.notifyChopAssignmentChange();
  }

  /**
   * Clear all chop assignments
   * @returns {void}
   */
  clearAllAssignments() {
    const pattern = this.patternManager.getCurrentPattern();
    
    if (!pattern) {
      return;
    }

    pattern.banks.forEach(bank => {
      bank.tracks.forEach((track, trackIndex) => {
        if (track.chopId) {
          this.patternManager.assignChopToTrack(null, trackIndex);
        }
      });
    });

    console.log('Cleared all chop assignments');
  }

  /**
   * Notify listeners of chop assignment changes
   * @private
   * @returns {void}
   */
  notifyChopAssignmentChange() {
    if (this.onChopAssignmentChange) {
      const assignments = this.getCurrentBankAssignments();
      this.onChopAssignmentChange(assignments);
    }
  }

  /**
   * Get integration statistics
   * @returns {Object} Integration statistics
   */
  getIntegrationStats() {
    const pattern = this.patternManager.getCurrentPattern();
    
    if (!pattern) {
      return {
        totalChops: this.currentChops.length,
        assignedChops: 0,
        unassignedChops: this.currentChops.length,
        totalTracks: 0,
        assignedTracks: 0
      };
    }

    let totalTracks = 0;
    let assignedTracks = 0;
    const assignedChopIds = new Set();

    pattern.banks.forEach(bank => {
      bank.tracks.forEach(track => {
        totalTracks++;
        if (track.chopId) {
          assignedTracks++;
          assignedChopIds.add(track.chopId);
        }
      });
    });

    return {
      totalChops: this.currentChops.length,
      assignedChops: assignedChopIds.size,
      unassignedChops: this.currentChops.length - assignedChopIds.size,
      totalTracks,
      assignedTracks
    };
  }

  /**
   * Handle explicit chop deletion (called when user deletes a chop)
   * @param {string} chopId - ID of the deleted chop
   * @returns {void}
   */
  handleChopDeletion(chopId) {
    console.log(`🗑️ Handling explicit chop deletion: ${chopId}`);
    
    // Remove from current chops
    this.currentChops = this.currentChops.filter(chop => chop.padId !== chopId);
    
    // Find and clear the track assignment
    const trackIndex = this.patternManager.getTrackForChop(chopId);
    
    if (trackIndex !== null) {
      // Clear the chop assignment but preserve the pattern data
      this.patternManager.assignChopToTrack(null, trackIndex);
      console.log(`✅ Cleared chop assignment for track ${trackIndex} (chop ${chopId})`);
    }
    
    // Notify listeners of changes
    this.notifyChopAssignmentChange();
  }

  /**
   * Handle explicit chop creation (called when user creates a new chop)
   * @param {Object} newChop - The newly created chop
   * @returns {void}
   */
  handleChopCreation(newChop) {
    console.log(`➕ Handling explicit chop creation: ${newChop.padId}`);
    
    // Add to current chops if not already present
    const existingIndex = this.currentChops.findIndex(chop => chop.padId === newChop.padId);
    if (existingIndex === -1) {
      this.currentChops.push(newChop);
    } else {
      // Update existing chop
      this.currentChops[existingIndex] = newChop;
    }
    
    // Handle as new chop for assignment
    this.handleNewChops([newChop]);
  }

  /**
   * Handle explicit chop modification (called when user modifies chop timestamps)
   * @param {Object} modifiedChop - The modified chop
   * @returns {void}
   */
  handleChopModification(modifiedChop) {
    console.log(`🔄 Handling explicit chop modification: ${modifiedChop.padId}`);
    
    // Update in current chops
    const existingIndex = this.currentChops.findIndex(chop => chop.padId === modifiedChop.padId);
    if (existingIndex !== -1) {
      const previousChop = this.currentChops[existingIndex];
      this.currentChops[existingIndex] = modifiedChop;
      
      // Handle as modified chop
      this.handleModifiedChops([{
        previous: previousChop,
        current: modifiedChop
      }]);
    }
  }

  /**
   * Clean up resources
   * @returns {void}
   */
  destroy() {
    this.currentChops = [];
    this.chopListeners.clear();
    this.onChopAssignmentChange = null;
    
    console.log('SamplerChopIntegration destroyed');
  }
}

export { SamplerChopIntegration };