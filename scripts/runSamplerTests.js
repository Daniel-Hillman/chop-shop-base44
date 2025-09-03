#!/usr/bin/env node

/**
 * Sampler Drum Sequencer Test Execution Script
 * 
 * This script runs the comprehensive test suite for the sampler drum sequencer
 * and generates detailed reports on test coverage, performance benchmarks,
 * and requirements validation.
 * 
 * Usage:
 *   node scripts/runSamplerTests.js [options]
 * 
 * Options:
 *   --unit          Run only unit tests
 *   --integration   Run only integration tests
 *   --performance   Run only performance benchmarks
 *   --workflow      Run only workflow tests
 *   --youtube       Run only YouTube integration tests
 *   --coverage      Generate coverage report
 *   --benchmark     Generate performance benchmark report
 *   --requirements  Generate requirements validation report
 *   --verbose       Enable verbose output
 *   --watch         Run tests in watch mode
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  unit: args.includes('--unit'),
  integration: args.includes('--integration'),
  performance: args.includes('--performance'),
  workflow: args.includes('--workflow'),
  youtube: args.includes('--youtube'),
  coverage: args.includes('--coverage'),
  benchmark: args.includes('--benchmark'),
  requirements: args.includes('--requirements'),
  verbose: args.includes('--verbose'),
  watch: args.includes('--watch')
};

// If no specific test type is specified, run all tests
const runAll = !options.unit && !options.integration && !options.performance && 
               !options.workflow && !options.youtube;

class TestRunner {
  constructor() {
    this.results = {
      summary: { total: 0, passed: 0, failed: 0, duration: 0 },
      categories: {},
      coverage: { statements: 0, branches: 0, functions: 0, lines: 0 },
      benchmarks: [],
      requirements: new Map()
    };
    
    this.reportDir = join(projectRoot, 'test-reports', 'sampler');
    this.ensureReportDirectory();
  }

  ensureReportDirectory() {
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      benchmark: '⚡'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTestCategory(category, pattern) {
    this.log(`Running ${category} tests...`);
    
    const startTime = Date.now();
    let command = `npx vitest run --reporter=json`;
    
    if (pattern) {
      command += ` --testNamePattern="${pattern}"`;
    }
    
    if (options.coverage) {
      command += ' --coverage';
    }
    
    if (options.watch) {
      command += ' --watch';
    }
    
    try {
      const output = execSync(command, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: options.verbose ? 'inherit' : 'pipe'
      });
      
      const duration = Date.now() - startTime;
      
      // Parse JSON output if available
      let results;
      try {
        results = JSON.parse(output);
      } catch (e) {
        // Fallback for non-JSON output
        results = this.parseTextOutput(output);
      }
      
      this.results.categories[category] = {
        ...results,
        duration
      };
      
      this.log(`${category} tests completed in ${duration}ms`, 'success');
      return results;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`${category} tests failed: ${error.message}`, 'error');
      
      this.results.categories[category] = {
        passed: 0,
        failed: 1,
        total: 1,
        duration,
        error: error.message
      };
      
      return { passed: 0, failed: 1, total: 1 };
    }
  }

  parseTextOutput(output) {
    // Simple parser for text output
    const lines = output.split('\n');
    let passed = 0, failed = 0, total = 0;
    
    lines.forEach(line => {
      if (line.includes('✓') || line.includes('PASS')) passed++;
      if (line.includes('✗') || line.includes('FAIL')) failed++;
    });
    
    total = passed + failed;
    
    return { passed, failed, total };
  }

  async runUnitTests() {
    if (!runAll && !options.unit) return;
    
    const patterns = [
      'SamplerTransportControls',
      'SamplerSequencerGrid',
      'SamplerBankNavigation',
      'SamplerTapTempo',
      'SamplerSequencerStep'
    ];
    
    for (const pattern of patterns) {
      await this.runTestCategory(`unit-${pattern}`, pattern);
    }
  }

  async runIntegrationTests() {
    if (!runAll && !options.integration) return;
    
    await this.runTestCategory('integration', 'Integration');
    await this.runTestCategory('chop-integration', 'ChopIntegration');
  }

  async runPerformanceTests() {
    if (!runAll && !options.performance) return;
    
    this.log('Running performance benchmarks...', 'benchmark');
    await this.runTestCategory('performance', 'Performance');
    await this.runTestCategory('benchmarks', 'Benchmark');
  }

  async runWorkflowTests() {
    if (!runAll && !options.workflow) return;
    
    await this.runTestCategory('workflow', 'Workflow');
    await this.runTestCategory('comprehensive', 'Comprehensive');
  }

  async runYouTubeTests() {
    if (!runAll && !options.youtube) return;
    
    await this.runTestCategory('youtube', 'YouTube');
  }

  generateSummary() {
    const categories = Object.values(this.results.categories);
    
    this.results.summary = {
      total: categories.reduce((sum, cat) => sum + (cat.total || 0), 0),
      passed: categories.reduce((sum, cat) => sum + (cat.passed || 0), 0),
      failed: categories.reduce((sum, cat) => sum + (cat.failed || 0), 0),
      duration: categories.reduce((sum, cat) => sum + (cat.duration || 0), 0)
    };
    
    this.results.summary.passRate = this.results.summary.total > 0 
      ? (this.results.summary.passed / this.results.summary.total * 100).toFixed(2)
      : 0;
  }

  generateReports() {
    this.log('Generating test reports...');
    
    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      categories: this.results.categories,
      coverage: this.results.coverage,
      benchmarks: this.results.benchmarks,
      requirements: Object.fromEntries(this.results.requirements)
    };
    
    writeFileSync(
      join(this.reportDir, 'test-results.json'),
      JSON.stringify(jsonReport, null, 2)
    );
    
    // Generate HTML report
    this.generateHTMLReport(jsonReport);
    
    // Generate requirements report
    if (options.requirements) {
      this.generateRequirementsReport();
    }
    
    // Generate benchmark report
    if (options.benchmark) {
      this.generateBenchmarkReport();
    }
    
    this.log(`Reports generated in ${this.reportDir}`, 'success');
  }

  generateHTMLReport(data) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sampler Drum Sequencer Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header .subtitle { opacity: 0.9; margin-top: 10px; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #667eea; }
        .metric .value { font-size: 2em; font-weight: bold; color: #333; }
        .metric .label { color: #666; margin-top: 5px; }
        .category { margin-bottom: 30px; }
        .category h3 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .category-item { background: #f8f9fa; padding: 15px; border-radius: 6px; }
        .status-passed { border-left: 4px solid #28a745; }
        .status-failed { border-left: 4px solid #dc3545; }
        .status-warning { border-left: 4px solid #ffc107; }
        .benchmark { background: #e3f2fd; border-left: 4px solid #2196f3; }
        .requirement { background: #f3e5f5; border-left: 4px solid #9c27b0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎵 Sampler Drum Sequencer</h1>
            <div class="subtitle">Comprehensive Test Suite Report</div>
            <div class="subtitle">Generated: ${data.timestamp}</div>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="metric">
                    <div class="value">${data.summary.total}</div>
                    <div class="label">Total Tests</div>
                </div>
                <div class="metric">
                    <div class="value" style="color: #28a745">${data.summary.passed}</div>
                    <div class="label">Passed</div>
                </div>
                <div class="metric">
                    <div class="value" style="color: #dc3545">${data.summary.failed}</div>
                    <div class="label">Failed</div>
                </div>
                <div class="metric">
                    <div class="value">${data.summary.passRate}%</div>
                    <div class="label">Pass Rate</div>
                </div>
                <div class="metric">
                    <div class="value">${(data.summary.duration / 1000).toFixed(2)}s</div>
                    <div class="label">Duration</div>
                </div>
            </div>
            
            <div class="category">
                <h3>📊 Test Categories</h3>
                <div class="category-grid">
                    ${Object.entries(data.categories).map(([name, results]) => `
                        <div class="category-item ${results.failed > 0 ? 'status-failed' : 'status-passed'}">
                            <h4>${name.toUpperCase()}</h4>
                            <p>Passed: ${results.passed || 0}</p>
                            <p>Failed: ${results.failed || 0}</p>
                            <p>Duration: ${((results.duration || 0) / 1000).toFixed(2)}s</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${data.benchmarks && data.benchmarks.length > 0 ? `
            <div class="category">
                <h3>⚡ Performance Benchmarks</h3>
                <div class="category-grid">
                    ${data.benchmarks.map(benchmark => `
                        <div class="category-item benchmark">
                            <h4>${benchmark.name}</h4>
                            <p>Value: ${benchmark.value}${benchmark.unit}</p>
                            <p>Target: ${benchmark.target}${benchmark.unit}</p>
                            <p>Status: ${benchmark.passed ? '✅ Passed' : '❌ Failed'}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="category">
                <h3>🎯 Requirements Coverage</h3>
                <div class="category-grid">
                    ${Object.entries(data.requirements || {}).map(([reqId, tests]) => `
                        <div class="category-item requirement">
                            <h4>Requirement ${reqId}</h4>
                            <p>Tests: ${tests.length}</p>
                            <p>Status: ${tests.every(t => t.status === 'passed') ? '✅ Covered' : '❌ Issues'}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    writeFileSync(join(this.reportDir, 'test-report.html'), html);
  }

  generateRequirementsReport() {
    const requirements = {
      '1.1': 'Display sequencer component alongside existing chopper functionality',
      '1.2': 'Automatically map chops to sequencer tracks',
      '1.3': 'Store pattern and timestamp data for playback',
      '1.4': 'Jump YouTube video to corresponding chop timestamp',
      '1.5': 'Update sequencer when switching between banks',
      '2.1': 'Begin pattern playback when Start button is clicked',
      '2.2': 'Halt playback and reset when Stop button is clicked',
      '2.3': 'Update playback speed in real-time when BPM is adjusted',
      '2.4': 'Calculate and set BPM based on tap intervals',
      '2.5': 'Register tap tempo input via space bar',
      '2.6': 'Require minimum of 4 taps for accuracy',
      '3.1': 'Show 16 tracks simultaneously',
      '3.2': 'Toggle trigger when grid cell is clicked',
      '3.3': 'Display track with chop visual styling when assigned',
      '3.4': 'Display empty track when no chop is assigned',
      '3.5': 'Store trigger on empty track without producing audio',
      '3.6': 'Jump to YouTube timestamp when trigger is on assigned track',
      '4.1': 'Show navigation controls for switching banks',
      '4.2': 'Switch to corresponding bank when navigation button is clicked',
      '4.3': 'Organize 64 chops into 4 banks of 16 chops each',
      '4.4': 'Initially support 2 banks with expansion capability',
      '4.5': 'Preserve pattern data when switching banks',
      '4.6': 'Display empty tracks when bank contains no chops',
      '5.1': 'Minimize visual effects and animations on pad grid',
      '5.2': 'Maintain precise timing without drift',
      '5.3': 'Respond immediately to grid interactions',
      '5.4': 'Use efficient data structures and avoid unnecessary re-renders',
      '5.5': 'Not cause performance degradation to existing functionality',
      '5.6': 'Handle pattern data efficiently',
      '6.1': 'Use same visual styling as existing pages',
      '6.2': 'Use consistent color schemes and typography',
      '6.3': 'Behave similarly to existing transport controls',
      '6.4': 'Maintain existing layout structure',
      '6.5': 'Use same backdrop blur and border styling',
      '7.1': 'Automatically assign new chop to next available track',
      '7.2': 'Update sequencer when chop is deleted',
      '7.3': 'Continue to trigger updated timestamps after modification',
      '7.4': 'Use existing YouTube player integration',
      '7.5': 'Maintain chop assignments and pattern data when switching modes',
      '8.1': 'Occupy minimal screen space',
      '8.2': 'Provide immediate visual feedback',
      '8.3': 'Register space bar input equivalently to button clicks',
      '8.4': 'Require minimum of 4 taps before setting BPM',
      '8.5': 'Reset tap counter after timeout period',
      '8.6': 'Round to nearest whole number for usability'
    };

    const report = {
      timestamp: new Date().toISOString(),
      totalRequirements: Object.keys(requirements).length,
      coveredRequirements: this.results.requirements.size,
      coveragePercentage: (this.results.requirements.size / Object.keys(requirements).length * 100).toFixed(2),
      requirements: Object.entries(requirements).map(([id, description]) => ({
        id,
        description,
        covered: this.results.requirements.has(id),
        tests: this.results.requirements.get(id) || []
      }))
    };

    writeFileSync(
      join(this.reportDir, 'requirements-report.json'),
      JSON.stringify(report, null, 2)
    );
  }

  generateBenchmarkReport() {
    const report = {
      timestamp: new Date().toISOString(),
      benchmarks: this.results.benchmarks,
      summary: {
        total: this.results.benchmarks.length,
        passed: this.results.benchmarks.filter(b => b.passed).length,
        failed: this.results.benchmarks.filter(b => !b.passed).length
      }
    };

    writeFileSync(
      join(this.reportDir, 'benchmark-report.json'),
      JSON.stringify(report, null, 2)
    );
  }

  async run() {
    this.log('🚀 Starting Sampler Drum Sequencer Test Suite');
    
    const startTime = Date.now();
    
    try {
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runPerformanceTests();
      await this.runWorkflowTests();
      await this.runYouTubeTests();
      
      this.generateSummary();
      this.generateReports();
      
      const totalDuration = Date.now() - startTime;
      
      this.log(`🎉 Test suite completed in ${(totalDuration / 1000).toFixed(2)}s`, 'success');
      this.log(`📊 Results: ${this.results.summary.passed}/${this.results.summary.total} tests passed (${this.results.summary.passRate}%)`, 'success');
      
      if (this.results.summary.failed > 0) {
        this.log(`❌ ${this.results.summary.failed} tests failed`, 'error');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run the test suite
const runner = new TestRunner();
runner.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});