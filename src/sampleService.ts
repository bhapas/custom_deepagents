import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { indexService } from "./indexService";

/**
 * Singleton service to manage log samples globally
 * This allows tools to access samples without passing through state
 */
class SampleService {
  private static instance: SampleService;
  private samples: string[] = [];
  private initialized: boolean = false;
  private readonly integrationId: string = "gateway";

  private constructor() {}

  static getInstance(): SampleService {
    if (!SampleService.instance) {
      SampleService.instance = new SampleService();
    }
    return SampleService.instance;
  }

  /**
   * Load log samples from log_samples/*.log files
   */
  private loadLogSamplesFromFiles(): string[] {
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
   * Write log samples to Elasticsearch index
   */
  private async writeLogSamplesToIndex(samples: string[]): Promise<void> {
    try {
      await indexService.writeSamples(samples, this.integrationId);
      console.log(`Wrote ${samples.length} samples to Elasticsearch index`);
    } catch (error) {
      console.error("Error writing samples to index:", error);
      throw error;
    }
  }

  /**
   * Initialize the service with log samples
   * Loads from files and writes to Elasticsearch index
   * Should be called once from main.ts
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      // Load samples from files
      this.samples = this.loadLogSamplesFromFiles();
      console.log(`Loaded ${this.samples.length} samples from files`);
      
      // Write samples to Elasticsearch index
      await this.writeLogSamplesToIndex(this.samples);
      
      this.initialized = true;
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
