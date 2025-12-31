const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

const app = express();
// Railway gebruikt de PORT environment variable
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Health check voor Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'FastCut AI is running!',
    hasApiKey: !!process.env.GOOGLE_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Check of API key aanwezig is
if (!process.env.GOOGLE_API_KEY) {
  console.warn('⚠️  WARNING: GOOGLE_API_KEY environment variable niet gevonden!');
  console.warn('   Voeg deze toe in Railway dashboard onder Variables');
}

// Initialiseer Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Functie om Fast Cinema script te genereren
async function generateFastCinemaScript(userTopic, userStyle) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Stijl beschrijvingen
  const styleDescriptions = {
    'teal-orange': 'Moody Teal & Orange kleurpallet met cinematische contrasten',
    'gritty-bw': 'Gritty Black & White met hoog contrast en filmkorrel',
    'neon-cyber': 'Cyberpunk Neon met felle kleuren en futuristische sfeer',
    'natural-warm': 'Natural Warmth met zachte, warme tinten'
  };

  const styleDescription = styleDescriptions[userStyle] || userStyle;

  // System prompt voor Gemini
  const prompt = `Je bent een professionele Fast Cinema script generator voor korte, intense video's van 30 seconden.

ONDERWERP: ${userTopic}
VISUELE STIJL: ${styleDescription}

Maak een gedetailleerd script met deze exacte structuur:

**SCRIPT STRUCTUUR:**
Verdeel de 30 seconden in 5-7 segmenten
Elke rij moet deze kolommen bevatten:
- TIJD (bijv. 00-03)
- VISUEEL (camera beweging, shot type, acties)
- AUDIO (muziek, sound effects, whooshes)
- VOICE-OVER (tekst die gesproken wordt)

**VEREISTEN:**
- Gebruik tags zoals [HOOK], [BUILD-UP], [ACTION], [CLIMAX], [OUTRO]
- Focus op: Speed Ramping, Whooshes, snelle cuts, dramatische transities
- Voeg specifieke camera bewegingen toe (dolly zoom, drone shot, etc.)
- Beschrijf exact welke sound effects gebruikt worden
- Houd het extreem dynamisch, cinematisch en professioneel
- Totale duur moet exact 30 seconden zijn

Presenteer het als een duidelijk geformatteerde tabel.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Gemini API fout: ${error.message}`);
  }
}

// API Endpoint: Genereer script
app.post('/api/generate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { topic, style } = req.body;

    // Validatie
    if (!topic || topic.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Onderwerp is verplicht' 
      });
    }

    // Check API key
    if (!process.env.GOOGLE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Server configuratiefout: GOOGLE_API_KEY niet gevonden',
        hint: 'Voeg de API key toe in Railway dashboard'
      });
    }

    console.log(`📝 [${new Date().toISOString()}] Genereren script voor: "${topic}" (stijl: ${style})`);

    // Genereer het script
    const script = await generateFastCinemaScript(topic, style);

    const duration = Date.now() - startTime;
    console.log(`✅ Script succesvol gegenereerd in ${duration}ms`);

    res.json({
      success: true,
      script: script,
      topic: topic,
      style: style,
      generatedAt: new Date().toISOString(),
      duration: duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error na ${duration}ms:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Er ging iets mis bij het genereren van het script',
      details: error.message,
      duration: duration
    });
  }
});

// API Info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'FastCut AI API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      generate: 'POST /api/generate',
      info: 'GET /api/info'
    },
    status: 'operational'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint niet gevonden',
    path: req.path 
  });
});

// Start de server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🚀 FastCut AI Backend gestart!');
  console.log(`📍 Server draait op poort: ${PORT}`);
  console.log(`🔑 API Key status: ${process.env.GOOGLE_API_KEY ? '✅ Aanwezig' : '❌ ONTBREEKT'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Gestart op: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
});