/**
 * Test results saver script
 * Saves test output to TestResults.txt (overwrites existing file)
 */

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const resultsFile = join(projectRoot, 'TestResults.txt');

// Remove existing file to ensure fresh start
try {
  unlinkSync(resultsFile);
} catch (err) {
  // File doesn't exist, that's fine
}

let output = '';
let errorOutput = '';

// Add timestamp header
const timestamp = new Date().toISOString();
output += `=== Test Results ===\n`;
output += `Timestamp: ${timestamp}\n`;
output += `\n`;

// Run vitest
const vitest = spawn('npx', ['vitest', 'run', '--reporter=verbose'], {
  cwd: projectRoot,
  shell: true,
  stdio: 'pipe',
});

vitest.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text); // Also show in console
});

vitest.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  process.stderr.write(text); // Also show in console
});

vitest.on('close', (code) => {
  // Add error output if any
  if (errorOutput) {
    output += `\n=== Errors ===\n${errorOutput}\n`;
  }

  // Add exit code
  output += `\n=== Exit Code: ${code} ===\n`;

  // Write to file
  writeFileSync(resultsFile, output, 'utf-8');
  
  if (code === 0) {
    console.log(`\n✅ Test results saved to: ${resultsFile}`);
  } else {
    console.log(`\n❌ Tests failed. Results saved to: ${resultsFile}`);
  }
  
  process.exit(code || 0);
});

vitest.on('error', (error) => {
  errorOutput += `\nFailed to start test process: ${error.message}\n`;
  output += `\n=== Fatal Error ===\n${errorOutput}\n`;
  writeFileSync(resultsFile, output, 'utf-8');
  console.error(`\n❌ Failed to run tests. Results saved to: ${resultsFile}`);
  process.exit(1);
});
