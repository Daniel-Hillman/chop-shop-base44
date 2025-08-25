import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ChopperPage from '../../../pages/ChopperPage';

// Mock all the complex dependencies
vi.mock('../../waveform/WaveformVisualization.jsx', () => ({
  default: React.forwardRef(({ onChopCreate, onChopUpdate, onTimeSeek, chops }, ref) => {
    React.useImperativeHandle(ref, () => ({
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomToFit: vi.fn()
    }));

    return (
      <div data-testid="waveform-visualization">
        <div data-testid="chop-count">{chops.length}</div>
        <button 
          data-testid="create-chop-from-waveform"
          onClick={() => onChopCreate(5.0, 8.0)}
        >
          Create Chop
        </button>
      </div>
    );
  })
}));

vi.mock('../../waveform/ZoomControls.jsx', () => ({
  default: ({ onZoomIn, onZoomOut, onZoomToFit }) => (
    <div data-testid="zoom-controls">
      <button onClick={onZoomIn}>Zoom In</button>
      <button onClick={onZoomOut}>Zoom Out</button>
      <button onClick={onZoomToFit}>Zoom Fit</button>
    </div>
  )
}));

vi.mock('../../chopper/VideoPlayer.jsx', () => ({
  default: ({ onPlayerReady, setPlayerState }) => {
    React.useEffect(() => {
      // Simulate player ready
      const mockPlayer = {
        getCurrentTime: () => 10.5,
        seekTo: vi.fn(),
        playVideo: vi.fn(),
        pauseVideo: vi.fn()
      };
      onPlayerReady(mockPlayer);
      
      // Simulate player state updates
      setPlayerState({
        currentTime: 10.5,
        duration: 180,
        isPlaying: false
      });
    }, [onPlayerReady, setPlayerState]);

    return <div data-testid="video-player">Video Player</div>;
  }
}));

vi.mock('../../../hooks/useAudioAnalysis.js', () => ({
  useAudioAnalysis: () => ({
    waveformData: new Float32Array([0.1, 0.5, -0.3, 0.8, -0.2]),
    audioBuffer: null,
    analysisStatus: 'ready',
    progress: 100,
    error: null,
    downloadStats: null,
    retry: vi.fn(),
    isCached: false
  })
}));

vi.mock('../../../hooks/useErrorRecovery.js', () => ({
  useAudioErrorRecovery: () => ({
    isRetrying: false,
    retryCount: 0
  })
}));

// Mock other components
vi.mock('../../chopper/Controls.jsx', () => ({
  default: () => <div data-testid="controls">Controls</div>
}));

vi.mock('../../chopper/SessionManager.jsx', () => ({
  default: () => <div data-testid="session-manager">Session Manager</div>
}));

vi.mock('../../chopper/YouTubeCaptureControls.jsx', () => ({
  default: () => <div data-testid="capture-controls">Capture Controls</div>
}));

vi.mock('../../chopper/PadGrid.jsx', () => ({
  default: ({ 
    chops, 
    selectedPadId, 
    setSelectedPadId, 
    onCreateSample,
    onUpdateSample,
    onDeleteSample 
  }) => (
    <div data-testid="pad-grid">
      <div data-testid="selected-pad">{selectedPadId || 'none'}</div>
      <div data-testid="chop-count">{chops.length}</div>
      <button 
        data-testid="select-pad-a0"
        onClick={() => setSelectedPadId('A0')}
      >
        Select A0
      </button>
      <button 
        data-testid="create-sample"
        onClick={() => onCreateSample('A0', 5.0, 8.0)}
      >
        Create Sample
      </button>
      <button 
        data-testid="update-sample"
        onClick={() => onUpdateSample({ padId: 'A0', startTime: 6.0, endTime: 9.0 })}
      >
        Update Sample
      </button>
      <button 
        data-testid="delete-sample"
        onClick={() => onDeleteSample('A0')}
      >
        Delete Sample
      </button>
    </div>
  )
}));

// Mock error boundaries
vi.mock('../../error/WaveformErrorBoundary.jsx', () => ({
  default: ({ children }) => <div data-testid="waveform-error-boundary">{children}</div>
}));

vi.mock('../../error/VideoPlayerErrorBoundary.jsx', () => ({
  default: ({ children }) => <div data-testid="video-error-boundary">{children}</div>
}));

vi.mock('../../error/SamplePlaybackErrorBoundary.jsx', () => ({
  default: ({ children }) => <div data-testid="sample-error-boundary">{children}</div>
}));

describe('ChopperPage Waveform Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('renders all components with waveform integration', async () => {
    render(<ChopperPage />);
    
    // Check that all main components are rendered
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
    expect(screen.getByTestId('waveform-visualization')).toBeInTheDocument();
    expect(screen.getByTestId('pad-grid')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    
    // Check error boundaries are in place
    expect(screen.getByTestId('waveform-error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('video-error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('sample-error-boundary')).toBeInTheDocument();
  });

  it('handles complete chop creation workflow', async () => {
    render(<ChopperPage />);
    
    // Submit a YouTube URL first
    const urlInput = screen.getByPlaceholderText('Paste a YouTube URL to begin...');
    const submitButton = screen.getByText('Load Video');
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('waveform-visualization')).toBeInTheDocument();
    });
    
    // Select a pad first
    fireEvent.click(screen.getByTestId('select-pad-a0'));
    
    await waitFor(() => {
      expect(screen.getByTestId('selected-pad')).toHaveTextContent('A0');
    });
    
    // Create a sample through the pad grid
    fireEvent.click(screen.getByTestId('create-sample'));
    
    await waitFor(() => {
      const allChopCounts = screen.getAllByTestId('chop-count');
      expect(allChopCounts[1]).toHaveTextContent('1'); // Pad grid chop count
    });
    
    // Verify the waveform shows the chop
    const allChopCounts = screen.getAllByTestId('chop-count');
    expect(allChopCounts[0]).toHaveTextContent('1'); // Waveform chop count
  });

  it('handles waveform-driven chop creation', async () => {
    render(<ChopperPage />);
    
    // Submit URL and wait for ready state
    const urlInput = screen.getByPlaceholderText('Paste a YouTube URL to begin...');
    const submitButton = screen.getByText('Load Video');
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('waveform-visualization')).toBeInTheDocument();
    });
    
    // Select a pad first (required for waveform interaction)
    fireEvent.click(screen.getByTestId('select-pad-a0'));
    
    // Create chop from waveform interaction
    fireEvent.click(screen.getByTestId('create-chop-from-waveform'));
    
    await waitFor(() => {
      // Should show the chop was created
      const allChopCounts = screen.getAllByTestId('chop-count');
      expect(allChopCounts[1]).toHaveTextContent('1'); // Pad grid chop count
    });
  });

  it('handles chop updates and deletions', async () => {
    render(<ChopperPage />);
    
    // Setup: Submit URL and create a chop
    const urlInput = screen.getByPlaceholderText('Paste a YouTube URL to begin...');
    const submitButton = screen.getByText('Load Video');
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('waveform-visualization')).toBeInTheDocument();
    });
    
    // Select pad and create sample
    fireEvent.click(screen.getByTestId('select-pad-a0'));
    fireEvent.click(screen.getByTestId('create-sample'));
    
    await waitFor(() => {
      const allChopCounts = screen.getAllByTestId('chop-count');
      expect(allChopCounts[1]).toHaveTextContent('1'); // Pad grid
    });
    
    // Update the sample
    fireEvent.click(screen.getByTestId('update-sample'));
    
    // The chop count should remain the same (just updated)
    await waitFor(() => {
      const allChopCounts = screen.getAllByTestId('chop-count');
      expect(allChopCounts[1]).toHaveTextContent('1'); // Pad grid
    });
    
    // Delete the sample
    fireEvent.click(screen.getByTestId('delete-sample'));
    
    await waitFor(() => {
      const allChopCounts = screen.getAllByTestId('chop-count');
      expect(allChopCounts[1]).toHaveTextContent('0'); // Pad grid
    });
  });

  it('shows proper status messages during workflow', async () => {
    render(<ChopperPage />);
    
    // Initially should show idle state
    expect(screen.getByText('Enter a YouTube URL to load video.')).toBeInTheDocument();
    
    // Submit URL
    const urlInput = screen.getByPlaceholderText('Paste a YouTube URL to begin...');
    const submitButton = screen.getByText('Load Video');
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(submitButton);
    
    // Should show ready state
    await waitFor(() => {
      expect(screen.getByText(/Video ready/)).toBeInTheDocument();
    });
  });

  it('handles URL validation and errors', async () => {
    render(<ChopperPage />);
    
    // Try to submit empty URL
    const submitButton = screen.getByText('Load Video');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a YouTube URL.')).toBeInTheDocument();
    });
    
    // Try invalid URL
    const urlInput = screen.getByPlaceholderText('Paste a YouTube URL to begin...');
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid YouTube URL/)).toBeInTheDocument();
    });
  });

  it('handles offline state', async () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    
    render(<ChopperPage />);
    
    // Try to submit URL while offline
    const urlInput = screen.getByPlaceholderText('Paste a YouTube URL to begin...');
    const submitButton = screen.getByText('Load Video');
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    });
  });

  it('integrates zoom controls with waveform', async () => {
    render(<ChopperPage />);
    
    // Submit URL to enable waveform
    const urlInput = screen.getByPlaceholderText('Paste a YouTube URL to begin...');
    const submitButton = screen.getByText('Load Video');
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
    });
    
    // Test zoom controls are functional
    const zoomInButton = screen.getByText('Zoom In');
    const zoomOutButton = screen.getByText('Zoom Out');
    const zoomFitButton = screen.getByText('Zoom Fit');
    
    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
    expect(zoomFitButton).toBeInTheDocument();
    
    // These should not throw errors
    fireEvent.click(zoomInButton);
    fireEvent.click(zoomOutButton);
    fireEvent.click(zoomFitButton);
  });

  it('maintains backward compatibility with existing workflow', async () => {
    render(<ChopperPage />);
    
    // The existing workflow should still work:
    // 1. Load video
    // 2. Select pad
    // 3. Create sample via pad grid
    // 4. Edit sample
    
    // Load video
    const urlInput = screen.getByPlaceholderText('Paste a YouTube URL to begin...');
    const submitButton = screen.getByText('Load Video');
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Video ready/)).toBeInTheDocument();
    });
    
    // Select pad (existing workflow)
    fireEvent.click(screen.getByTestId('select-pad-a0'));
    
    await waitFor(() => {
      expect(screen.getByTestId('selected-pad')).toHaveTextContent('A0');
    });
    
    // Create sample (existing workflow)
    fireEvent.click(screen.getByTestId('create-sample'));
    
    await waitFor(() => {
      expect(screen.getByTestId('chop-count')).toHaveTextContent('1');
    });
    
    // The waveform should show the same chop
    const allChopCounts = screen.getAllByTestId('chop-count');
    expect(allChopCounts).toHaveLength(2); // One from waveform, one from pad grid
    expect(allChopCounts[0]).toHaveTextContent('1'); // Waveform
    expect(allChopCounts[1]).toHaveTextContent('1'); // Pad grid
  });
});