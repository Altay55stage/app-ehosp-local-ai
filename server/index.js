require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const nodemailer = require('nodemailer');
const { spawn } = require('child_process');
const path = require('path');
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

const dbManager = require('./database');
const ragManager = require('./rag');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'altayinvestpro@gmail.com';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'p12DgAkX2ov4j9QzayU00HyFpO8mJxDm';

let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
}

// ─── Initialize RAG and MCP Client ──────────────────────────────────────────
let mcpClient = null;
let mcpProcess = null;

async function initRAGAndMCP() {
  console.log("\x1b[36m%s\x1b[0m", "==================================================");
  console.log("\x1b[36m%s\x1b[0m", "          INITIALIZING eHOSP IA CORE ENGINE        ");
  console.log("\x1b[36m%s\x1b[0m", "==================================================");

  // 1. Index RAG documents
  try {
    await ragManager.indexDocuments();
  } catch (err) {
    console.error("\x1b[31m%s\x1b[0m", "RAG Indexing failed:", err.message);
  }

  // 2. Initialize and connect to Stdio MCP Server
  try {
    mcpClient = new Client({
      name: "ehosp-express-client",
      version: "1.0.0"
    });

    console.log("MCP: Connecting to local MCP Server...");
    const transport = new StdioClientTransport({
      command: "node",
      args: [path.join(__dirname, "mcp-server.js")]
    });

    await mcpClient.connect(transport);
    console.log("\x1b[32m%s\x1b[0m", "✅ Connected to local MCP Server via Stdio transport");
    
    // List available tools
    const tools = await mcpClient.listTools();
    console.log(`MCP: ${tools.tools.length} Tools registered and ready:`);
    tools.tools.forEach(t => console.log(`   - \x1b[34m${t.name}\x1b[0m: ${t.description.substring(0, 75)}...`));
  } catch (err) {
    console.error("\x1b[31m%s\x1b[0m", "Failed to start MCP client:", err.message);
  }
}

// Run engine initialization after server boot
setTimeout(initRAGAndMCP, 1000);


// ─── LOCAL STORAGE REST ENDPOINTS (Bypassing Firebase) ────────────────────────

// Auth
app.post('/api/auth/register', (req, res) => {
  const { uid, email, password } = req.body;
  try {
    const user = dbManager.createUser(uid, email, password);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  try {
    const user = dbManager.getUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profiles
app.get('/api/profiles', (req, res) => {
  const { uid } = req.query;
  try {
    const profiles = dbManager.getProfilesByUid(uid);
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profiles', (req, res) => {
  const profile = req.body;
  try {
    const saved = dbManager.saveProfile(profile);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sessions
app.get('/api/sessions', (req, res) => {
  const { uid, profileId } = req.query;
  try {
    const sessions = dbManager.getSessionsByProfile(uid, profileId);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions', (req, res) => {
  const { id, uid, profileId, title, timestamp } = req.body;
  try {
    dbManager.saveSession(id, uid, profileId, title, timestamp);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  try {
    dbManager.deleteSession(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Messages
app.get('/api/sessions/:id/messages', (req, res) => {
  const { id } = req.params;
  try {
    const messages = dbManager.getMessagesBySession(id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/:id/messages', (req, res) => {
  const msg = req.body;
  try {
    dbManager.saveMessage(msg);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consultations
app.get('/api/consultations', (req, res) => {
  const { patientId, doctorId } = req.query;
  try {
    if (patientId) {
      const list = dbManager.getConsultationsByPatient(patientId);
      return res.json(list);
    }
    if (doctorId) {
      const list = dbManager.getConsultationsByDoctor(doctorId);
      return res.json(list);
    }
    // Return all
    const stmt = dbManager.db.prepare("SELECT * FROM consultations");
    const list = stmt.all();
    list.forEach(c => {
      if (typeof c.pricing === 'string') c.pricing = JSON.parse(c.pricing);
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/consultations/:id', (req, res) => {
  const { id } = req.params;
  try {
    const consultation = dbManager.getConsultation(id);
    if (!consultation) return res.status(404).json({ error: "Consultation introuvable" });
    res.json(consultation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/consultations', (req, res) => {
  const consultation = req.body;
  try {
    dbManager.saveConsultation(consultation);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/consultations/:id', (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;
  try {
    dbManager.updateConsultationStatus(id, updateFields);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Doctors
app.get('/api/doctors', (req, res) => {
  const { specialization } = req.query;
  try {
    let list;
    if (specialization) {
      list = dbManager.getDoctorsBySpecialty(specialization);
    } else {
      list = dbManager.db.prepare("SELECT * FROM doctors").all();
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ─── AGENT ORCHESTRATION WITH RAG, MCP & MISTRAL ──────────────────────────────

app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt, activeAgent, uid, profileId } = req.body;

  // Retrieve user prompt (latest message)
  const lastUserMsg = messages[messages.length - 1];
  const userPrompt = typeof lastUserMsg.content === 'string' ? lastUserMsg.content : (lastUserMsg.content.text || '');

  console.log("\x1b[35m%s\x1b[0m", `\n--- 🤖 AGENT: Processing message for agent [${activeAgent}] ---`);
  console.log(`Prompt: "${userPrompt}"`);

  // 1. Perform RAG Vector Search in background to augment system prompt (Grounding)
  let ragContext = "";
  try {
    console.log("RAG: Performing vector similarity search...");
    const ragResults = await ragManager.searchGuidelines(userPrompt, 2);
    if (ragResults.length > 0) {
      console.log(`RAG: Found ${ragResults.length} matching guidelines from:`, ragResults.map(r => r.document));
      ragContext = "\n\n[CONTEXTE DE RÉFÉRENCE DE LA HAUTE AUTORITÉ DE SANTÉ (RAG)]\n";
      ragResults.forEach((r, idx) => {
        ragContext += `Protocole ${idx + 1} (${r.document}):\n${r.content}\n\n`;
      });
    }
  } catch (err) {
    console.error("RAG search failed:", err.message);
  }

  // 2. Fetch list of available tools from local MCP Server to present to Mistral
  let mcpTools = [];
  try {
    if (mcpClient) {
      const toolsRes = await mcpClient.listTools();
      mcpTools = toolsRes.tools.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      }));
    }
  } catch (err) {
    console.error("Failed to list MCP tools:", err.message);
  }

  // 3. Setup conversation messages list
  const fullSystemPrompt = `${systemPrompt}${ragContext}\n\nUtilise les outils à ta disposition si nécessaire (ex: get_patient_history pour le dossier du patient ou check_doctor_planning pour la disponibilité d'un cardiologue).`;
  
  // Format history messages to match standard API
  const formattedMessages = [
    { role: "system", content: fullSystemPrompt },
    ...messages.map(m => {
      // Map base64 images if present
      if (typeof m.content === 'object' && m.content.images) {
        const textPart = { type: "text", text: m.content.text || "Image médicale fournie." };
        const imagePart = m.content.images.map(img => ({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${img}` }
        }));
        return { role: m.role, content: [textPart, ...imagePart] };
      }
      return { role: m.role, content: typeof m.content === 'string' ? m.content : (m.content.text || '') };
    })
  ];

  try {
    // 4. Call Mistral Chat API
    console.log("Mistral: Sending completions request...");
    // Pixtral model handles images, mistral-large handles general tool-calling.
    // If images are present, we use pixtral-12b-2409, otherwise mistral-large-latest.
    const hasImages = messages.some(m => typeof m.content === 'object' && m.content.images && m.content.images.length > 0);
    const model = hasImages ? "pixtral-12b-2409" : "mistral-large-latest";

    let apiResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        tools: mcpTools.length > 0 ? mcpTools : undefined,
        tool_choice: "auto"
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      throw new Error(`Mistral API Error ${apiResponse.status}: ${errText}`);
    }

    let completionData = await apiResponse.json();
    let assistantMessage = completionData.choices[0].message;

    // 5. Check if LLM decided to execute an MCP Tool (Function Calling)
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`\n\x1b[35m[MCP EXECUTION LOOP]\x1b[0m LLM triggered ${assistantMessage.tool_calls.length} tool calls.`);

      // Add assistant tool call message to history
      formattedMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const { name: toolName, arguments: rawArgs } = toolCall.function;
        const toolArgs = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
        
        // Inject contextual args if missing (ex: uid, profileId)
        if (toolName === "get_patient_history" && !toolArgs.uid) {
          toolArgs.uid = uid;
          toolArgs.profileId = profileId;
        }

        console.log(`\x1b[35m[MCP Executing Tool]\x1b[0m \x1b[34m${toolName}\x1b[0m with args:`, toolArgs);

        let toolResult = "";
        try {
          // Send request to MCP Server
          const callRes = await mcpClient.callTool({
            name: toolName,
            arguments: toolArgs
          });
          toolResult = callRes.content[0].text;
          console.log(`\x1b[32m[MCP Tool Output Success]\x1b[0m Returned length: ${toolResult.length} chars.`);
        } catch (err) {
          toolResult = `Error running tool: ${err.message}`;
          console.error(`\x1b[31m[MCP Tool Output Error]\x1b[0m`, err.message);
        }

        // Add tool output to messages list
        formattedMessages.push({
          role: "tool",
          name: toolName,
          content: toolResult,
          tool_call_id: toolCall.id
        });
      }

      // Re-call Mistral with tool results to get the final text completion
      console.log("Mistral: Re-sending completions request with tool outputs...");
      apiResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: formattedMessages
        })
      });

      if (!apiResponse.ok) {
        const errText = await apiResponse.text();
        throw new Error(`Mistral API Error after Tool Execution: ${errText}`);
      }

      completionData = await apiResponse.json();
      assistantMessage = completionData.choices[0].message;
    }

    // Return the JSON response object to the app orchestrator
    const rawText = assistantMessage.content;
    console.log("Response generated successfully.");
    res.json({ rawResponse: rawText });
  } catch (error) {
    console.error("Agent Orchestration Error:", error.message);
    res.status(500).json({
      error: "Error processing agent request",
      rawResponse: JSON.stringify({
        reponse: "Désolé, je rencontre des difficultés pour joindre l'intelligence locale. Vérifiez la clé Mistral.",
        raisonnement: `Erreur API: ${error.message}`,
        sources: "N/A",
        score_urgence: 1
      })
    });
  }
});


// ─── Stripe Payments (Legacy / Untouched) ───────────────────────────────────

app.post('/api/stripe/create-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe non configuré' });
    }
    const { amount = 1499, currency = 'eur', consultationId, patientId } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { consultationId, patientId },
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── PDF Generator (Legacy / Untouched) ──────────────────────────────────────

app.post('/api/generate-prediagnostic', async (req, res) => {
  try {
    const { consultationId, text, language = 'fr', patientName, type = 'prediagnostic' } = req.body;

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const green = rgb(0.1, 0.57, 0.42);
    const dark = rgb(0.03, 0.11, 0.08);
    const grey = rgb(0.4, 0.4, 0.4);

    page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: dark });
    page.drawText('eHosp', { x: 30, y: 805, size: 20, font: boldFont, color: rgb(1,1,1) });
    page.drawText(type === 'prescription' ? 'ORDONNANCE MÉDICALE' : 'RAPPORT PRÉDÉIAGNOSTIC', {
      x: 250, y: 810, size: 12, font: boldFont, color: green
    });

    page.drawText(`Patient: ${patientName || 'N/A'}`, { x: 30, y: 768, size: 10, font, color: grey });
    page.drawText(`ID: ${consultationId || 'N/A'}`, { x: 30, y: 752, size: 10, font, color: grey });
    page.drawText(`Date: ${new Date().toLocaleDateString('fr-FR')}`, { x: 30, y: 736, size: 10, font, color: grey });

    page.drawLine({ start: { x: 30, y: 725 }, end: { x: 565, y: 725 }, thickness: 1, color: green });

    const maxCharsPerLine = 95;
    const lines = [];
    const rawLines = text.split('\n');
    for (const raw of rawLines) {
      for (let i = 0; i < raw.length; i += maxCharsPerLine) {
        lines.push(raw.slice(i, i + maxCharsPerLine));
      }
    }

    let y = 705;
    for (const line of lines) {
      if (y < 60) {
        page = pdfDoc.addPage([595, 842]);
        y = 780;
      }
      page.drawText(line, { x: 30, y, size: 11, font, color: dark });
      y -= 16;
    }

    page.drawText('Document généré par eHosp • ehosp.app • ©2025', {
      x: 140, y: 30, size: 8, font, color: grey
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    res.json({ pdfBase64 });
  } catch (err) {
    res.status(500).json({ error: 'PDF generation failed' });
  }
});


// ─── Push Notifications (Legacy / Untouched) ─────────────────────────────────

app.post('/api/notifications/admin', async (req, res) => {
  try {
    const { subject, data, type } = req.body;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const html = `
      <div style="font-family:Arial;max-width:600px;margin:auto;background:#f5f5f5;padding:20px;border-radius:12px">
        <div style="background:#081C15;padding:20px;border-radius:8px;margin-bottom:20px">
          <h2 style="color:#40916C;margin:0">eHosp Admin</h2>
        </div>
        <h3 style="color:#111">${subject}</h3>
        <pre style="background:#eee;padding:16px;border-radius:8px;overflow:auto;font-size:12px">${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;

    if (process.env.GMAIL_USER) {
      await transporter.sendMail({
        from: `"eHosp Admin" <${process.env.GMAIL_USER}>`,
        to: ADMIN_EMAIL,
        subject: `[eHosp] ${subject}`,
        html,
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'notify failed' });
  }
});

app.post('/api/notifications/doctor', async (req, res) => {
  try {
    const { expoPushToken, title, body, data } = req.body;
    if (expoPushToken && expoPushToken.startsWith('ExponentPushToken')) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: expoPushToken, sound: 'default', title, body, data }),
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'notify failed' });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok', stripe: !!stripe, mcp: !!mcpClient }));

app.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `✅ eHosp backend running on port ${PORT}`);
  console.log(`   Local DB: SQLite (ehosp.db)`);
  console.log(`   Admin email: ${ADMIN_EMAIL}`);
});
