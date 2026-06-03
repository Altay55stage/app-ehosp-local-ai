require('dotenv').config();
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'p12DgAkX2ov4j9QzayU00HyFpO8mJxDm';

async function testMistral() {
  console.log("=== TESTING MISTRAL API ===");
  console.log("Using key:", MISTRAL_API_KEY.substring(0, 5) + "..." + MISTRAL_API_KEY.substring(MISTRAL_API_KEY.length - 4));
  
  // Test Embeddings API
  console.log("\n1. Testing embeddings...");
  try {
    const embedRes = await fetch('https://api.mistral.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-embed',
        input: ['Bonjour le monde']
      })
    });
    
    if (!embedRes.ok) {
      const err = await embedRes.text();
      console.error("Embedding API Error:", embedRes.status, err);
    } else {
      const data = await embedRes.json();
      console.log("Embedding API Success!");
      console.log("Embedding vector length:", data.data[0].embedding.length);
    }
  } catch (e) {
    console.error("Embedding Connection Error:", e);
  }

  // Test Chat Completions API
  console.log("\n2. Testing chat completions...");
  try {
    const chatRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'open-mistral-7b',
        messages: [{ role: 'user', content: 'Say hello in 3 words.' }]
      })
    });

    if (!chatRes.ok) {
      const err = await chatRes.text();
      console.error("Chat API Error:", chatRes.status, err);
    } else {
      const data = await chatRes.json();
      console.log("Chat API Success!");
      console.log("Response:", data.choices[0].message.content.trim());
    }
  } catch (e) {
    console.error("Chat Connection Error:", e);
  }
  console.log("=== MISTRAL TEST COMPLETE ===");
}

testMistral();
