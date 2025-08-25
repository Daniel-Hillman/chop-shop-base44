#!/usr/bin/env node

/**
 * Comprehensive Waveform Testing Script
 * Runs all test suites and generates detailed reports
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  suites: [
    {
      name: 'End-to-End Workflow Tests',
      pattern: 'src/components/waveform/__tests__/WaveformWorkflow.e2e.test.js',
      timeout: 30000,
      priority: 1
    },
    {
      name: 'Performance Benchmark Tests',
      pattern: 'src/components/waveform/__tests__/WaveformPerformance.benchmark.test.js',
      timeout: 60000,
      priority: 2
    },
    {
      name: 'Cross-Browser Compatibility Tests',
      pattern: 'src/components/waveform/__tests__/WaveformCrossBrowser.test.js',
      timeout: 45000,
      priority: 3
    },
    {
      name: 'User Acceptance Tests',
      pattern: 'src/components/waveform/__tests__/WaveformUserAcceptance.test.js',
      timeout: 30000,
      priority: 4
    },
    {
      name: 'Comprehensive Requirements Validation',
      pattern: 'src/components/waveform/__tests__/WaveformValidation.comprehensive.test.js',
      timeout: 120000,
      priority: 5
    }
  ],
  reportDir: 'test-reports/waveform',
  formats: ['json', 'html', 'junit']
};

class WaveformTestRunner {
  constructor() {
    this.results = {};
    this.startTime = null;
    this.endTime = null;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

  async runAllTests() {
    console.log('🌊 Starting Comprehensive Waveform Testing Suite');
    console.log('================================================\n');
    
    this.startTime = new Date();
    
    // Ensure report directory exists
    this.ensureReportDirectory();
    
    // Run each test suite
    for (const suite of TEST_CONFIG.suites) {
      await this.runTestSuite(suite);
    }
    
    this.endTime = new Date();
    
    // Generate reports
    await this.generateReports();
    
    // Display summary
    this.displaySummary();
    
    // Exit with appropriate code
    process.exit(this.failedTests > 0 ? 1 : 0);
  }

  ensureReportDirectory() {
    try {
      mkdirSync(TEST_CONFIG.reportDir, { recursive: true });
    } catch (error) {
      console.warn(`Warning: Could not create report directory: ${error.message}`);
    }
  }

  async runTestSuite(suite) {
    console.log(`\n🧪 Running: ${suite.name}`);
    console.log(`   Pattern: ${suite.pattern}`);
    console.log(`   Timeout: ${suite.timeout}ms`);
    
    const startTime = Date.now();
    
    try {
      // Run vitest with specific pattern and timeout
      const command = `npx vitest run "${suite.pattern}" --reporter=json --testTimeout=${suite.timeout}`;
      
      console.log(`   Command: ${command}`);
      
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: suite.timeout + 10000 // Add buffer to command timeout
      });
      
      const duration = Date.now() - startTime;
      
      // Parse vitest JSON output
      let testResult;
      try {
        // Extract JSON from output (vitest may include other text)
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          testResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON output found');
        }
      } catch (parseError) {
        console.warn(`   Warning: Could not parse test output as JSON: ${parseError.message}`);
        testResult = {
          success: output.includes('PASS') || !output.includes('FAIL'),
          numTotalTests: 1,
          numPassedTests: output.includes('PASS') ? 1 : 0,
          numFailedTests: output.includes('FAIL') ? 1 : 0
        };
      }
      
      const passed = testResult.success !== false && (testResult.numFailedTests || 0) === 0;
      const numTests = testResult.numTotalTests || 1;
      const numPassed = testResult.numPassedTests || (passed ? numTests : 0);
      const numFailed = testResult.numFailedTests || (passed ? 0 : numTests);
      
      this.totalTests += numTests;
      this.passedTests += numPassed;
      this.failedTests += numFailed;
      
      this.results[suite.name] = {
        passed,
        duration,
        totalTests: numTests,
        passedTests: numPassed,
        failedTests: numFailed,
        output: output.substring(0, 1000), // Truncate for storage
        details: testResult
      };
      
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`   Result: ${status} (${numPassed}/${numTests} tests, ${duration}ms)`);
      
      if (!passed && testResult.testResults) {
        console.log('   Failed tests:');
        testResult.testResults
          .filter(test => test.status === 'failed')
          .forEach(test => {
            console.log(`     - ${test.fullName}: ${test.failureMessages?.[0] || 'Unknown error'}`);
          });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.totalTests += 1;
      this.failedTests += 1;
      
      this.results[suite.name] = {
        passed: false,
        duration,
        totalTests: 1,
        passedTests: 0,
        failedTests: 1,
        error: error.message,
        output: error.stdout || error.stderr || error.message
      };
      
      console.log(`   Result: ❌ FAILED (Error: ${error.message})`);
      
      if (error.stdout) {
        console.log('   STDOUT:', error.stdout.substring(0, 500));
      }
      if (error.stderr) {
        console.log('   STDERR:', error.stderr.substring(0, 500));
      }
    }
  }

  async generateReports() {
    console.log('\n📊 Generating Test Reports...');
    
    const reportData = {
      metadata: {
        startTime: this.startTime.toISOString(),
        endTime: this.endTime.toISOString(),
        duration: this.endTime - this.startTime,
        totalTests: this.totalTests,
        passedTests: this.passedTests,
        failedTests: this.failedTests,
        successRate: this.totalTests > 0 ? this.passedTests / this.totalTests : 0
      },
      suites: this.results,
      summary: this.generateSummary()
    };
    
    // Generate JSON report
    try {
      const jsonReport = JSON.stringify(reportData, null, 2);
      writeFileSync(join(TEST_CONFIG.reportDir, 'waveform-test-report.json'), jsonReport);
      console.log(`   ✅ JSON report: ${TEST_CONFIG.reportDir}/waveform-test-report.json`);
    } catch (error) {
      console.warn(`   ⚠️  Could not write JSON report: ${error.message}`);
    }
    
    // Generate HTML report
    try {
      const htmlReport = this.generateHtmlReport(reportData);
      writeFileSync(join(TEST_CONFIG.reportDir, 'waveform-test-report.html'), htmlReport);
      console.log(`   ✅ HTML report: ${TEST_CONFIG.reportDir}/waveform-test-report.html`);
    } catch (error) {
      console.warn(`   ⚠️  Could not write HTML report: ${error.message}`);
    }
    
    // Generate JUnit XML report
    try {
      const junitReport = this.generateJunitReport(reportData);
      writeFileSync(join(TEST_CONFIG.reportDir, 'waveform-test-report.xml'), junitReport);
      console.log(`   ✅ JUnit report: ${TEST_CONFIG.reportDir}/waveform-test-report.xml`);
    } catch (error) {
      console.warn(`   ⚠️  Could not write JUnit report: ${error.message}`);
    }
  }

  generateSummary() {
    const suiteResults = Object.values(this.results);
    const passedSuites = suiteResults.filter(suite => suite.passed).length;
    const totalSuites = suiteResults.length;
    
    return {
      totalSuites,
      passedSuites,
      failedSuites: totalSuites - passedSuites,
      suiteSuccessRate: totalSuites > 0 ? passedSuites / totalSuites : 0,
      averageDuration: suiteResults.reduce((acc, suite) => acc + suite.duration, 0) / totalSuites,
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    Object.entries(this.results).forEach(([suiteName, result]) => {
      if (!result.passed) {
        recommendations.push({
          suite: suiteName,
          priority: 'High',
          issue: `Test suite failed with ${result.failedTests} failed tests`,
          suggestion: 'Review failed test cases and fix underlying issues'
        });
      }
      
      if (result.duration > 30000) { // 30 seconds
        recommendations.push({
          suite: suiteName,
          priority: 'Medium',
          issue: `Test suite took ${(result.duration / 1000).toFixed(1)}s to complete`,
          suggestion: 'Consider optimizing test performance or splitting into smaller suites'
        });
      }
    });
    
    return recommendations;
  }

  generateHtmlReport(reportData) {
    const { metadata, suites, summary } = reportData;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Waveform Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin: 0; }
        .header .subtitle { color: #7f8c8d; margin-top: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #ecf0f1; padding: 20px; border-radius: 6px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #2c3e50; }
        .summary-card .value { font-size: 2em; font-weight: bold; color: #3498db; }
        .summary-card .label { color: #7f8c8d; font-size: 0.9em; }
        .suite { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
        .suite-header { background: #34495e; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .suite-header h3 { margin: 0; }
        .suite-status { padding: 4px 12px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .suite-status.passed { background: #27ae60; }
        .suite-status.failed { background: #e74c3c; }
        .suite-body { padding: 15px; }
        .suite-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 15px; }
        .stat { text-align: center; }
        .stat .value { font-size: 1.5em; font-weight: bold; color: #2c3e50; }
        .stat .label { color: #7f8c8d; font-size: 0.8em; }
        .error { background: #fdf2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 10px; margin-top: 10px; }
        .error-title { color: #dc2626; font-weight: bold; margin-bottom: 5px; }
        .error-message { color: #7f1d1d; font-family: monospace; font-size: 0.9em; }
        .recommendations { margin-top: 30px; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin-bottom: 10px; }
        .recommendation-priority { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; font-weight: bold; margin-bottom: 5px; }
        .recommendation-priority.high { background: #e74c3c; color: white; }
        .recommendation-priority.medium { background: #f39c12; color: white; }
        .recommendation-priority.low { background: #95a5a6; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌊 Waveform Test Report</h1>
            <div class="subtitle">Generated on ${new Date(metadata.endTime).toLocaleString()}</div>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Overall Success Rate</h3>
                <div class="value">${(metadata.successRate * 100).toFixed(1)}%</div>
                <div class="label">${metadata.passedTests}/${metadata.totalTests} tests passed</div>
            </div>
            <div class="summary-card">
                <h3>Test Suites</h3>
                <div class="value">${summary.passedSuites}/${summary.totalSuites}</div>
                <div class="label">suites passed</div>
            </div>
            <div class="summary-card">
                <h3>Total Duration</h3>
                <div class="value">${(metadata.duration / 1000).toFixed(1)}s</div>
                <div class="label">execution time</div>
            </div>
            <div class="summary-card">
                <h3>Average Duration</h3>
                <div class="value">${(summary.averageDuration / 1000).toFixed(1)}s</div>
                <div class="label">per suite</div>
            </div>
        </div>
        
        <div class="suites">
            ${Object.entries(suites).map(([name, suite]) => `
                <div class="suite">
                    <div class="suite-header">
                        <h3>${name}</h3>
                        <span class="suite-status ${suite.passed ? 'passed' : 'failed'}">
                            ${suite.passed ? 'PASSED' : 'FAILED'}
                        </span>
                    </div>
                    <div class="suite-body">
                        <div class="suite-stats">
                            <div class="stat">
                                <div class="value">${suite.totalTests}</div>
                                <div class="label">Total Tests</div>
                            </div>
                            <div class="stat">
                                <div class="value">${suite.passedTests}</div>
                                <div class="label">Passed</div>
                            </div>
                            <div class="stat">
                                <div class="value">${suite.failedTests}</div>
                                <div class="label">Failed</div>
                            </div>
                            <div class="stat">
                                <div class="value">${(suite.duration / 1000).toFixed(1)}s</div>
                                <div class="label">Duration</div>
                            </div>
                        </div>
                        ${suite.error ? `
                            <div class="error">
                                <div class="error-title">Error:</div>
                                <div class="error-message">${suite.error}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${summary.recommendations.length > 0 ? `
            <div class="recommendations">
                <h2>📋 Recommendations</h2>
                ${summary.recommendations.map(rec => `
                    <div class="recommendation">
                        <span class="recommendation-priority ${rec.priority.toLowerCase()}">${rec.priority}</span>
                        <div><strong>${rec.suite}:</strong> ${rec.issue}</div>
                        <div><em>Suggestion:</em> ${rec.suggestion}</div>
                    </div>
                `).join('')}
            </div>
        ` : '<div class="recommendations"><h2>🎉 No recommendations - all tests passed!</h2></div>'}
    </div>
</body>
</html>`;
  }

  generateJunitReport(reportData) {
    const { metadata, suites } = reportData;
    
    const testsuites = Object.entries(suites).map(([name, suite]) => {
      const failures = suite.failedTests;
      const tests = suite.totalTests;
      const time = (suite.duration / 1000).toFixed(3);
      
      return `
    <testsuite name="${name}" tests="${tests}" failures="${failures}" time="${time}">
      ${suite.error ? `
        <testcase name="${name}" classname="WaveformTest">
          <failure message="${suite.error}">${suite.output || suite.error}</failure>
        </testcase>
      ` : `
        <testcase name="${name}" classname="WaveformTest" time="${time}"/>
      `}
    </testsuite>`;
    }).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="WaveformTests" tests="${metadata.totalTests}" failures="${metadata.failedTests}" time="${(metadata.duration / 1000).toFixed(3)}">
  ${testsuites}
</testsuites>`;
  }

  displaySummary() {
    console.log('\n📊 TEST EXECUTION SUMMARY');
    console.log('==========================');
    
    const duration = (this.endTime - this.startTime) / 1000;
    const successRate = this.totalTests > 0 ? (this.passedTests / this.totalTests) * 100 : 0;
    
    console.log(`⏱️  Total Duration: ${duration.toFixed(2)} seconds`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}% (${this.passedTests}/${this.totalTests})`);
    console.log(`✅ Passed Tests: ${this.passedTests}`);
    console.log(`❌ Failed Tests: ${this.failedTests}`);
    
    console.log('\n📋 Suite Results:');
    Object.entries(this.results).forEach(([name, result]) => {
      const status = result.passed ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(1);
      console.log(`   ${status} ${name}: ${result.passedTests}/${result.totalTests} (${duration}s)`);
    });
    
    if (this.failedTests > 0) {
      console.log('\n⚠️  Some tests failed. Check the detailed reports for more information.');
      console.log(`   Reports available in: ${TEST_CONFIG.reportDir}/`);
    } else {
      console.log('\n🎉 All tests passed successfully!');
    }
  }
}

// Run the tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new WaveformTestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export default WaveformTestRunner;