/**
 * Demo for InteractionManager functionality
 * Shows basic waveform interaction capabilities
 */

import React, { useRef, useEffect, useState } from 'react';
import { InteractionManager } from './InteractionManager.js';

// Mock CanvasRenderer for demo purposes
class MockCanvasRenderer {
  constructor() {
    this.layerManager = {
      getLayer: () => ({
        canvas: document.createElement('canvas'),
        ctx: document.createElement('canvas').getContext('2d')
      }),
      clearLayer: () => {},
      getDimensions: () => ({ width: 800, height: 200 })
    };
    
    this.viewportManager = {
      pixelToTime: (pixel) => pixel / 80, // 80 pixels per second
      timeToPixel: (time) => time * 80,
      isTimeVisible: () => true,
      getViewportBounds: () => ({
        start: 0,
        end: 10,
        duration: 10,
        pixelsPerSecond: 80
      }),
      zoomIn: (factor, centerTime) => {
        console.log(`Zoom in ${factor}x at time ${centerTime}s`);
      },
      zoomOut: (factor, centerTime) => {
        console.log(`Zoom out ${factor}x at time ${centerTime}s`);
      }
    };
  }
  
  getLayerManager() {
    return this.layerManager;
  }
  
  getViewportManager() {
    return this.viewportManager;
  }
}

export default function InteractionManagerDemo() {
  const [interactionManager, setInteractionManager] = useState(null);
  const [chops, setChops] = useState([
    {
      id: 'chop1',
      startTime: 1.0,
      endTime: 2.5,
      padId: 'A1',
      color: '#3b82f6'
    },
    {
      id: 'chop2',
      startTime: 4.0,
      endTime: 6.0,
      padId: 'B2',
      color: '#ef4444'
    }
  ]);
  const [logs, setLogs] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);

  const addLog = (message) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const mockRenderer = new MockCanvasRenderer();
    const manager = new InteractionManager(mockRenderer);
    
    // Set up callbacks
    manager.setCallbacks({
      onChopCreate: (startTime, endTime) => {
        const newChop = {
          id: `chop${Date.now()}`,
          startTime,
          endTime,
          padId: `P${chops.length + 1}`,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`
        };
        setChops(prev => [...prev, newChop]);
        addLog(`Created chop: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
      },
      
      onChopUpdate: (chopId, updates) => {
        setChops(prev => prev.map(chop => 
          chop.id === chopId ? { ...chop, ...updates } : chop
        ));
        addLog(`Updated chop ${chopId}: ${JSON.stringify(updates)}`);
      },
      
      onTimeSeek: (time) => {
        setCurrentTime(time);
        addLog(`Seek to time: ${time.toFixed(2)}s`);
      },
      
      onHover: (element, x, y) => {
        if (element) {
          addLog(`Hover: ${element.type} at ${element.time?.toFixed(2)}s`);
        }
      }
    });
    
    // Update chops in manager
    manager.setCurrentChops(chops);
    
    setInteractionManager(manager);
    addLog('InteractionManager initialized');
    
    return () => {
      manager.destroy();
    };
  }, []);

  // Update chops when they change
  useEffect(() => {
    if (interactionManager) {
      interactionManager.setCurrentChops(chops);
    }
  }, [chops, interactionManager]);

  const testPixelToTimeConversion = () => {
    if (!interactionManager) return;
    
    const testCases = [
      { pixel: 0, expectedTime: 0 },
      { pixel: 80, expectedTime: 1 },
      { pixel: 400, expectedTime: 5 },
      { pixel: 800, expectedTime: 10 }
    ];
    
    testCases.forEach(({ pixel, expectedTime }) => {
      const actualTime = interactionManager.pixelToTime(pixel);
      const accuracy = Math.abs(actualTime - expectedTime) < 0.001 ? '✓' : '✗';
      addLog(`${accuracy} Pixel ${pixel} → Time ${actualTime.toFixed(3)}s (expected ${expectedTime}s)`);
    });
  };

  const testTimeToPixelConversion = () => {
    if (!interactionManager) return;
    
    const testCases = [
      { time: 0, expectedPixel: 0 },
      { time: 1, expectedPixel: 80 },
      { time: 5, expectedPixel: 400 },
      { time: 10, expectedPixel: 800 }
    ];
    
    testCases.forEach(({ time, expectedPixel }) => {
      const actualPixel = interactionManager.timeToPixel(time);
      const accuracy = Math.abs(actualPixel - expectedPixel) < 1 ? '✓' : '✗';
      addLog(`${accuracy} Time ${time}s → Pixel ${actualPixel.toFixed(1)} (expected ${expectedPixel})`);
    });
  };

  const testChopCreation = () => {
    if (!interactionManager) return;
    
    // Test creating chop at specific time
    const time = 3.5;
    interactionManager.createChopAtTime(time);
    addLog(`Test: Created chop at ${time}s`);
  };

  const testChopDetection = () => {
    if (!interactionManager) return;
    
    const testPositions = [
      { x: 120, description: 'middle of chop1' },
      { x: 80, description: 'start boundary of chop1' },
      { x: 200, description: 'end boundary of chop1' },
      { x: 300, description: 'empty area' }
    ];
    
    testPositions.forEach(({ x, description }) => {
      const element = interactionManager.getElementAtPosition(x, 100);
      if (element) {
        addLog(`✓ Detected ${element.type} at ${description} (${x}px)`);
      } else {
        addLog(`✓ No element at ${description} (${x}px)`);
      }
    });
  };

  const testDragState = () => {
    if (!interactionManager) return;
    
    // Test drag state initialization
    interactionManager.initializeChopCreation(160, 100); // 2.0s
    addLog(`Drag state: ${interactionManager.dragState.type} at ${interactionManager.dragState.startTime}s`);
    
    // Test drag update
    interactionManager.updateDrag(320, 100); // 4.0s
    addLog(`Drag updated: end time ${interactionManager.dragState.endTime}s`);
    
    // Reset state
    interactionManager.resetInteractionState();
    addLog('Drag state reset');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">InteractionManager Demo</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Controls</h3>
          
          <div className="space-y-2">
            <button
              onClick={testPixelToTimeConversion}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test Pixel → Time Conversion
            </button>
            
            <button
              onClick={testTimeToPixelConversion}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Time → Pixel Conversion
            </button>
            
            <button
              onClick={testChopCreation}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Test Chop Creation
            </button>
            
            <button
              onClick={testChopDetection}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Test Chop Detection
            </button>
            
            <button
              onClick={testDragState}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Test Drag State
            </button>
          </div>
          
          {/* Current State */}
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Current State</h4>
            <div className="text-sm space-y-1">
              <div>Current Time: {currentTime.toFixed(2)}s</div>
              <div>Total Chops: {chops.length}</div>
              <div>Manager Status: {interactionManager ? 'Ready' : 'Initializing'}</div>
            </div>
          </div>
        </div>
        
        {/* Chops Display */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Current Chops</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {chops.map(chop => (
              <div
                key={chop.id}
                className="p-2 border rounded text-sm"
                style={{ borderColor: chop.color }}
              >
                <div className="font-medium">{chop.padId} ({chop.id})</div>
                <div className="text-gray-600">
                  {chop.startTime.toFixed(2)}s - {chop.endTime.toFixed(2)}s
                  ({(chop.endTime - chop.startTime).toFixed(2)}s duration)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Activity Log */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Activity Log</h3>
        <div className="bg-gray-100 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))}
        </div>
      </div>
      
      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h4 className="font-semibold mb-2">InteractionManager Features Demonstrated:</h4>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li><strong>Pixel-to-Time Conversion:</strong> Accurate conversion with 80 pixels per second</li>
          <li><strong>Click-to-Create-Chop:</strong> Creates 100ms chops centered on click position</li>
          <li><strong>Chop Detection:</strong> Detects hover over chop regions and boundaries</li>
          <li><strong>Drag State Management:</strong> Tracks drag operations for chop creation/editing</li>
          <li><strong>Callback System:</strong> Notifies parent components of user interactions</li>
          <li><strong>Boundary Constraints:</strong> Prevents invalid chop boundary movements</li>
        </ul>
      </div>
    </div>
  );
}