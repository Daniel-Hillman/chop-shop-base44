/**
 * Demo for InteractionManager drag-based chop creation and editing
 * Showcases the enhanced drag functionality implemented for task 6
 * Requirements: 2.2, 3.1, 3.2, 3.4
 */

import { InteractionManager } from './InteractionManager.js';

/**
 * Demo class to showcase drag functionality
 */
export class InteractionManagerDragDemo {
  constructor() {
    this.container = null;
    this.interactionManager = null;
    this.chops = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the demo
   */
  async initialize(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    // Create demo canvas
    this.setupCanvas();
    
    // Create mock renderer and viewport manager
    this.setupMockRenderer();
    
    // Initialize InteractionManager with drag-optimized settings
    this.interactionManager = new InteractionManager(this.mockRenderer, {
      clickThreshold: 3,
      snapTolerance: 15,
      enableSmartSnapping: true,
      enableVisualFeedback: true,
      enableConflictPrevention: true,
      dragSensitivity: 1.0
    });

    // Setup callbacks
    this.setupCallbacks();
    
    // Add demo chops
    this.addDemoChops();
    
    this.isInitialized = true;
    console.log('InteractionManager Drag Demo initialized');
  }

  /**
   * Setup demo canvas
   */
  setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 200;
    this.canvas.style.border = '1px solid #ccc';
    this.canvas.style.cursor = 'crosshair';
    
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    
    // Add instructions
    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <h3>Drag-based Chop Creation and Editing Demo</h3>
      <ul>
        <li><strong>Drag to create:</strong> Click and drag on empty space to create a new chop</li>
        <li><strong>Drag boundaries:</strong> Click and drag the edges of existing chops to resize them</li>
        <li><strong>Smart snapping:</strong> Boundaries snap to nearby chop edges automatically</li>
        <li><strong>Conflict prevention:</strong> New chops won't overlap with existing ones</li>
        <li><strong>Visual feedback:</strong> Real-time preview with timing information</li>
      </ul>
      <p>Current chops: <span id="chop-count">${this.chops.length}</span></p>
    `;
    this.container.appendChild(instructions);
  }

  /**
   * Setup mock renderer and viewport manager
   */
  setupMockRenderer() {
    const mockLayerManager = {
      getLayer: (name) => {
        if (name === 'interaction') {
          return {
            canvas: this.canvas,
            ctx: this.ctx
          };
        }
        return null;
      },
      clearLayer: (name) => {
        if (name === 'interaction') {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.renderChops();
        }
      },
      getDimensions: () => ({
        width: this.canvas.width,
        height: this.canvas.height
      })
    };

    const mockViewportManager = {
      pixelToTime: (pixel) => {
        // 100 pixels per second
        return pixel / 100;
      },
      timeToPixel: (time) => {
        // 100 pixels per second
        return time * 100;
      },
      getViewportBounds: () => ({
        start: 0,
        end: 8,
        duration: 8,
        pixelsPerSecond: 100
      }),
      zoomIn: (factor, centerTime) => {
        console.log(`Zoom in: ${factor}x at ${centerTime}s`);
      },
      zoomOut: (factor, centerTime) => {
        console.log(`Zoom out: ${factor}x at ${centerTime}s`);
      }
    };

    this.mockRenderer = {
      getLayerManager: () => mockLayerManager,
      getViewportManager: () => mockViewportManager
    };
  }

  /**
   * Setup interaction callbacks
   */
  setupCallbacks() {
    this.interactionManager.setCallbacks({
      onChopCreate: (startTime, endTime) => {
        const newChop = {
          id: `chop-${Date.now()}`,
          startTime,
          endTime,
          color: this.getRandomColor(),
          padId: `PAD${this.chops.length + 1}`
        };
        
        this.chops.push(newChop);
        this.interactionManager.setCurrentChops(this.chops);
        this.renderChops();
        this.updateChopCount();
        
        console.log(`Created chop: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s`);
      },
      
      onChopUpdate: (chopId, updates) => {
        const chop = this.chops.find(c => c.id === chopId);
        if (chop) {
          Object.assign(chop, updates);
          this.renderChops();
          console.log(`Updated chop ${chopId}:`, updates);
        }
      },
      
      onTimeSeek: (time) => {
        console.log(`Seek to: ${time.toFixed(3)}s`);
      }
    });
  }

  /**
   * Add some demo chops
   */
  addDemoChops() {
    const demoChops = [
      { id: 'demo1', startTime: 1.0, endTime: 2.5, color: '#3b82f6', padId: 'A1' },
      { id: 'demo2', startTime: 4.0, endTime: 5.5, color: '#ef4444', padId: 'B2' },
      { id: 'demo3', startTime: 6.5, endTime: 7.2, color: '#10b981', padId: 'C3' }
    ];
    
    this.chops = demoChops;
    this.interactionManager.setCurrentChops(this.chops);
    this.renderChops();
  }

  /**
   * Render chops on canvas
   */
  renderChops() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw timeline
    this.drawTimeline();
    
    // Draw chops
    this.chops.forEach(chop => {
      const startPixel = chop.startTime * 100;
      const endPixel = chop.endTime * 100;
      const width = endPixel - startPixel;
      
      // Draw chop background
      this.ctx.fillStyle = chop.color + '40'; // Add transparency
      this.ctx.fillRect(startPixel, 50, width, 100);
      
      // Draw chop borders
      this.ctx.strokeStyle = chop.color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(startPixel, 50, width, 100);
      
      // Draw chop label
      this.ctx.fillStyle = chop.color;
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        chop.padId,
        startPixel + width / 2,
        100
      );
      
      // Draw timing info
      this.ctx.fillStyle = '#666';
      this.ctx.font = '10px monospace';
      this.ctx.fillText(
        `${chop.startTime.toFixed(2)}s`,
        startPixel + 2,
        170
      );
      this.ctx.fillText(
        `${chop.endTime.toFixed(2)}s`,
        endPixel - 20,
        170
      );
    });
  }

  /**
   * Draw timeline
   */
  drawTimeline() {
    // Draw timeline background
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw time markers
    this.ctx.strokeStyle = '#dee2e6';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i <= 8; i++) {
      const x = i * 100;
      
      // Draw vertical line
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
      
      // Draw time label
      this.ctx.fillStyle = '#6c757d';
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${i}s`, x, 20);
    }
    
    // Draw horizontal lines
    this.ctx.beginPath();
    this.ctx.moveTo(0, 50);
    this.ctx.lineTo(this.canvas.width, 50);
    this.ctx.moveTo(0, 150);
    this.ctx.lineTo(this.canvas.width, 150);
    this.ctx.stroke();
  }

  /**
   * Get random color for new chops
   */
  getRandomColor() {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
      '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Update chop count display
   */
  updateChopCount() {
    const countElement = document.getElementById('chop-count');
    if (countElement) {
      countElement.textContent = this.chops.length;
    }
  }

  /**
   * Demonstrate specific drag features
   */
  demonstrateFeatures() {
    if (!this.isInitialized) {
      console.error('Demo not initialized');
      return;
    }

    console.log('=== InteractionManager Drag Features Demo ===');
    
    // Feature 1: Drag selection for chop creation
    console.log('1. Drag Selection: Click and drag on empty space to create chops');
    
    // Feature 2: Draggable handles for boundary adjustment
    console.log('2. Boundary Adjustment: Click and drag chop edges to resize');
    
    // Feature 3: Real-time visual feedback
    console.log('3. Visual Feedback: Watch for animated previews during drag');
    
    // Feature 4: Smart snapping
    console.log('4. Smart Snapping: Boundaries snap to nearby chop edges');
    
    // Feature 5: Conflict prevention
    console.log('5. Conflict Prevention: New chops won\'t overlap existing ones');
    
    console.log('Try dragging to see these features in action!');
  }

  /**
   * Cleanup demo
   */
  destroy() {
    if (this.interactionManager) {
      this.interactionManager.destroy();
    }
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    console.log('InteractionManager Drag Demo destroyed');
  }
}

// Export for use in HTML demos
window.InteractionManagerDragDemo = InteractionManagerDragDemo;

export default InteractionManagerDragDemo;