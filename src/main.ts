// @ts-ignore
import { createIntegrationAgent } from "./agents/integrationAgent";
import { ingestPipelineGenerator } from "./agents/ingest_pipeline_generator";
import { logsAnalyzer } from "./agents/logs_analyzer";
import { getDefaultModel } from "./model";
import { logMem } from "./logging";
import { sampleService } from "./sampleService";
import "dotenv/config";

async function main() {
  // Initialize the sample service with log samples
  await sampleService.initialize();
  logMem(`log samples loaded count=${sampleService.getCount()}`);

  const agent = createIntegrationAgent({
    model: getDefaultModel(),
    subagents: [ingestPipelineGenerator, logsAnalyzer],
    baseAgentTools: [],
  });
  logMem("integrationAgent created");

  // Get samples reduced to fit within 5000 characters
  const selectedSamples = sampleService.getReducedSamples(5000);

  // Example kickoff message. Replace input as needed.
  const response = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: `Create an ingest pipeline for these logs. Only return a JSON pipeline.\n\nSamples count: ${selectedSamples.length}`,
        },
      ],
      logSamples: selectedSamples,
    },
    { recursionLimit: 100 }
  );
  logMem("agent.invoke completed");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
