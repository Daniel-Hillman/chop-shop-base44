# Design Document

## Overview

The drum sequencer feature will be implemented as a dedicated page within the existing YouTube Audio Sampler application. It will provide a professional-grade drum pattern sequencer with precise timing, low-latency playback, and comprehensive track controls. The sequencer will integrate seamlessly with the existing architecture while maintaining visual consistency with the current dark mode design.

## Architecture

### High-Level Architecture

The sequencer will follow the existing application's architecture patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Sequencer Page                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Sequencer     │  │   Track         │  │   Transport     │ │
│  │   Grid          │  │   Controls      │  │   Controls      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Sequencer Engine                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Audio         │  │   Pattern       │  │   Sample        │ │
│  │   Scheduler     │  │   Manager       │  │   Manager       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              Existing Audio Infrastructure                  │
│  (SamplePlaybackEngine, AudioProcessingService, etc.)      │
└─────────────────────────────────────────────────────────────┘
```

### Integration with Existing Systems

The sequencer will leverage existing services:
- **SamplePlaybackEngine**: For sample playback and audio context management
- **AudioProcessingService**: For audio file processing and caching
- **StorageManager**: For pattern persistence and sample storage
- **PerformanceMonitor**: For performance tracking and optimization
- **ErrorRecoveryService**: For robust error handling

## Components and Interfaces

### Core Components

#### 1. SequencerPage Component
```jsx
// Main page component that orchestrates the sequencer interface
const SequencerPage = () => {
  // State management for sequencer
  // Integration with routing
  // Layout and responsive design
}
```

#### 2. SequencerGrid Component
```jsx
// Visual grid for step programming
const SequencerGrid = ({ 
  pattern, 
  currentStep, 
  stepResolution, 
  onStepToggle 
}) => {
  // Dynamic grid rendering based on step resolution
  // Visual playhead indicator
  // Step activation/deactivation
}
```

#### 3. TransportControls Component
```jsx
// Play/pause, BPM, swing controls
const TransportControls = ({ 
  isPlaying, 
  bpm, 
  swing, 
  onPlayPause, 
  onBpmChange, 
  onSwingChange 
}) => {
  // Transport state management
  // BPM validation and constraints
  // Swing percentage control
}
```

#### 4. TrackControls Component
```jsx
// Per-track volume, mute, solo, randomization
const TrackControls = ({ 
  tracks, 
  onVolumeChange, 
  onRandomizationChange 
}) => {
  // Individual track control panels
  // Randomization settings per track
  // Visual feedback for track states
}
```

#### 5. StepResolutionSelector Component
```jsx
// Resolution selector (1/8, 1/16, 1/32)
const StepResolutionSelector = ({ 
  resolution, 
  onResolutionChange 
}) => {
  // Resolution options
  // Grid update handling
  // Pattern preservation logic
}
```

### Service Layer

#### 1. SequencerEngine Service
```javascript
class SequencerEngine {
  constructor() {
    this.audioContext = null;
    this.scheduler = null;
    this.patternManager = null;
    this.sampleManager = null;
    this.isPlaying = false;
    this.currentStep = 0;
    this.nextStepTime = 0;
  }

  // Core sequencer functionality
  start()
  stop()
  pause()
  setBPM(bpm)
  setSwing(swing)
  setStepResolution(resolution)
  scheduleNextStep()
}
```

#### 2. AudioScheduler Service
```javascript
class AudioScheduler {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.lookahead = 25.0; // 25ms lookahead
    this.scheduleAheadTime = 0.1; // 100ms scheduling window
  }

  // Precise audio scheduling using Web Audio API
  scheduleNote(time, sample, velocity, randomization)
  calculateSwingTiming(stepTime, swingAmount)
  applyRandomization(timing, velocity, randomizationSettings)
}
```

#### 3. PatternManager Service
```javascript
class PatternManager {
  constructor() {
    this.patterns = new Map();
    this.currentPattern = null;
    this.stepResolution = 16; // Default to 1/16 notes
  }

  // Pattern management
  createPattern(name, tracks, steps)
  loadPattern(patternId)
  savePattern(pattern)
  toggleStep(trackId, stepIndex)
  clearPattern()
  duplicatePattern(patternId)
}
```

#### 4. SampleManager Service
```javascript
class SampleManager {
  constructor() {
    this.samples = new Map();
    this.samplePlaybackEngine = null;
  }

  // Sample management and preloading
  loadSamplePack(packId)
  preloadSamples(sampleList)
  getSample(sampleId)
  assignSampleToTrack(trackId, sampleId)
}
```

## Data Models

### Pattern Data Structure
```javascript
const Pattern = {
  id: 'pattern_uuid',
  name: 'My Drum Pattern',
  bpm: 120,
  swing: 0, // 0-100%
  stepResolution: 16, // 8, 16, or 32
  tracks: [
    {
      id: 'kick',
      name: 'Kick',
      sampleId: 'kick_001',
      volume: 0.8,
      mute: false,
      solo: false,
      randomization: {
        velocity: 0, // 0-100%
        timing: 0    // 0-100%
      },
      steps: [
        { active: true, velocity: 1.0 },  // Step 0
        { active: false, velocity: 0.7 }, // Step 1
        // ... up to stepResolution
      ]
    }
    // ... more tracks
  ],
  metadata: {
    created: '2025-01-27T10:00:00Z',
    modified: '2025-01-27T10:30:00Z',
    userId: 'user_uuid'
  }
}
```

### Track Configuration
```javascript
const TrackConfig = {
  id: 'track_id',
  name: 'Track Name',
  sampleId: 'sample_uuid',
  volume: 0.8, // 0.0 - 1.0
  mute: false,
  solo: false,
  color: '#06b6d4', // Visual color for UI
  randomization: {
    velocity: {
      enabled: false,
      amount: 0 // 0-100%
    },
    timing: {
      enabled: false,
      amount: 0 // 0-100%
    }
  }
}
```

### Sample Data Structure
```javascript
const Sample = {
  id: 'sample_uuid',
  name: 'Kick 001',
  filename: 'kick_001.wav',
  audioBuffer: AudioBuffer, // Web Audio API buffer
  metadata: {
    duration: 0.5,
    sampleRate: 44100,
    channels: 1,
    size: 44100 // bytes
  },
  tags: ['kick', 'drum', 'electronic']
}
```

## Error Handling

### Error Recovery Strategy

The sequencer will implement comprehensive error handling:

1. **Audio Context Errors**: Automatic recovery and re-initialization
2. **Sample Loading Errors**: Fallback samples and user notification
3. **Timing Drift**: Automatic correction and monitoring
4. **Performance Issues**: Graceful degradation and optimization

### Error Boundaries

```jsx
// Sequencer-specific error boundary
const SequencerErrorBoundary = ({ children }) => {
  // Handle sequencer-specific errors
  // Provide recovery options
  // Maintain user data integrity
}
```

## Testing Strategy

### Unit Testing

- **SequencerEngine**: Timing accuracy, BPM changes, pattern management
- **AudioScheduler**: Scheduling precision, swing calculations, randomization
- **PatternManager**: Pattern CRUD operations, step resolution changes
- **SampleManager**: Sample loading, assignment, preloading

### Integration Testing

- **Audio Pipeline**: End-to-end audio playback testing
- **UI Interactions**: Grid interactions, transport controls, real-time updates
- **Performance**: Memory usage, CPU utilization, audio latency

### Performance Testing

- **Timing Precision**: Measure actual vs. expected timing
- **Memory Usage**: Monitor audio buffer and pattern storage
- **CPU Usage**: Ensure smooth operation during playback
- **Audio Latency**: Measure and optimize playback latency

## Backend Integration Strategy

### Firebase/Firestore Data Structure

#### Pattern Storage
```javascript
// Firestore collection: /users/{userId}/sequencer_patterns/{patternId}
const FirestorePattern = {
  id: 'pattern_uuid',
  name: 'My Pattern',
  bpm: 120,
  swing: 0,
  stepResolution: 16,
  tracks: [
    {
      id: 'kick',
      name: 'Kick',
      sampleId: 'kick_001',
      volume: 0.8,
      steps: [true, false, true, false, ...], // Simplified boolean array
      randomization: { velocity: 0, timing: 0 }
    }
  ],
  metadata: {
    created: Timestamp,
    modified: Timestamp,
    public: false,
    tags: ['electronic', 'house']
  }
}
```

#### Sample Library Storage
```javascript
// Firestore collection: /sample_packs/{packId}
const SamplePack = {
  id: 'pack_uuid',
  name: 'Electronic Drums Vol. 1',
  description: 'High-quality electronic drum samples',
  samples: [
    {
      id: 'kick_001',
      name: 'Kick 001',
      filename: 'kick_001.wav',
      storageUrl: 'gs://bucket/samples/kick_001.wav',
      metadata: { duration: 0.5, size: 44100 }
    }
  ],
  metadata: {
    created: Timestamp,
    public: true,
    downloadCount: 1250
  }
}
```

### Google Cloud Storage Strategy

#### Sample File Organization
```
gs://chop-stop-samples/
├── packs/
│   ├── electronic-drums-v1/
│   │   ├── kick_001.wav
│   │   ├── snare_001.wav
│   │   └── hihat_001.wav
│   └── acoustic-drums-v1/
│       ├── kick_acoustic_001.wav
│       └── snare_acoustic_001.wav
└── user-uploads/
    └── {userId}/
        ├── custom_kick.wav
        └── custom_snare.wav
```

### Firebase Auth Rules

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User patterns - private by default
    match /users/{userId}/sequencer_patterns/{patternId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public sample packs - read-only for authenticated users
    match /sample_packs/{packId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                   request.auth.token.admin == true;
    }
    
    // User sample uploads
    match /users/{userId}/samples/{sampleId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Cloud Storage Rules

```javascript
// Storage Security Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Public sample packs - read access for authenticated users
    match /packs/{allPaths=**} {
      allow read: if request.auth != null;
    }
    
    // User uploads - private access
    match /user-uploads/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Firestore Indexing Requirements

```javascript
// Required composite indexes
const requiredIndexes = [
  {
    collection: 'users/{userId}/sequencer_patterns',
    fields: [
      { field: 'metadata.created', order: 'desc' },
      { field: 'metadata.public', order: 'asc' }
    ]
  },
  {
    collection: 'sample_packs',
    fields: [
      { field: 'metadata.public', order: 'asc' },
      { field: 'metadata.downloadCount', order: 'desc' }
    ]
  }
];
```

### Cross-Session State Sync Strategy

#### Real-time Pattern Sync (Future Feature)
```javascript
// Firestore real-time listener for pattern changes
const PatternSyncService = {
  subscribeToPattern(patternId, callback) {
    return db.collection('users')
      .doc(userId)
      .collection('sequencer_patterns')
      .doc(patternId)
      .onSnapshot(callback);
  },
  
  updatePattern(patternId, changes) {
    return db.collection('users')
      .doc(userId)
      .collection('sequencer_patterns')
      .doc(patternId)
      .update({
        ...changes,
        'metadata.modified': FieldValue.serverTimestamp()
      });
  }
};
```

## Performance Optimization

### Audio Performance

1. **Web Audio API Scheduling**: Use precise scheduling with lookahead
2. **Sample Preloading**: Load all samples before playback starts
3. **Memory Management**: Efficient buffer management and cleanup
4. **Worker Threads**: Offload heavy computations to Web Workers

### UI Performance

1. **Virtual Scrolling**: For large patterns with many steps
2. **Memoization**: React.memo for expensive components
3. **Debounced Updates**: Prevent excessive re-renders during BPM changes
4. **Canvas Rendering**: Use canvas for complex visualizations

### Memory Management

1. **Sample Caching**: Intelligent caching with LRU eviction
2. **Pattern Compression**: Compress inactive patterns
3. **Garbage Collection**: Proper cleanup of audio resources
4. **Memory Monitoring**: Track and alert on memory usage

## Visual Design Integration

### Color Palette Integration

The sequencer will use the existing color palette:
- Primary: `#06b6d4` (cyan-500)
- Secondary: `#3b82f6` (blue-500)
- Accent: `#8b5cf6` (violet-500)
- Success: `#10b981` (emerald-500)
- Warning: `#f59e0b` (amber-500)
- Error: `#ef4444` (red-500)

### Component Styling

```css
/* Sequencer-specific styles following existing patterns */
.sequencer-grid {
  @apply bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl;
}

.sequencer-step {
  @apply bg-white/10 hover:bg-white/20 transition-all duration-200;
}

.sequencer-step.active {
  @apply bg-cyan-500/60 shadow-lg shadow-cyan-500/20;
}

.sequencer-playhead {
  @apply bg-cyan-400 shadow-lg shadow-cyan-400/50;
}
```

### Responsive Design

- **Desktop**: Full-featured interface with all controls visible
- **Tablet**: Collapsible panels, touch-optimized controls
- **Mobile**: Simplified interface, essential controls only

## Development Phases

### Phase 1: Core Engine (Week 1)
- SequencerEngine implementation
- AudioScheduler with precise timing
- Basic pattern management
- Transport controls (play/pause/stop)

### Phase 2: UI Components (Week 2)
- SequencerGrid with step programming
- TrackControls with volume/mute
- BPM and swing controls
- Visual playhead indicator

### Phase 3: Advanced Features (Week 3)
- Step resolution switching
- Randomization features
- Sample management integration
- Performance optimization

### Phase 4: Backend Integration (Week 4)
- Firebase pattern storage
- Sample library integration
- User authentication
- Cloud storage setup

### Phase 5: Testing & Polish (Week 5)
- Comprehensive testing
- Performance optimization
- UI/UX refinements
- Documentation