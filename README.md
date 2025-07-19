# Simulated Souls 🎭

An immersive AI-powered text adventure game that combines the storytelling prowess of Google's Gemini 2.0 Flash with the visual creativity of Cloudflare's AI image generation. Every choice you make shapes both the narrative and the accompanying artwork in real-time.

## ✨ Features

- **🎪 Dynamic Storytelling**: Powered by Gemini 2.0 Flash for rich, contextual narratives
- **🎨 Real-time Image Generation**: Cloudflare's stable-diffusion-xl-lightning creates stunning visuals for every scene
- **⚡ Lightning-fast Responses**: Optimized for quick story progression and image generation
- **🎮 Interactive Gameplay**: Your actions directly influence the story direction
- **📱 Responsive Design**: Beautiful UI that works on desktop and mobile
- **🔄 Seamless Experience**: Smooth transitions between story beats with visual feedback

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Build Tool**: Vite with ES modules
- **AI Services**:
- Google Gemini 2.0 Flash (text generation)
- Cloudflare Workers AI (image generation)
- **Backend**: Express.js proxy server for CORS handling
- **Styling**: Tailwind CSS with custom gradients and animations

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (version 16 or higher)
- **npm** or **yarn** package manager
- **Google Gemini API Key** (free tier available)
- **Cloudflare API Key** and Account ID

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Khushal-Me/Simulated-Souls
cd Simulated-Souls
npm install
```

### 2. Set Up API Keys

Create a `.env.local` file in the root directory:

```bash
# Google Gemini API Key (for storytelling)
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudflare API Key (for image generation)
CLOUDFLARE_API_KEY=your_cloudflare_global_api_key_here
```

### 3. Configure Cloudflare Account

Update your Cloudflare Account ID in [`proxy-server/server.js`](proxy-server/server.js):

```javascript
const ACCOUNT_ID = 'your_cloudflare_account_id_here';
```

### 4. Install Proxy Server Dependencies

```bash
cd proxy-server
npm install
cd ..
```

### 5. Run the Application

**Terminal 1** - Start the proxy server:
```bash
node proxy-server/server.js
```

**Terminal 2** - Start the main application:
```bash
npm run dev
```

### 6. Play the Game

Open your browser and navigate to `http://localhost:5173`

### 7. Demo

https://github.com/user-attachments/assets/e1a72930-f73b-4459-8a10-4d0ead24e20b


## 🔑 Getting Your API Keys

### 📚 Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key to your `.env.local` file

### ☁️ Cloudflare API Key & Account ID

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to "My Profile" → "API Tokens"
3. Scroll to "Global API Key" and click "View"
4. Copy the key to your `.env.local` file
5. Find your Account ID in the right sidebar of any domain dashboard
6. Update the `ACCOUNT_ID` in [`proxy-server/server.js`](proxy-server/server.js)

## 🏗️ Project Structure

```
gemini-adventure-weaver/
├── 📁 components/ # React components
│ ├── ErrorMessage.tsx # Error display component
│ └── LoadingSpinner.tsx # Loading animation component
├── 📁 proxy-server/ # Express.js CORS proxy
│ ├── server.js # Proxy server for Cloudflare API
│ └── package.json # Proxy dependencies
├── 📁 services/ # API service layer
│ └── geminiService.ts # Gemini & Cloudflare integrations
├── App.tsx # Main application component
├── index.tsx # Application entry point
├── types.ts # TypeScript type definitions
├── vite.config.ts # Vite configuration
└── .env.local # Environment variables (create this)
```

## 🎮 How to Play

1. **Start**: Click "Begin Your Adventure" to initialize your story
2. **Read**: Enjoy the AI-generated scene description and accompanying artwork
3. **Act**: Type your action in the input field (e.g., "open the door", "talk to the wizard")
4. **Watch**: See how your choices influence both the story and generated images
5. **Continue**: Keep making choices to weave your unique adventure
6. **Restart**: Use the "Restart Adventure" button to begin a new story

## ⚙️ Configuration

### 📖 Story Configuration

Customize the storytelling behavior by modifying the `SYSTEM_INSTRUCTION` in [`services/geminiService.ts`](services/geminiService.ts).

## 🔧 Troubleshooting

### Common Issues

**🚫 CORS Errors**
- Ensure the proxy server is running on port 3001
- Check that [`proxy-server/server.js`](proxy-server/server.js) is properly configured

**🔑 API Authentication**
- Verify your `.env.local` file exists and contains valid API keys
- Check the proxy server status at `http://localhost:3001/api/status`
- Ensure your Cloudflare account has Workers AI enabled

**🖼️ Image Generation Failures**
- Verify your Cloudflare Account ID is correct
- Check your Cloudflare API quota and billing status
- Ensure you're using the Global API Key, not a scoped token

**🌐 Network Issues**
- Make sure ports 3001 and 5173 are available
- Check your firewall settings
- Verify internet connectivity for API calls

### Debug Commands

Check proxy server status:
```bash
curl http://localhost:3001/api/status
```

Test image generation:
```bash
curl -X POST http://localhost:3001/api/generate-image \
-H "Content-Type: application/json" \
-d '{"prompt": "a magical forest"}'
```

## 🚀 Deployment

### Development
```bash
npm run dev # Start development server
```

### Production Build
```bash
npm run build # Build for production
npm run preview # Preview production build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).


## 📞 Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review the [Cloudflare setup guide](CLOUDFLARE_SETUP.md)
3. Open an issue on GitHub
4. Check API status pages for service outages
