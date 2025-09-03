/**
 * Debug version of DiscoveryService to test imports
 */

console.log('Starting DiscoveryService debug import...');

try {
  console.log('Importing types...');
  const { validateFilterState, validateSampleData } = await import('../../types/discovery.js');
  console.log('Types imported successfully');

  console.log('Importing YouTubeIntegration...');
  const youTubeIntegration = await import('./YouTubeIntegration.js');
  console.log('YouTubeIntegration imported successfully');

  console.log('Importing MockSampleProvider...');
  const MockSampleProvider = await import('./MockSampleProvider.js');
  console.log('MockSampleProvider imported successfully');

  console.log('Importing DiscoveryCacheManager...');
  const DiscoveryCacheManager = await import('./DiscoveryCacheManager.js');
  console.log('DiscoveryCacheManager imported successfully');

  console.log('Importing DiscoveryErrorService...');
  const discoveryErrorService = await import('./DiscoveryErrorService.js');
  console.log('DiscoveryErrorService imported successfully');

  console.log('Importing DiscoveryPerformanceMonitor...');
  const DiscoveryPerformanceMonitor = await import('./DiscoveryPerformanceMonitor.js');
  console.log('DiscoveryPerformanceMonitor imported successfully');

  console.log('All imports successful!');

} catch (error) {
  console.error('Import failed:', error);
}

export const testExport = 'test';