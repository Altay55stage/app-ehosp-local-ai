const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const dbManager = require("./database");
const { searchGuidelines } = require("./rag");

const server = new Server(
  {
    name: "ehosp-medical-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Define tools list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_patient_history",
        description: "Exécute une requête SQL pour récupérer le dossier médical complet du patient (antécédents, allergies, traitements en cours, constante physiques, etc.).",
        inputSchema: {
          type: "object",
          properties: {
            uid: { type: "string", description: "L'identifiant unique (UID) de l'utilisateur." },
            profileId: { type: "string", description: "L'identifiant unique du profil de santé actif (si différent de l'UID)." }
          },
          required: ["uid"]
        }
      },
      {
        name: "check_doctor_planning",
        description: "Recherche les médecins spécialistes disponibles dans l'hôpital et vérifie leur disponibilité ou leurs créneaux horaires libres.",
        inputSchema: {
          type: "object",
          properties: {
            specialty: { type: "string", description: "La spécialité médicale recherchée (ex: 'Cardiologie', 'Dermatologie', 'Généraliste')." }
          },
          required: ["specialty"]
        }
      },
      {
        name: "search_medical_guidelines",
        description: "Effectue une recherche RAG vectorielle par similarité dans les protocoles de la HAS (Haute Autorité de Santé) pour obtenir des instructions cliniques sur les symptômes déclarés.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Les symptômes ou la question du patient (ex: 'HbA1c à 6.1%', 'douleur thoracique constrictive')." }
          },
          required: ["query"]
        }
      },
      {
        name: "create_appointment",
        description: "Crée et réserve formellement une consultation ou un rendez-vous médical en insérant une ligne de consultation active dans la base de données ehosp.",
        inputSchema: {
          type: "object",
          properties: {
            patientId: { type: "string", description: "L'UID du patient." },
            doctorId: { type: "string", description: "L'UID du médecin spécialiste." },
            symptoms: { type: "string", description: "Les symptômes pour lesquels le patient consulte." },
            urgencyScore: { type: "number", description: "Le score de triage calculé par l'IA de 1 à 10." }
          },
          required: ["patientId", "doctorId", "symptoms", "urgencyScore"]
        }
      }
    ]
  };
});

// 2. Define tools call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[MCP Server] Executing tool: ${name}`);

  try {
    switch (name) {
      case "get_patient_history": {
        const { uid, profileId } = args;
        // If profileId is specified, fetch that specific profile, otherwise list profiles or user info
        let data;
        if (profileId) {
          data = dbManager.getProfile(profileId);
        } else {
          const profiles = dbManager.getProfilesByUid(uid);
          const user = dbManager.getUser(uid);
          data = { user, profiles };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case "check_doctor_planning": {
        const { specialty } = args;
        const doctors = dbManager.getDoctorsBySpecialty(specialty);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(doctors, null, 2)
            }
          ]
        };
      }

      case "search_medical_guidelines": {
        const { query } = args;
        const results = await searchGuidelines(query, 2); // Get top 2 clinical match guidelines
        const textResults = results.map(r => `[Score: ${r.score.toFixed(3)} | Source: ${r.document}]\n${r.content}`).join('\n\n');
        return {
          content: [
            {
              type: "text",
              text: textResults || "Aucun protocole médical correspondant trouvé."
            }
          ]
        };
      }

      case "create_appointment": {
        const { patientId, doctorId, symptoms, urgencyScore } = args;
        
        // Find doctor profile
        const stmt = dbManager.db.prepare("SELECT * FROM doctors WHERE uid = ?");
        const doctor = stmt.get(doctorId);
        if (!doctor) throw new Error("Médecin introuvable.");

        const consultationId = `consultation_${patientId}_${Date.now()}`;
        const newConsultation = {
          id: consultationId,
          patientId,
          patientName: "Patient eHosp Local",
          patientAge: 35, // default
          status: "pending",
          createdAt: Date.now(),
          expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
          doctorId,
          diagnosis: `Demande de consultation pour : ${symptoms}`,
          preDiagnosticPDF: null,
          startedAt: null,
          completedAt: null,
          pricing: {
            preDignosticCost: 0,
            consultationCost: 0.0,
            totalPaid: 0,
            status: "free"
          }
        };

        dbManager.saveConsultation(newConsultation);

        return {
          content: [
            {
              type: "text",
              text: `✅ Consultation #${consultationId} réservée avec succès avec le Dr. ${doctor.name}. Statut: En attente.`
            }
          ]
        };
      }

      default:
        throw new Error(`Tool introuvable: ${name}`);
    }
  } catch (error) {
    console.error(`[MCP Server] Error executing tool ${name}:`, error.message);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Erreur d'exécution de l'outil : ${error.message}`
        }
      ]
    };
  }
});

// Run server using StdioTransport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP Server] Connected via Stdio transport");
}

run().catch(console.error);
