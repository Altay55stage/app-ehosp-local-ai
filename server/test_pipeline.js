require('dotenv').config();
const dbManager = require('./database');
const ragManager = require('./rag');
const { spawn } = require('child_process');
const path = require('path');
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

async function testPipeline() {
  console.log("=== STARTING INTEGRATION TEST ===");

  // 1. Check database
  console.log("1. Checking SQLite connection...");
  const docCount = dbManager.db.prepare("SELECT COUNT(*) as count FROM doctors").get();
  console.log(`Doctors in database: ${docCount.count}`);

  // 2. Index documents
  console.log("\n2. Indexing RAG documents...");
  await ragManager.indexDocuments();
  const chunkCount = dbManager.db.prepare("SELECT COUNT(*) as count FROM rag_chunks").get();
  console.log(`RAG chunks in database: ${chunkCount.count}`);

  // 3. Search RAG
  const query = "douleur à la poitrine";
  console.log(`\n3. Testing RAG similarity search for query: "${query}"...`);
  const ragResults = await ragManager.searchGuidelines(query, 1);
  if (ragResults.length > 0) {
    console.log(`Best match found: [Score: ${ragResults[0].score.toFixed(3)} | Doc: ${ragResults[0].document}]`);
    console.log(`Snippet: "${ragResults[0].content.substring(0, 150)}..."`);
  } else {
    console.log("No RAG results found!");
  }

  // 4. Start MCP Server and connect client
  console.log("\n4. Testing MCP Server and tool execution...");
  const mcpClient = new Client({
    name: "test-client",
    version: "1.0.0"
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join(__dirname, "mcp-server.js")]
  });

  await mcpClient.connect(transport);
  console.log("Connected to MCP Server!");

  // List tools
  const toolsRes = await mcpClient.listTools();
  console.log("Available tools list:");
  toolsRes.tools.forEach(t => console.log(` - ${t.name}: ${t.description.substring(0, 50)}`));

  // Exec get_patient_history tool
  console.log("\nExecuting tool: get_patient_history...");
  const patientHistory = await mcpClient.callTool({
    name: "get_patient_history",
    arguments: { uid: "user_test" }
  });
  console.log("Result:", patientHistory.content[0].text);

  // Exec check_doctor_planning tool
  console.log("\nExecuting tool: check_doctor_planning for 'Cardiologie'...");
  const planningRes = await mcpClient.callTool({
    name: "check_doctor_planning",
    arguments: { specialty: "Cardiologie" }
  });
  console.log("Result:", planningRes.content[0].text);

  // Clean up
  console.log("\nClosing MCP client and server...");
  console.log("=== INTEGRATION TEST COMPLETE ===");
}

testPipeline().catch(console.error);
