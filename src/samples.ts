import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve, join } from "path";

// Function to load log samples from log_samples/*.log files
export function loadLogSamples(): string[] {
  const logSamplesDir = resolve(process.cwd(), "log_samples");
  let logSamples: string[] = [];
  
  if (existsSync(logSamplesDir)) {
    const logFiles = readdirSync(logSamplesDir).filter(f => f.endsWith('.log'));
    for (const file of logFiles) {
      const filePath = join(logSamplesDir, file);
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      logSamples.push(...lines);
    }
  }
  
  return logSamples;
}
