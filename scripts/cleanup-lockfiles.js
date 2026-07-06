// scripts/cleanup-lockfiles.js (ES module)
import fs from 'fs';
import { join } from 'path';

['package-lock.json', 'yarn.lock'].forEach((f) => {
  try { fs.unlinkSync(join(process.cwd(), f)); } catch (e) { /* ignore if missing */ }
});
