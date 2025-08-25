/**
 * Test setup file for vitest
 */

import '@testing-library/jest-dom';

// Mock global objects that might not be available in test environment
global.AudioContext = global.AudioContext || class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.sampleRate = 44100;
  }
  
  createBuffer(numberOfChannels, length, sampleRate) {
    return {
      numberOfChannels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: (channel) => new Float32Array(length)
    };
  }
  
  decodeAudioData(arrayBuffer) {
    return Promise.resolve(this.createBuffer(2, 44100, 44100));
  }
  
  resume() {
    return Promise.resolve();
  }
  
  close() {
    return Promise.resolve();
  }
};

global.webkitAudioContext = global.AudioContext;

// Mock IndexedDB if not available
if (!global.indexedDB) {
  global.indexedDB = {
    open: () => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    }),
    deleteDatabase: () => ({})
  };
}

// Mock navigator.storage
if (!global.navigator) {
  global.navigator = {};
}

if (!global.navigator.storage) {
  global.navigator.storage = {
    estimate: () => Promise.resolve({
      quota: 1024 * 1024 * 1024,
      usage: 100 * 1024 * 1024
    })
  };
}