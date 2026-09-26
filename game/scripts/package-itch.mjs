/**
 * Package static game client for itch.io HTML5 release.
 * Backend files and secrets are excluded.
 */
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const winter = process.argv.includes('--winter');

try {
  // Execute package_itch.py using python or py
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  execSync(`${pythonCmd} "${join(__dirname, 'package_itch.py')}" ${winter ? '--winter' : ''}`, { stdio: 'inherit' });
} catch (e) {
  console.error('Packaging failed:', e.message);
  process.exit(1);
}

