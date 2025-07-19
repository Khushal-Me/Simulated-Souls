const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the main .env.local file
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const ACCOUNT_ID = '5d75d0ccc6c315c0fd24bda444e188c7';

// Debug endpoint to check configuration
app.get('/api/status', (req, res) => {
  res.json({
    hasApiKey: !!CLOUDFLARE_API_KEY,
    accountId: ACCOUNT_ID,
    server: 'Cloudflare AI Proxy',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!CLOUDFLARE_API_KEY) {
      return res.status(500).json({ error: 'Cloudflare API key not configured' });
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Auth-Email': 'khushaldemehta@gmail.com',
        'X-Auth-Key': CLOUDFLARE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `${prompt}, epic fantasy art, detailed, cinematic lighting, high quality`,
        num_steps: 20,
        guidance: 7.5,
        width: 1024,
        height: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Cloudflare API error: ${response.status} ${response.statusText}`,
        details: errorText 
      });
    }

    // Get the image as buffer
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    res.json({ imageUrl: dataUrl });

  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Cloudflare AI Proxy Server running at http://localhost:${port}`);
  console.log(`📡 Ready to proxy image generation requests to Cloudflare AI`);
});
