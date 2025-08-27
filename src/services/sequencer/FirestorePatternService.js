import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../../firebase.js';

/**
 * Firestore Pattern Storage Service
 * Handles pattern persistence with user authentication and metadata
 */
export class FirestorePatternService {
  constructor() {
    this.collectionName = 'sequencer_patterns';
  }

  /**
   * Get user's pattern collection reference
   * @param {string} userId - User ID
   * @returns {CollectionReference} Firestore collection reference
   */
  getUserPatternsCollection(userId) {
    return collection(db, 'users', userId, this.collectionName);
  }

  /**
   * Save a new pattern to Firestore
   * @param {Object} pattern - Pattern data
   * @returns {Promise<string>} Pattern document ID
   */
  async savePattern(pattern) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to save patterns');
    }

    const patternData = this.formatPatternForFirestore(pattern);
    const patternsCollection = this.getUserPatternsCollection(user.uid);
    
    const docRef = await addDoc(patternsCollection, {
      ...patternData,
      metadata: {
        ...patternData.metadata,
        created: serverTimestamp(),
        modified: serverTimestamp(),
        userId: user.uid
      }
    });

    return docRef.id;
  }

  /**
   * Update an existing pattern in Firestore
   * @param {string} patternId - Pattern document ID
   * @param {Object} pattern - Updated pattern data
   * @returns {Promise<void>}
   */
  async updatePattern(patternId, pattern) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to update patterns');
    }

    const patternData = this.formatPatternForFirestore(pattern);
    const patternDoc = doc(db, 'users', user.uid, this.collectionName, patternId);
    
    await updateDoc(patternDoc, {
      ...patternData,
      'metadata.modified': serverTimestamp()
    });
  }

  /**
   * Load a pattern from Firestore
   * @param {string} patternId - Pattern document ID
   * @returns {Promise<Object>} Pattern data
   */
  async loadPattern(patternId) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to load patterns');
    }

    const patternDoc = doc(db, 'users', user.uid, this.collectionName, patternId);
    const docSnap = await getDoc(patternDoc);
    
    if (!docSnap.exists()) {
      throw new Error(`Pattern with ID ${patternId} not found`);
    }

    return this.formatPatternFromFirestore({
      id: docSnap.id,
      ...docSnap.data()
    });
  }

  /**
   * Delete a pattern from Firestore
   * @param {string} patternId - Pattern document ID
   * @returns {Promise<void>}
   */
  async deletePattern(patternId) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to delete patterns');
    }

    const patternDoc = doc(db, 'users', user.uid, this.collectionName, patternId);
    await deleteDoc(patternDoc);
  }

  /**
   * Get all patterns for the current user
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of pattern data
   */
  async getUserPatterns(options = {}) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to load patterns');
    }

    const patternsCollection = this.getUserPatternsCollection(user.uid);
    let q = query(patternsCollection, orderBy('metadata.modified', 'desc'));
    
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    if (options.tags && options.tags.length > 0) {
      q = query(q, where('metadata.tags', 'array-contains-any', options.tags));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.formatPatternFromFirestore({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Subscribe to real-time pattern updates
   * @param {string} patternId - Pattern document ID
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToPattern(patternId, callback) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to subscribe to patterns');
    }

    const patternDoc = doc(db, 'users', user.uid, this.collectionName, patternId);
    
    return onSnapshot(patternDoc, (doc) => {
      if (doc.exists()) {
        const pattern = this.formatPatternFromFirestore({
          id: doc.id,
          ...doc.data()
        });
        callback(pattern);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Subscribe to user's pattern list updates
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToUserPatterns(callback) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to subscribe to patterns');
    }

    const patternsCollection = this.getUserPatternsCollection(user.uid);
    const q = query(patternsCollection, orderBy('metadata.modified', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const patterns = querySnapshot.docs.map(doc => this.formatPatternFromFirestore({
        id: doc.id,
        ...doc.data()
      }));
      callback(patterns);
    });
  }

  /**
   * Format pattern data for Firestore storage
   * @param {Object} pattern - Pattern data
   * @returns {Object} Formatted pattern data
   */
  formatPatternForFirestore(pattern) {
    return {
      name: pattern.name || 'Untitled Pattern',
      bpm: pattern.bpm || 120,
      swing: pattern.swing || 0,
      stepResolution: pattern.stepResolution || 16,
      tracks: pattern.tracks.map(track => ({
        id: track.id,
        name: track.name,
        sampleId: track.sampleId,
        volume: track.volume,
        mute: track.mute || false,
        solo: track.solo || false,
        color: track.color || '#06b6d4',
        steps: track.steps.map(step => step.active), // Simplified boolean array
        velocities: track.steps.map(step => step.velocity || 1.0),
        randomization: {
          velocity: track.randomization?.velocity || 0,
          timing: track.randomization?.timing || 0
        }
      })),
      metadata: {
        public: pattern.metadata?.public || false,
        tags: pattern.metadata?.tags || [],
        description: pattern.metadata?.description || '',
        version: pattern.metadata?.version || 1
      }
    };
  }

  /**
   * Format pattern data from Firestore
   * @param {Object} firestoreData - Data from Firestore
   * @returns {Object} Formatted pattern data
   */
  formatPatternFromFirestore(firestoreData) {
    return {
      id: firestoreData.id,
      name: firestoreData.name,
      bpm: firestoreData.bpm,
      swing: firestoreData.swing,
      stepResolution: firestoreData.stepResolution,
      tracks: firestoreData.tracks.map(track => ({
        id: track.id,
        name: track.name,
        sampleId: track.sampleId,
        volume: track.volume,
        mute: track.mute,
        solo: track.solo,
        color: track.color,
        steps: track.steps.map((active, index) => ({
          active,
          velocity: track.velocities?.[index] || 1.0
        })),
        randomization: track.randomization
      })),
      metadata: {
        ...firestoreData.metadata,
        created: firestoreData.metadata?.created?.toDate?.() || new Date(),
        modified: firestoreData.metadata?.modified?.toDate?.() || new Date()
      }
    };
  }

  /**
   * Validate pattern data before saving
   * @param {Object} pattern - Pattern data to validate
   * @throws {Error} If pattern data is invalid
   */
  validatePattern(pattern) {
    if (!pattern.name || typeof pattern.name !== 'string') {
      throw new Error('Pattern must have a valid name');
    }

    if (!pattern.bpm || pattern.bpm < 60 || pattern.bpm > 200) {
      throw new Error('Pattern BPM must be between 60 and 200');
    }

    if (!pattern.tracks || !Array.isArray(pattern.tracks) || pattern.tracks.length === 0) {
      throw new Error('Pattern must have at least one track');
    }

    pattern.tracks.forEach((track, index) => {
      if (!track.id || typeof track.id !== 'string') {
        throw new Error(`Track ${index} must have a valid ID`);
      }

      if (!track.steps || !Array.isArray(track.steps)) {
        throw new Error(`Track ${index} must have valid steps array`);
      }

      if (track.steps.length !== pattern.stepResolution) {
        throw new Error(`Track ${index} steps length must match pattern step resolution`);
      }
    });
  }
}

// Export singleton instance
export const firestorePatternService = new FirestorePatternService();