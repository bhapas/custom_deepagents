import { Client } from "@elastic/elasticsearch";
import { sharedEsClient } from "./model";
/**
 * Service to manage Elasticsearch index operations for log samples
 */
class IndexService {
  private static instance: IndexService;
  private readonly indexName = ".internal-automatic-import-samples";
  private client: Client;

  private constructor() {
    this.client = sharedEsClient;
  }

  static getInstance(): IndexService {
    if (!IndexService.instance) {
      IndexService.instance = new IndexService();
    }
    return IndexService.instance;
  }

  /**
   * Create the index with simple mappings if it doesn't exist
   */
  async ensureIndexExists(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({
        index: this.indexName,
      });

      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          mappings: {
            properties: {
              integration_id: {
                type: "keyword",
              },
              log_sample: {
                type: "text",
                index: false,
              },
              timestamp: {
                type: "date",
                index: false,
              },
            },
          },
        });
        console.log(`Created index: ${this.indexName}`);
      }
    } catch (error) {
      console.error("Error ensuring index exists:", error);
      throw error;
    }
  }

  /**
   * Write log samples to the index
   */
  async writeSamples(samples: string[], integrationId: string): Promise<void> {
    try {
      await this.ensureIndexExists();

      // Clear existing documents for this integration_id
      await this.client.deleteByQuery({
        index: this.indexName,
        query: {
          term: {
            integration_id: integrationId,
          },
        },
        refresh: true,
      });

      // Prepare bulk operations
      const bulkBody: any[] = [];
      const timestamp = new Date().toISOString();

      for (const sample of samples) {
        bulkBody.push({
          index: {
            _index: this.indexName,
          },
        });
        bulkBody.push({
          integration_id: integrationId,
          log_sample: sample,
          timestamp: timestamp,
        });
      }

      if (bulkBody.length > 0) {
        const response = await this.client.bulk({
          operations: bulkBody,
          refresh: true,
        });

        if (response.errors) {
          console.error("Bulk indexing had errors");
          const erroredDocuments = response.items.filter((item: any) => item.index?.error);
          console.error("Errored documents:", JSON.stringify(erroredDocuments, null, 2));
        } else {
          console.log(`Successfully indexed ${samples.length} samples for integration: ${integrationId}`);
        }
      }
    } catch (error) {
      console.error("Error writing samples to index:", error);
      throw error;
    }
  }

  /**
   * Read log samples from the index by integration_id
   */
  async readSamples(integrationId: string = "gateway"): Promise<string[]> {
    try {
      const response = await this.client.search({
        index: this.indexName,
        query: {
          term: {
            integration_id: integrationId,
          },
        },
        size: 10000,
        sort: [{ timestamp: { order: "desc" } }],
      });

      return response.hits.hits.map((hit: any) => hit._source.log_sample);
    } catch (error) {
      if ((error as any).meta?.statusCode === 404) {
        // Index doesn't exist yet
        return [];
      }
      console.error("Error reading samples from index:", error);
      throw error;
    }
  }

  /**
   * Delete the index (useful for cleanup/testing)
   */
  async deleteIndex(): Promise<void> {
    try {
      await this.client.indices.delete({
        index: this.indexName,
        ignore_unavailable: true,
      });
      console.log(`Deleted index: ${this.indexName}`);
    } catch (error) {
      console.error("Error deleting index:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const indexService = IndexService.getInstance();
