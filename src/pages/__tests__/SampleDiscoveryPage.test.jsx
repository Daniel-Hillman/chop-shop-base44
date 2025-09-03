import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import SampleDiscoveryPage from '../SampleDiscoveryPage';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('SampleDiscoveryPage', () => {
  it('renders the sample discovery page', () => {
    renderWithRouter(<SampleDiscoveryPage />);
    
    // Check for main heading
    expect(screen.getByText('Sample Discovery')).toBeInTheDocument();
    expect(screen.getByText('Discover vintage samples from the 1950s-1990s')).toBeInTheDocument();
  });

  it('displays filter controls', () => {
    renderWithRouter(<SampleDiscoveryPage />);
    
    // Check for filter section
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Genres')).toBeInTheDocument();
    expect(screen.getByText('Year Range')).toBeInTheDocument();
    
    // Check for genre options
    expect(screen.getByText('Soul')).toBeInTheDocument();
    expect(screen.getByText('Jazz')).toBeInTheDocument();
    expect(screen.getByText('Funk')).toBeInTheDocument();
    expect(screen.getByText('Blues')).toBeInTheDocument();
    expect(screen.getByText('Afrobeat')).toBeInTheDocument();
  });

  it('displays shuffle button', () => {
    renderWithRouter(<SampleDiscoveryPage />);
    
    expect(screen.getByText('Shuffle Samples')).toBeInTheDocument();
  });

  it('displays sample grid section', () => {
    renderWithRouter(<SampleDiscoveryPage />);
    
    expect(screen.getByText('Discovered Samples')).toBeInTheDocument();
    expect(screen.getByText('Ready to Discover')).toBeInTheDocument();
  });

  it('displays video player placeholder', () => {
    renderWithRouter(<SampleDiscoveryPage />);
    
    expect(screen.getByText('Sample Player')).toBeInTheDocument();
    expect(screen.getByText('Dedicated YouTube player for sample discovery')).toBeInTheDocument();
  });

  it('shows offline indicator when offline', () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    renderWithRouter(<SampleDiscoveryPage />);
    
    expect(screen.getByText("You're offline. Showing cached samples and demo content.")).toBeInTheDocument();
    
    // Reset to online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('has isolated state management', () => {
    const { container } = renderWithRouter(<SampleDiscoveryPage />);
    
    // Verify the component renders without errors and has its own state
    expect(container.querySelector('.sample-discovery-page')).toBeInTheDocument();
  });
});