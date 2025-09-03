/**
 * Minimal DiscoveryService for testing
 */

console.log('Minimal DiscoveryService loading...');

export class DiscoveryService {
  constructor() {
    console.log('DiscoveryService constructor called');
    this.test = 'working';
  }

  async discoverSamples() {
    return [{ id: 'test', title: 'Test Sample' }];
  }
}

console.log('Creating instance...');
const discoveryService = new DiscoveryService();
console.log('Instance created');

export { discoveryService };
export default discoveryService;