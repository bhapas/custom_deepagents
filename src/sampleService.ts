import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve, join } from "path";
/**
 * Singleton service to manage log samples globally
 * This allows tools to access samples without passing through state
 */
class SampleService {
  private static instance: SampleService;
  private samples: string[] = [];
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): SampleService {
    if (!SampleService.instance) {
      SampleService.instance = new SampleService();
    }
    return SampleService.instance;
  }

// Function to load log samples from log_samples/*.log files
private loadLogSamples(): string[] {
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

  /**
   * Initialize the service with log samples
   * Should be called once from main.ts
   */
  initialize(): void {
    if (!this.initialized) {
      this.samples = this.loadLogSamples();
      this.initialized = true
    }
  }

  /**
   * Get all loaded samples
   */
  getSamples(): string[] {
    if (!this.initialized) {
      throw new Error("SampleService not initialized. Call initialize() first.");
    }
    return this.samples;
  }

  /**
   * Get sample count
   */
  getCount(): number {
    return this.samples.length;
  }

  /**
   * Get samples reduced to fit within character limit
   */
  getReducedSamples(maxCharacters: number = 3000): string[] {
    if (!this.initialized) {
      throw new Error("SampleService not initialized. Call initialize() first.");
    }
    
    const selectedSamples: string[] = [];
    let totalChars = 0;
    
    for (const sample of this.samples) {
      if (totalChars + sample.length <= maxCharacters) {
        selectedSamples.push(sample);
        totalChars += sample.length;
      } else {
        break;
      }
    }
    
    return selectedSamples;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const sampleService = SampleService.getInstance();
