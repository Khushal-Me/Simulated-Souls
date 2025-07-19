# Cloudflare AI Setup Guide 🌩️

This guide will help you set up Cloudflare Workers AI for image generation in your Simulated Souls adventure game.

## 📋 Prerequisites

- Active Cloudflare account
- Cloudflare Workers AI enabled (usually free tier available)
- Basic understanding of API keys and account IDs

## 🔧 Step-by-Step Setup

### 1. 🏠 Get Your Cloudflare Account ID

Your Account ID is essential for API calls to Cloudflare Workers AI.

1. **Log in** to your [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Select any domain** (or navigate to the main dashboard)
3. **Look at the right sidebar** - your Account ID will be displayed
4. **Copy the Account ID** (it looks like: `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p`)

### 2. 🔑 Get Your Global API Key

The Global API Key provides full access to your Cloudflare account via API.

1. **Navigate** to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Scroll down** to "Global API Key" section
3. **Click "View"** next to Global API Key
4. **Enter your password** when prompted
5. **Copy the API key** (long string of characters)

⚠️ **Security Note**: Keep your Global API Key secure - it provides full account access!

### 3. 📝 Update Configuration Files

#### Update the Proxy Server

Open [`proxy-server/server.js`](proxy-server/server.js) and replace the Account ID:

```javascript
// filepath: proxy-server/server.js
// Find this line (around line 13):
const ACCOUNT_ID = '5d75d0ccc6c315c0fd24bda444e188c7';

// Replace with your Account ID:
const ACCOUNT_ID = 'your_actual_account_id_here';
```

#### Update Environment Variables

In your `.env.local` file:

```bash
# Add your Cloudflare API Key
CLOUDFLARE_API_KEY=your_global_api_key_here

# Your Gemini key should already be here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. 🧪 Test Your Configuration

#### Start the Proxy Server
```bash
node proxy-server/server.js
```

You should see:
```
🚀 Cloudflare AI Proxy Server running at http://localhost:3001
📡 Ready to proxy image generation requests to Cloudflare AI
```

#### Check Status Endpoint
```bash
curl http://localhost:3001/api/status
```

Expected response:
```json
{
  "hasApiKey": true,
  "accountId": "your_account_id",
  "server": "Cloudflare AI Proxy",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

#### Test Image Generation
```bash
curl -X POST http://localhost:3001/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a magical crystal cave with glowing gems"}'
```

## ⚙️ Configuration Details

### 🎨 Image Generation Parameters

The current setup in [`proxy-server/server.js`](proxy-server/server.js) uses these optimized settings:

```javascript
{
  prompt: `${prompt}, epic fantasy art, detailed, cinematic lighting, high quality`,
  num_steps: 20,      // Generation steps (1-50, higher = better quality)
  guidance: 7.5,      // Prompt adherence (1-20, higher = more faithful)
  width: 1024,        // Image width in pixels
  height: 1024,       // Image height in pixels
}
```

### 🎯 Model Information

- **Model**: `@cf/bytedance/stable-diffusion-xl-lightning`
- **Type**: Text-to-image generation
- **Speed**: Lightning-fast (~2-3 seconds)
- **Quality**: High-resolution (1024x1024)
- **Style**: Optimized for fantasy/adventure themes

## 🔍 Troubleshooting

### ❌ Common Error Messages

**"Account ID not found"**
- Double-check your Account ID in [`proxy-server/server.js`](proxy-server/server.js)
- Ensure you copied the full Account ID from Cloudflare dashboard

**"Invalid API Key"**
- Verify your Global API Key in `.env.local`
- Make sure you copied the entire key without extra spaces
- Check that the key hasn't expired or been regenerated

**"Workers AI not enabled"**
- Log into Cloudflare dashboard
- Navigate to "Workers & Pages" → "AI"
- Ensure Workers AI is enabled for your account

**"Rate limit exceeded"**
- Check your [Workers AI usage](https://dash.cloudflare.com/usage)
- Consider upgrading to a paid plan for higher limits
- Wait before making additional requests

### 🛠️ Debug Steps

1. **Check Environment Variables**:
   ```bash
   # In your terminal
   echo $CLOUDFLARE_API_KEY  # Should show your key
   ```

2. **Verify Proxy Server**:
   ```bash
   # Should return status information
   curl http://localhost:3001/api/status
   ```

3. **Test Network Connectivity**:
   ```bash
   # Test direct Cloudflare API access
   ping api.cloudflare.com
   ```

4. **Check Logs**:
   - Monitor proxy server console output
   - Look for error messages in browser developer tools


## 🔧 Advanced Configuration

### Custom Model Parameters

You can modify generation parameters in [`proxy-server/server.js`](proxy-server/server.js):

```javascript
// For faster generation (lower quality):
num_steps: 10,
guidance: 5.0,

// For higher quality (slower):
num_steps: 30,
guidance: 10.0,

// For different aspect ratios:
width: 768,   // Portrait
height: 1024,

width: 1024,  // Landscape
height: 768,
```

### Email Configuration

The proxy server uses a hardcoded email address. Update it in [`proxy-server/server.js`](proxy-server/server.js):

```javascript
headers: {
  'X-Auth-Email': 'your-cloudflare-email@example.com',  // Update this
  'X-Auth-Key': CLOUDFLARE_API_KEY,
  'Content-Type': 'application/json',
},
```

## 🌟 Tips for Better Images

### Effective Prompts
- Be specific about visual details
- Include style keywords: "epic", "cinematic", "detailed"
- Specify lighting: "dramatic lighting", "soft glow", "moonlight"
- Add atmosphere: "mystical", "ancient", "ethereal"

### Example Prompts That Work Well
```
"Ancient stone temple with glowing runes, mystical fog, dramatic lighting"
"Dark forest clearing with magical creatures, moonlight filtering through trees"
"Crystal cavern with bioluminescent plants, underground lake, fantasy art"
```

## 📚 Additional Resources

- [Cloudflare Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Stable Diffusion XL Lightning Model Info](https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
- [Workers AI REST API Reference](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/)

---

**🎉 You're all set!** Your Simulated Souls should now generate beautiful AI artwork for every scene in your adventure.
