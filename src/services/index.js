/**
 * Services index - Central export point for all services
 */

export { default as audioProcessingService } from './AudioProcessingService.js';
export { default as storageManager } from './StorageManager.js';

// Re-export for named imports
import audioProcessingService from './AudioProcessingService.js';
import storageManager from './StorageManager.js';

export { audioProcessingService as AudioProcessingService };
export { storageManager as StorageManager };