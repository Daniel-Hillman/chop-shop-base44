# Sequencer Components

This directory contains React components for the drum sequencer feature.

## Components

### TransportControls

The main transport controls component that provides play/pause/stop functionality, BPM control, and swing control.

**Props:**
- `isPlaying` (boolean): Whether the sequencer is currently playing
- `isPaused` (boolean): Whether the sequencer is paused
- `bpm` (number): Current BPM value (60-200)
- `swing` (number): Current swing percentage (0-100)
- `isInitialized` (boolean): Whether the sequencer is initialized and ready
- `onPlay` (function): Callback for play button
- `onPause` (function): Callback for pause button
- `onStop` (function): Callback for stop button
- `onBpmChange` (function): Callback for BPM changes
- `onSwingChange` (function): Callback for swing changes

**Features:**
- Play/Pause/Stop buttons with visual state feedback
- BPM input with validation (60-200 range)
- Swing slider with percentage display
- Real-time visual feedback for transport state
- Keyboard support (Enter to commit BPM changes)
- Disabled state when not initialized

### StepResolutionSelector

Component for selecting step resolution (1/8, 1/16, 1/32) with pattern preservation warnings.

**Props:**
- `resolution` (number): Current step resolution (8, 16, or 32)
- `onResolutionChange` (function): Callback for resolution changes
- `isInitialized` (boolean): Whether the sequencer is initialized
- `hasPatternData` (boolean): Whether there's existing pattern data

**Features:**
- Visual selection of step resolution options
- Warning modal when changing resolution with existing pattern data
- Current resolution display
- Pattern data preservation warnings
- Disabled state when not initialized

## Usage Example

```jsx
import TransportControls from '../components/sequencer/TransportControls';
import StepResolutionSelector from '../components/sequencer/StepResolutionSelector';

function SequencerPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [resolution, setResolution] = useState(16);

  return (
    <div>
      <TransportControls
        isPlaying={isPlaying}
        bpm={bpm}
        swing={swing}
        isInitialized={true}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onStop={() => setIsPlaying(false)}
        onBpmChange={setBpm}
        onSwingChange={setSwing}
      />
      
      <StepResolutionSelector
        resolution={resolution}
        onResolutionChange={setResolution}
        isInitialized={true}
        hasPatternData={false}
      />
    </div>
  );
}
```

## Integration

These components are designed to integrate with the sequencer services:
- `SequencerEngine` for transport control
- `PatternManager` for step resolution changes
- `AudioScheduler` for timing and swing

## Testing

All components include comprehensive unit tests covering:
- Rendering and visual states
- User interactions
- Prop validation
- Error handling
- Integration scenarios

Run tests with:
```bash
npm test -- src/components/sequencer
```

## Styling

Components follow the existing design system:
- Dark mode color palette
- Consistent button styling
- Backdrop blur effects
- Smooth animations with Framer Motion
- Responsive design patterns