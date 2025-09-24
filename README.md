# Custom DeepAgents

A TypeScript project to generate Elasticsearch ingest pipelines using Deep agents.

## Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- Docker (for Elasticsearch)
- AWS Bedrock credentials configured

## Setup

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Configure environment:**
   Create a `.env` file with your credentials:
   ```bash
   # Add your LangChain and AWS Bedrock credentials
    LANGCHAIN_API_KEY=your_langchain_key
    AWS_DEFAULT_REGION=<aws-region>
    AWS_ACCESS_KEY_ID=<access-key-id>
    AWS_SECRET_ACCESS_KEY=<secret-access-key>

    LANGSMITH_API_KEY=<API Key>>
    LANGSMITH_PROJECT=<Tracing Project>
    LANGSMITH_ENDPOINT=https://api.smith.langchain.com
    LANGSMITH_TRACING=true
   # Add other required environment variables
   ```

3. **Prepare log samples:**
   Place your log files in the `log_samples/` directory with `.log` extension.

## Running the Application

### Quick Start
```bash
yarn start:full
```

This command will:
- Start Docker containers (including Elasticsearch)
- Build the TypeScript application
- Run the main function


## How it Works

1. The application loads log samples from `log_samples/*.log` files
2. Samples are processed and limited to 5000 characters total
3. The integration agent coordinates between subagents:
   - **Logs Analyzer**: Analyzes log format and structure
   - **Ingest Pipeline Generator**: Creates Elasticsearch ingest pipeline JSON
4. The pipeline is validated against the log samples using Elasticsearch simulation

## Project Structure

```
src/
├── agents/          # LangGraph agents and subagents
├── tools/           # Custom tools for pipeline validation
├── types/           # TypeScript type definitions
├── main.ts          # Application entry point
└── ...
```

## Configuration

- Log samples are automatically loaded from `log_samples/` directory
- Character limit for samples can be adjusted in `main.ts`
- Agent recursion limit is set to 100 by default

## Troubleshooting

- Ensure Elasticsearch is running on `localhost:9200`
- Check that log files are properly formatted in `log_samples/`
- Verify AWS Bedrock credentials are configured
- Check console output for detailed error messages
