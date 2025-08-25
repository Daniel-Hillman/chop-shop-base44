/**
 * Demo showcasing the high-performance CanvasRenderer
 * Demonstrates 60fps rendering capabilities and optimization features
 */

import { CanvasRenderer } from './CanvasRenderer.js';

// Generate demo waveform data
function generateDemoWaveformData(durationSeconds = 10) {
  const sampleRate = 44100;
  const sampleCount = durationSeconds * sampleRate;
  const samples = new Float32Array(sampleCount);
  
  // Generate realistic audio waveform with multiple frequencies
  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;
    
    // Bass frequency
    const bass = Math.sin(2 * Math.PI * 60 * time) * 0.4;
    
    // Mid frequency with modulation
    const mid = Math.sin(2 * Math.PI * 440 * time) * 0.3 * (1 + Math.sin(2 * Math.PI * 2 * time) * 0.5);
    
    // High frequency with decay
    const treble = Math.sin(2 * Math.PI * 2000 * time) * 0.2 * Math.exp(-time * 0.1);
    
    // Add some noise for realism
    const noise = (Math.random() - 0.5) * 0.05;
    
    // Combine with envelope
    const envelope = Math.sin(2 * Math.PI * 0.2 * time) * 0.5 + 0.5;
    
    samples[i] = (bass + mid + treble + noise) * envelope;
  }
  
  return {
    samples,
    sampleRate,
    duration: durationSeconds,
    channels: 1,
    metadata: {
      analysisMethod: 'demo',
      quality: 'high',
      generatedAt: Date.now()
    }
  };
}

// Generate demo chops
function generateDemoChops(count = 20, maxDuration = 10) {
  return Array.from({ length: count }, (_, i) => {
    const startTime = (i / count) * maxDuration;
    const duration = 0.2 + Math.random() * 0.8; // 200ms to 1s chops
    
    return {
      id: `demo_chop_${i}`,
      startTime,
      endTime: Math.min(startTime + duration, maxDuration),
      padId: `PAD_${(i % 16) + 1}`, // Simulate 16-pad MPC
      color: `hsl(${(i * 137.5) % 360}, 70%, 50%)`,
      waveformRegion: {
        startSample: Math.floor(startTime * 44100),
        endSample: Math.floor((startTime + duration) * 44100),
        peakAmplitude: Math.random()
      }
    };
  });
}

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.frameTimes = [];
    this.maxFrameTimes = 60; // Keep last 60 frame times
  }
  
  recordFrame() {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxFrameTimes) {
      this.frameTimes.shift();
    }
    
    this.frameCount++;
    this.lastFrameTime = now;
  }
  
  getStats() {
    const totalTime = performance.now() - this.startTime;
    const avgFPS = this.frameCount / (totalTime / 1000);
    const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
    const maxFrameTime = Math.max(...this.frameTimes);
    const minFrameTime = Math.min(...this.frameTimes);
    
    return {
      avgFPS: Math.round(avgFPS),
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      maxFrameTime: Math.round(maxFrameTime * 100) / 100,
      minFrameTime: Math.round(minFrameTime * 100) / 100,
      frameCount: this.frameCount,
      totalTime: Math.round(totalTime)
    };
  }
}

// Demo class
export class CanvasRendererDemo {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    
    this.renderer = null;
    this.waveformData = null;
    this.chops = [];
    this.isPlaying = false;
    this.currentTime = 0;
    this.playbackSpeed = 1.0;
    this.performanceMonitor = new PerformanceMonitor();
    this.animationFrameId = null;
    
    this.setupDemo();
  }
  
  setupDemo() {
    // Create demo data
    this.waveformData = generateDemoWaveformData(15); // 15 seconds
    this.chops = generateDemoChops(25, 15); // 25 chops
    
    // Initialize renderer
    this.renderer = new CanvasRenderer(this.container, {
      enableViewportCulling: true,
      enableBatching: true,
      renderQuality: 'high',
      enableAntialiasing: true
    });
    
    // Set audio duration
    const viewportManager = this.renderer.getViewportManager();
    viewportManager.setAudioDuration(this.waveformData.duration);
    
    // Create controls
    this.createControls();
    
    // Start render loop
    this.startRenderLoop();
    
    console.log('CanvasRenderer Demo initialized');
    console.log('Waveform data:', this.waveformData);
    console.log('Chops:', this.chops.length);
  }
  
  createControls() {
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      min-width: 200px;
    `;
    
    controlsDiv.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">CanvasRenderer Demo</div>
      
      <div style="margin-bottom: 10px;">
        <button id="playPause">Play</button>
        <button id="stop">Stop</button>
        <button id="restart">Restart</button>
      </div>
      
      <div style="margin-bottom: 10px;">
        <label>Zoom: <span id="zoomValue">1.0x</span></label><br>
        <input type="range" id="zoomSlider" min="0.1" max="50" step="0.1" value="1.0" style="width: 100%;">
      </div>
      
      <div style="margin-bottom: 10px;">
        <label>Quality:</label><br>
        <select id="qualitySelect">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high" selected>High</option>
        </select>
      </div>
      
      <div style="margin-bottom: 10px;">
        <label>
          <input type="checkbox" id="cullingToggle" checked> Viewport Culling
        </label>
      </div>
      
      <div id="performanceStats" style="margin-top: 10px; font-size: 11px;">
        <div>FPS: <span id="fps">--</span></div>
        <div>Frame Time: <span id="frameTime">--</span>ms</div>
        <div>Render Time: <span id="renderTime">--</span>ms</div>
        <div>Culled Elements: <span id="culledElements">--</span></div>
      </div>
    `;
    
    this.container.appendChild(controlsDiv);
    
    // Bind event listeners
    this.bindControls();
  }
  
  bindControls() {
    // Play/Pause
    document.getElementById('playPause').addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      document.getElementById('playPause').textContent = this.isPlaying ? 'Pause' : 'Play';
    });
    
    // Stop
    document.getElementById('stop').addEventListener('click', () => {
      this.isPlaying = false;
      this.currentTime = 0;
      document.getElementById('playPause').textContent = 'Play';
    });
    
    // Restart
    document.getElementById('restart').addEventListener('click', () => {
      this.currentTime = 0;
    });
    
    // Zoom
    document.getElementById('zoomSlider').addEventListener('input', (e) => {
      const zoomLevel = parseFloat(e.target.value);
      const viewportManager = this.renderer.getViewportManager();
      viewportManager.setZoom(zoomLevel, this.currentTime);
      document.getElementById('zoomValue').textContent = `${zoomLevel.toFixed(1)}x`;
    });
    
    // Quality
    document.getElementById('qualitySelect').addEventListener('change', (e) => {
      this.renderer.setRenderQuality(e.target.value);
    });
    
    // Culling toggle
    document.getElementById('cullingToggle').addEventListener('change', (e) => {
      this.renderer.setViewportCulling(e.target.checked);
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          document.getElementById('playPause').click();
          break;
        case 'ArrowLeft':
          this.currentTime = Math.max(0, this.currentTime - 1);
          break;
        case 'ArrowRight':
          this.currentTime = Math.min(this.waveformData.duration, this.currentTime + 1);
          break;
        case '+':
        case '=':
          const currentZoom = parseFloat(document.getElementById('zoomSlider').value);
          const newZoom = Math.min(50, currentZoom * 1.5);
          document.getElementById('zoomSlider').value = newZoom;
          document.getElementById('zoomSlider').dispatchEvent(new Event('input'));
          break;
        case '-':
          const currentZoom2 = parseFloat(document.getElementById('zoomSlider').value);
          const newZoom2 = Math.max(0.1, currentZoom2 / 1.5);
          document.getElementById('zoomSlider').value = newZoom2;
          document.getElementById('zoomSlider').dispatchEvent(new Event('input'));
          break;
      }
    });
  }
  
  startRenderLoop() {
    const render = () => {
      const frameStart = performance.now();
      
      // Update playback time
      if (this.isPlaying) {
        this.currentTime += 0.016 * this.playbackSpeed; // ~60fps
        if (this.currentTime >= this.waveformData.duration) {
          this.currentTime = 0; // Loop
        }
      }
      
      // Render all elements
      this.renderer.renderWaveform(this.waveformData, {
        quality: document.getElementById('qualitySelect').value
      });
      
      this.renderer.renderChops(this.chops, null, {
        highlightSelected: true
      });
      
      this.renderer.renderPlayhead(this.currentTime, this.isPlaying, {
        color: '#ef4444',
        width: 2,
        showTime: true
      });
      
      this.renderer.renderUI({
        showZoomIndicator: true
      });
      
      const frameEnd = performance.now();
      const renderTime = frameEnd - frameStart;
      
      // Update performance monitoring
      this.performanceMonitor.recordFrame();
      this.updatePerformanceDisplay(renderTime);
      
      this.animationFrameId = requestAnimationFrame(render);
    };
    
    this.animationFrameId = requestAnimationFrame(render);
  }
  
  updatePerformanceDisplay(renderTime) {
    const stats = this.performanceMonitor.getStats();
    const rendererMetrics = this.renderer.getPerformanceMetrics();
    
    document.getElementById('fps').textContent = stats.avgFPS;
    document.getElementById('frameTime').textContent = stats.avgFrameTime;
    document.getElementById('renderTime').textContent = renderTime.toFixed(2);
    document.getElementById('culledElements').textContent = rendererMetrics.culledElements || 0;
  }
  
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    if (this.renderer) {
      this.renderer.destroy();
    }
    
    console.log('CanvasRenderer Demo destroyed');
  }
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-renderer-demo');
  if (container) {
    // Set up container styles
    container.style.cssText = `
      position: relative;
      width: 100%;
      height: 400px;
      background: #1a1a1a;
      border-radius: 8px;
      overflow: hidden;
    `;
    
    window.canvasRendererDemo = new CanvasRendererDemo('canvas-renderer-demo');
    
    console.log('CanvasRenderer Demo ready!');
    console.log('Controls:');
    console.log('- Space: Play/Pause');
    console.log('- Arrow Keys: Seek');
    console.log('- +/-: Zoom in/out');
  }
});

export default CanvasRendererDemo;