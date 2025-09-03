import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import App from '../App';

// Mock the AuthProvider to avoid authentication dependencies
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>
}));

// Mock the Layout component to avoid UI dependencies
vi.mock('../components/ui/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

// Mock the FeatureTourDialog to avoid UI dependencies
vi.mock('../components/ui/FeatureTourDialog', () => ({
  default: () => <div data-testid="feature-tour" />
}));

// Mock other pages to avoid their dependencies
vi.mock('../pages/ChopperPage', () => ({
  default: () => <div data-testid="chopper-page">ChopperPage</div>
}));

vi.mock('../pages/MySessions', () => ({
  default: () => <div data-testid="my-sessions-page">MySessionsPage</div>
}));

vi.mock('../pages/SequencerPage', () => ({
  default: () => <div data-testid="sequencer-page">SequencerPage</div>
}));

// Mock navigator.onLine for SampleDiscoveryPage
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Sample Discovery Routing', () => {
  it('renders SampleDiscoveryPage when navigating to /sample-discovery', () => {
    render(
      <MemoryRouter initialEntries={['/sample-discovery']}>
        <App />
      </MemoryRouter>
    );

    // Check that the sample discovery page is rendered
    expect(screen.getByText('Sample Discovery')).toBeInTheDocument();
    expect(screen.getByText('Discover vintage samples from the 1950s-1990s')).toBeInTheDocument();
  });

  it('does not affect other routes', () => {
    // Test that ChopperPage still works
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('chopper-page')).toBeInTheDocument();
  });

  it('sample discovery route is completely isolated', () => {
    render(
      <MemoryRouter initialEntries={['/sample-discovery']}>
        <App />
      </MemoryRouter>
    );

    // Verify that SampleDiscoveryPage is rendered
    expect(screen.getByText('Sample Discovery')).toBeInTheDocument();
    
    // Verify that ChopperPage components are NOT rendered
    expect(screen.queryByTestId('chopper-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-sessions-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sequencer-page')).not.toBeInTheDocument();
  });
});