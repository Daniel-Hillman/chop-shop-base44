/**
 * Demo for enhanced chop visualization and relationship display
 * Showcases requirements: 2.4, 2.5, 5.4, 5.5
 */

import WaveformVisualization from './WaveformVisualization.jsx';

export class ChopVisualizationDemo {
  constructor(container) {
    this.container = container;
    this.waveformComponent = null;
    this.chops = [];
    this.selectedChopId = null;
    this.currentTime = 0;
    this.isPlaying = false;
    
    this.setupDemo();
  }

  setupDemo() {
    // Create demo container
    this.container.innerHTML = `
      <div class="chop-visualization-demo">
        <div class="demo-header">
          <h2>Enhanced Chop Visualization Demo</h2>
          <p>Demonstrates colored overlays, boundary markers, hover tooltips, and relationship indicators</p>
        </div>
        
        <div class="demo-controls">
          <button id="addOverlappingChops">Add Overlapping Chops</button>
          <button id="addAdjacentChops">Add Adjacent Chops</button>
          <button id="clearChops">Clear All Chops</button>
          <button id="togglePlayback">Toggle Playback</button>
          <div class="time-control">
            <label>Current Time: </label>
            <input type="range" id="timeSlider" min="0" max="10" step="0.1" value="0">
            <span id="timeDisplay">0.0s</span>
          </div>
        </div>
        
        <div class="waveform-container" style="width: 100%; height: 300px; background: #1f2937; border-radius: 8px;">
        </div>
        
        <div class="demo-info">
          <div class="info-section">
            <h3>Features Demonstrated:</h3>
            <ul>
              <li><strong>Colored Chop Overlays:</strong> Each chop has a distinct color with gradient effects</li>
              <li><strong>Boundary Markers:</strong> Triangular indicators show start/end points clearly</li>
              <li><strong>Hover Tooltips:</strong> Detailed timing and duration information on hover</li>
              <li><strong>Relationship Indicators:</strong> Visual cues for overlapping and adjacent chops</li>
              <li><strong>Enhanced Visual States:</strong> Different appearances for selected, hovered, and active chops</li>
            </ul>
          </div>
          
          <div class="info-section">
            <h3>Interaction Guide:</h3>
            <ul>
              <li>Hover over chops to see detailed tooltips</li>
              <li>Click on chop boundaries to see boundary information</li>
              <li>Observe relationship indicators between overlapping chops</li>
              <li>Notice adjacency indicators for nearby chops</li>
              <li>Watch active chop animations during playback</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Add styles
    this.addStyles();
    
    // Generate demo waveform data
    this.waveformData = this.generateDemoWaveformData();
    
    // Create initial demo chops
    this.createDemoChops();
    
    // Initialize waveform visualization
    this.initializeWaveform();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start demo animation
    this.startDemo();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .chop-visualization-demo {
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f9fafb;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .demo-header {
        text-align: center;
        margin-bottom: 20px;
      }
      
      .demo-header h2 {
        color: #1f2937;
        margin: 0 0 8px 0;
      }
      
      .demo-header p {
        color: #6b7280;
        margin: 0;
      }
      
      .demo-controls {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      
      .demo-controls button {
        padding: 8px 16px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      
      .demo-controls button:hover {
        background: #2563eb;
      }
      
      .time-control {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
      }
      
      .time-control input[type="range"] {
        width: 150px;
      }
      
      .waveform-container {
        margin-bottom: 20px;
        position: relative;
      }
      
      .demo-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      .info-section {
        background: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .info-section h3 {
        margin: 0 0 12px 0;
        color: #1f2937;
        font-size: 16px;
      }
      
      .info-section ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .info-section li {
        margin-bottom: 8px;
        color: #4b5563;
        line-height: 1.5;
      }
      
      .info-section strong {
        color: #1f2937;
      }
    `;
    document.head.appendChild(style);
  }

  generateDemoWaveformData() {
    const duration = 10; // 10 seconds
    const sampleRate = 44100;
    const samples = new Float32Array(sampleRate * duration);
    
    // Generate a complex waveform with multiple frequency components
    for (let i = 0; i < samples.length; i++) {
      const time = i / sampleRate;
      
      // Base sine wave
      let amplitude = Math.sin(2 * Math.PI * 440 * time) * 0.3;
      
      // Add harmonics
      amplitude += Math.sin(2 * Math.PI * 880 * time) * 0.2;
      amplitude += Math.sin(2 * Math.PI * 1320 * time) * 0.1;
      
      // Add some variation over time
      amplitude *= (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * time));
      
      // Add some noise
      amplitude += (Math.random() - 0.5) * 0.05;
      
      samples[i] = amplitude;
    }
    
    return {
      samples,
      sampleRate,
      duration,
      channels: 1,
      metadata: {
        analysisMethod: 'demo',
        quality: 'high'
      }
    };
  }

  createDemoChops() {
    this.chops = [
      {
        id: 'demo-chop-1',
        startTime: 1.0,
        endTime: 2.5,
        padId: 'A1',
        name: 'Kick Pattern',
        color: '#3b82f6'
      },
      {
        id: 'demo-chop-2',
        startTime: 2.3, // Slight overlap with chop 1
        endTime: 4.0,
        padId: 'A2',
        name: 'Snare Hit',
        color: '#ef4444'
      },
      {
        id: 'demo-chop-3',
        startTime: 4.05, // Adjacent to chop 2
        endTime: 5.5,
        padId: 'A3',
        name: 'Hi-Hat Loop',
        color: '#10b981'
      },
      {
        id: 'demo-chop-4',
        startTime: 6.0,
        endTime: 7.2,
        padId: 'A4',
        name: 'Bass Line',
        color: '#f59e0b'
      }
    ];
  }

  initializeWaveform() {
    const container = this.container.querySelector('.waveform-container');
    
    // Create React component (simplified for demo)
    this.waveformElement = document.createElement('div');
    this.waveformElement.style.width = '100%';
    this.waveformElement.style.height = '100%';
    container.appendChild(this.waveformElement);
    
    // Simulate waveform visualization
    this.renderWaveformDemo();
  }

  renderWaveformDemo() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 300;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.background = '#1f2937';
    canvas.style.borderRadius = '8px';
    
    this.waveformElement.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Add interaction listeners
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    canvas.addEventListener('click', this.handleClick.bind(this));
    
    this.renderFrame();
  }

  renderFrame() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Render waveform
    this.renderWaveform(ctx, width, height);
    
    // Render chops with enhanced visualization
    this.renderEnhancedChops(ctx, width, height);
    
    // Render playhead
    if (this.isPlaying) {
      this.renderPlayhead(ctx, width, height);
    }
    
    // Render hover tooltip if needed
    if (this.hoverInfo) {
      this.renderHoverTooltip(ctx, this.hoverInfo);
    }
  }

  renderWaveform(ctx, width, height) {
    const samples = this.waveformData.samples;
    const samplesPerPixel = samples.length / width;
    const centerY = height / 2;
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)');
    gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.4)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(6, 182, 212, 1)';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      const sampleStart = Math.floor(x * samplesPerPixel);
      const sampleEnd = Math.floor((x + 1) * samplesPerPixel);
      
      let min = 0, max = 0;
      for (let i = sampleStart; i < Math.min(sampleEnd, samples.length); i++) {
        const sample = samples[i] || 0;
        min = Math.min(min, sample);
        max = Math.max(max, sample);
      }
      
      const minY = centerY - (min * centerY);
      const maxY = centerY - (max * centerY);
      
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
    
    ctx.stroke();
  }

  renderEnhancedChops(ctx, width, height) {
    const duration = this.waveformData.duration;
    
    this.chops.forEach((chop, index) => {
      const startX = (chop.startTime / duration) * width;
      const endX = (chop.endTime / duration) * width;
      const chopWidth = endX - startX;
      
      if (chopWidth <= 0) return;
      
      // Enhanced chop rendering with relationship analysis
      this.renderSingleEnhancedChop(ctx, chop, startX, endX, width, height, index);
    });
  }

  renderSingleEnhancedChop(ctx, chop, startX, endX, width, height, index) {
    const chopWidth = endX - startX;
    const isSelected = chop.id === this.selectedChopId;
    const isHovered = chop.id === this.hoveredChopId;
    const isActive = this.isPlaying && this.currentTime >= chop.startTime && this.currentTime <= chop.endTime;
    
    // Enhanced background with gradient
    const gradient = ctx.createLinearGradient(startX, 0, startX, height);
    const baseAlpha = isSelected ? 0.6 : isHovered ? 0.4 : 0.25;
    
    if (isActive) {
      const pulseOffset = Math.sin(Date.now() / 300) * 0.1;
      gradient.addColorStop(0, this.hexToRgba(chop.color, baseAlpha + pulseOffset));
      gradient.addColorStop(0.5, this.hexToRgba(chop.color, (baseAlpha * 0.7) + pulseOffset));
      gradient.addColorStop(1, this.hexToRgba(chop.color, baseAlpha + pulseOffset));
    } else {
      gradient.addColorStop(0, this.hexToRgba(chop.color, baseAlpha));
      gradient.addColorStop(0.5, this.hexToRgba(chop.color, baseAlpha * 0.7));
      gradient.addColorStop(1, this.hexToRgba(chop.color, baseAlpha));
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(startX, 0, chopWidth, height);
    
    // Enhanced boundaries with indicators
    this.renderChopBoundaries(ctx, chop, startX, endX, height, isSelected, isHovered, isActive);
    
    // Relationship indicators
    this.renderRelationshipIndicators(ctx, chop, startX, endX, width, height);
    
    // Enhanced label
    this.renderChopLabel(ctx, chop, startX, chopWidth, height, isSelected, isActive);
  }

  renderChopBoundaries(ctx, chop, startX, endX, height, isSelected, isHovered, isActive) {
    const lineWidth = isSelected ? 4 : isHovered ? 3 : 2;
    const borderAlpha = isSelected ? 1.0 : isHovered ? 0.8 : 0.6;
    
    ctx.strokeStyle = this.hexToRgba(chop.color, borderAlpha);
    ctx.lineWidth = lineWidth;
    
    // Add glow effect for selected/hovered
    if (isSelected || isHovered) {
      ctx.shadowColor = this.hexToRgba(chop.color, 0.6);
      ctx.shadowBlur = isSelected ? 6 : 4;
    }
    
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Boundary indicators
    this.renderBoundaryIndicator(ctx, startX, 15, 'start', chop.color, isSelected);
    this.renderBoundaryIndicator(ctx, endX, 15, 'end', chop.color, isSelected);
    
    // Active chop animation
    if (isActive) {
      const pulseAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 200);
      ctx.strokeStyle = this.hexToRgba(chop.color, pulseAlpha);
      ctx.lineWidth = 6;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = (Date.now() / 50) % 12;
      
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
      ctx.stroke();
      
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
  }

  renderBoundaryIndicator(ctx, x, y, type, color, isSelected) {
    const size = isSelected ? 8 : 6;
    const direction = type === 'start' ? 1 : -1;
    
    ctx.fillStyle = this.hexToRgba(color, 0.9);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (direction * size), y - size);
    ctx.lineTo(x + (direction * size), y + size);
    ctx.closePath();
    ctx.fill();
    
    // White outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  renderRelationshipIndicators(ctx, chop, startX, endX, width, height) {
    const duration = this.waveformData.duration;
    
    this.chops.forEach(otherChop => {
      if (otherChop.id === chop.id) return;
      
      const otherStartX = (otherChop.startTime / duration) * width;
      const otherEndX = (otherChop.endTime / duration) * width;
      
      // Check for overlap
      if (!(chop.endTime <= otherChop.startTime || chop.startTime >= otherChop.endTime)) {
        this.renderOverlapIndicator(ctx, startX, endX, otherStartX, otherEndX, height);
      }
      // Check for adjacency
      else if (Math.abs(chop.endTime - otherChop.startTime) <= 0.05) {
        this.renderAdjacencyIndicator(ctx, endX, otherStartX, height);
      }
      else if (Math.abs(otherChop.endTime - chop.startTime) <= 0.05) {
        this.renderAdjacencyIndicator(ctx, otherEndX, startX, height);
      }
    });
  }

  renderOverlapIndicator(ctx, start1, end1, start2, end2, height) {
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    
    if (overlapEnd <= overlapStart) return;
    
    // Warning pattern
    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.fillRect(overlapStart, height - 8, overlapEnd - overlapStart, 8);
    
    // Warning stripes
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    for (let x = overlapStart; x < overlapEnd; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, height - 8);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  }

  renderAdjacencyIndicator(ctx, point1, point2, height) {
    // Connection line
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    
    ctx.beginPath();
    ctx.moveTo(point1, height - 20);
    ctx.lineTo(point2, height - 20);
    ctx.stroke();
    
    // Connection dots
    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.beginPath();
    ctx.arc(point1, height - 20, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(point2, height - 20, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.setLineDash([]);
  }

  renderChopLabel(ctx, chop, startX, width, height, isSelected, isActive) {
    if (width < 30) return;
    
    const centerX = startX + width / 2;
    const centerY = height / 2;
    const labelText = chop.padId || chop.name || chop.id.slice(0, 3);
    
    ctx.font = isSelected ? 'bold 14px monospace' : '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Background
    const textMetrics = ctx.measureText(labelText);
    const bgWidth = textMetrics.width + 8;
    const bgHeight = 20;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX - bgWidth / 2, centerY - bgHeight / 2, bgWidth, bgHeight);
    
    // Border
    ctx.strokeStyle = this.hexToRgba(chop.color, 0.8);
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - bgWidth / 2, centerY - bgHeight / 2, bgWidth, bgHeight);
    
    // Text
    ctx.fillStyle = isActive ? '#ffffff' : this.hexToRgba(chop.color, 1.0);
    ctx.fillText(labelText, centerX, centerY);
    
    // Active indicator
    if (isActive) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.beginPath();
      ctx.arc(centerX + textMetrics.width / 2 + 8, centerY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderPlayhead(ctx, width, height) {
    const duration = this.waveformData.duration;
    const playheadX = (this.currentTime / duration) * width;
    
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    
    // Playhead indicator
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 12);
    ctx.closePath();
    ctx.fill();
  }

  renderHoverTooltip(ctx, hoverInfo) {
    const { x, y, chop, type } = hoverInfo;
    
    let tooltipLines = [];
    let title = '';
    
    if (type === 'chop') {
      title = `Chop ${chop.padId}`;
      const duration = chop.endTime - chop.startTime;
      tooltipLines = [
        `Duration: ${duration.toFixed(3)}s`,
        `Start: ${chop.startTime.toFixed(3)}s`,
        `End: ${chop.endTime.toFixed(3)}s`,
        `Name: ${chop.name}`
      ];
    }
    
    // Calculate tooltip size
    ctx.font = '11px monospace';
    let maxWidth = ctx.measureText(title).width;
    tooltipLines.forEach(line => {
      maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
    });
    
    const padding = 10;
    const lineHeight = 14;
    const tooltipWidth = maxWidth + padding * 2;
    const tooltipHeight = (tooltipLines.length + 1) * lineHeight + padding * 2;
    
    // Position tooltip
    let tooltipX = x + 15;
    let tooltipY = y - tooltipHeight - 10;
    
    if (tooltipX + tooltipWidth > this.canvas.width - 10) {
      tooltipX = x - tooltipWidth - 15;
    }
    if (tooltipY < 10) {
      tooltipY = y + 20;
    }
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
    
    // Draw border
    ctx.strokeStyle = chop ? chop.color : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
    
    // Draw text
    ctx.fillStyle = chop ? chop.color : 'white';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(title, tooltipX + padding, tooltipY + padding + 12);
    
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    tooltipLines.forEach((line, index) => {
      ctx.fillText(line, tooltipX + padding, tooltipY + padding + 12 + (index + 1) * lineHeight);
    });
  }

  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
    
    // Check if hovering over a chop
    const duration = this.waveformData.duration;
    const time = (x / this.canvas.width) * duration;
    
    let hoveredChop = null;
    for (const chop of this.chops) {
      if (time >= chop.startTime && time <= chop.endTime) {
        hoveredChop = chop;
        break;
      }
    }
    
    if (hoveredChop) {
      this.hoveredChopId = hoveredChop.id;
      this.hoverInfo = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        chop: hoveredChop,
        type: 'chop'
      };
      this.canvas.style.cursor = 'pointer';
    } else {
      this.hoveredChopId = null;
      this.hoverInfo = null;
      this.canvas.style.cursor = 'crosshair';
    }
    
    this.renderFrame();
  }

  handleMouseLeave() {
    this.hoveredChopId = null;
    this.hoverInfo = null;
    this.canvas.style.cursor = 'default';
    this.renderFrame();
  }

  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    const duration = this.waveformData.duration;
    const time = (x / this.canvas.width) * duration;
    
    // Check if clicking on a chop
    for (const chop of this.chops) {
      if (time >= chop.startTime && time <= chop.endTime) {
        this.selectedChopId = this.selectedChopId === chop.id ? null : chop.id;
        this.renderFrame();
        return;
      }
    }
    
    // Seek to clicked time
    this.currentTime = time;
    this.updateTimeDisplay();
    this.renderFrame();
  }

  setupEventListeners() {
    // Add overlapping chops
    document.getElementById('addOverlappingChops').addEventListener('click', () => {
      this.chops.push({
        id: `overlap-${Date.now()}`,
        startTime: 1.8,
        endTime: 3.2,
        padId: 'B1',
        name: 'Overlap Test',
        color: '#8b5cf6'
      });
      this.renderFrame();
    });
    
    // Add adjacent chops
    document.getElementById('addAdjacentChops').addEventListener('click', () => {
      this.chops.push({
        id: `adjacent-${Date.now()}`,
        startTime: 5.5,
        endTime: 6.0,
        padId: 'B2',
        name: 'Adjacent Test',
        color: '#ec4899'
      });
      this.renderFrame();
    });
    
    // Clear chops
    document.getElementById('clearChops').addEventListener('click', () => {
      this.chops = [];
      this.selectedChopId = null;
      this.hoveredChopId = null;
      this.renderFrame();
    });
    
    // Toggle playback
    document.getElementById('togglePlayback').addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      document.getElementById('togglePlayback').textContent = 
        this.isPlaying ? 'Stop Playback' : 'Start Playback';
      
      if (this.isPlaying) {
        this.startPlayback();
      } else {
        this.stopPlayback();
      }
    });
    
    // Time slider
    const timeSlider = document.getElementById('timeSlider');
    timeSlider.addEventListener('input', (event) => {
      this.currentTime = parseFloat(event.target.value);
      this.updateTimeDisplay();
      this.renderFrame();
    });
  }

  startPlayback() {
    this.playbackInterval = setInterval(() => {
      this.currentTime += 0.1;
      if (this.currentTime > this.waveformData.duration) {
        this.currentTime = 0;
      }
      
      document.getElementById('timeSlider').value = this.currentTime;
      this.updateTimeDisplay();
      this.renderFrame();
    }, 100);
  }

  stopPlayback() {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  updateTimeDisplay() {
    document.getElementById('timeDisplay').textContent = `${this.currentTime.toFixed(1)}s`;
  }

  startDemo() {
    // Initial render
    this.renderFrame();
    
    // Demo animation loop
    this.animationFrame = requestAnimationFrame(() => {
      this.renderFrame();
      this.startDemo();
    });
  }

  hexToRgba(hex, alpha) {
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  }

  destroy() {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}

// Export for use in other demos or tests
export default ChopVisualizationDemo;