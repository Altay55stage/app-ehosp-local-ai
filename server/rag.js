const fs = require('fs');
const path = require('path');
const dbManager = require('./database');

// Configuration
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'p12DgAkX2ov4j9QzayU00HyFpO8mJxDm';
const EMBED_MODEL = 'mistral-embed';

// Dot product
function dotProduct(a, b) {
  let product = 0;
  for (let i = 0; i < a.length; i++) {
    product += a[i] * b[i];
  }
  return product;
}

// Magnitude (norm) of a vector
function magnitude(a) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * a[i];
  }
  return Math.sqrt(sum);
}

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// Get embeddings from Mistral API
async function getEmbedding(textOrTexts) {
  const inputs = Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts];
  
  try {
    const res = await fetch('https://api.mistral.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: inputs
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mistral embed error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.data.map(item => item.embedding);
  } catch (error) {
    console.error("Error getting embedding from Mistral:", error.message);
    // Fallback: return zero vector if API fails
    return inputs.map(() => new Array(1024).fill(0));
  }
}

// Slice text files into logical sections (by markdown headers)
function chunkMarkdown(filename, content) {
  const lines = content.split('\n');
  const chunks = [];
  let currentHeader = 'General';
  let currentChunk = [];

  for (const line of lines) {
    if (line.startsWith('#')) {
      if (currentChunk.length > 0) {
        chunks.push({
          document: filename,
          content: `Document: ${filename}\nSujet: ${currentHeader}\n\n${currentChunk.join('\n').trim()}`
        });
        currentChunk = [];
      }
      currentHeader = line.replace(/#/g, '').trim();
    }
    currentChunk.push(line);
  }

  if (currentChunk.length > 0) {
    chunks.push({
      document: filename,
      content: `Document: ${filename}\nSujet: ${currentHeader}\n\n${currentChunk.join('\n').trim()}`
    });
  }

  return chunks;
}

// Index all documents in rag_documents folder
async function indexDocuments() {
  const docsDir = path.join(__dirname, 'rag_documents');
  if (!fs.existsSync(docsDir)) {
    console.warn("RAG: Directory server/rag_documents/ does not exist.");
    return;
  }

  const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'));
  let allChunks = [];

  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkMarkdown(file, content);
    allChunks.push(...chunks);
  }

  console.log(`RAG: Found ${allChunks.length} document chunks to index.`);

  // Clear existing indices if indexing again, or check duplicates
  // For safety and simplicity, we clear and rebuild chunks on startup if count is different
  const db = dbManager.db;
  const countStmt = db.prepare("SELECT COUNT(*) as count FROM rag_chunks");
  const res = countStmt.get();

  if (res.count === allChunks.length) {
    console.log("RAG: Index is up-to-date. Skipping vector indexing.");
    return;
  }

  console.log("RAG: Building vector index... This calls Mistral Embeddings API.");
  db.exec("DELETE FROM rag_chunks");

  // Call Mistral Embeddings in batches of 10 to avoid large payload limits
  const batchSize = 10;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const contents = batch.map(c => c.content);
    
    try {
      const embeddings = await getEmbedding(contents);
      
      const insert = db.prepare(`
        INSERT INTO rag_chunks (id, document, content, embedding)
        VALUES (?, ?, ?, ?)
      `);

      for (let j = 0; j < batch.length; j++) {
        const chunkId = `chunk_${i + j}_${Date.now()}`;
        insert.run(
          chunkId,
          batch[j].document,
          batch[j].content,
          JSON.stringify(embeddings[j])
        );
      }
      console.log(`RAG: Indexed chunks ${i + 1} to ${Math.min(i + batchSize, allChunks.length)}...`);
    } catch (err) {
      console.error("RAG: Failed to index batch", err);
    }
  }

  console.log("RAG: Index build complete. Database ehosp.db updated.");
}

// Search RAG database for matching guidelines
async function searchGuidelines(query, topK = 3) {
  const db = dbManager.db;
  const chunks = db.prepare("SELECT * FROM rag_chunks").all();
  if (chunks.length === 0) return [];

  // 1. Get embedding for the query
  const queryEmbeddings = await getEmbedding(query);
  const queryVector = queryEmbeddings[0];

  // 2. Compute similarity for each chunk
  const scoredChunks = chunks.map(chunk => {
    const chunkVector = JSON.parse(chunk.embedding);
    const score = cosineSimilarity(queryVector, chunkVector);
    return {
      document: chunk.document,
      content: chunk.content,
      score: score
    };
  });

  // 3. Sort by score desc and take topK
  scoredChunks.sort((a, b) => b.score - a.score);
  return scoredChunks.slice(0, topK);
}

module.exports = {
  indexDocuments,
  searchGuidelines
};
