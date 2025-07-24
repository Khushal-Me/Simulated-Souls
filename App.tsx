
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from '@google/genai';
import { createChatSession, sendMessageToGemini, generateImageWithCloudflare } from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [currentSceneDescription, setCurrentSceneDescription] = useState<string>('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [playerAction, setPlayerAction] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const chatRef = useRef<Chat | null>(null);
  const sceneDescriptionRef = useRef<HTMLDivElement>(null); // For scrolling

  const scrollToBottom = () => {
    sceneDescriptionRef.current?.scrollTo({
        top: sceneDescriptionRef.current.scrollHeight,
        behavior: 'smooth'
    });
  };

  useEffect(() => {
    if (currentSceneDescription) {
        scrollToBottom();
    }
  }, [currentSceneDescription]);

  const handleGenericError = (err: unknown, context: string) => {
    console.error(`Error ${context}:`, err);
    setLoadingMessage(''); // Clear loading message on error
    if (err instanceof Error) {
      if (err.message.startsWith("RateLimitError:")) {
        setError(`You've exceeded your current API usage quota. Please check your plan and billing details, or try again later. For more information, visit https://ai.google.dev/gemini-api/docs/rate-limits.`);
      } else if (err.message.includes("Invalid API Key")) {
        setError("Invalid API Key. Please ensure your API_KEY is correctly configured in the environment variables and that the key is valid.");
      } else if (err.message.includes("overloaded") || err.message.includes("UNAVAILABLE")) {
        setError("The AI service is currently experiencing high traffic. We automatically retry failed requests, but if this persists, please try again in a few minutes.");
      } else {
        setError(`An error occurred: ${err.message}`);
      }
    } else {
      setError(`An unknown error occurred while ${context.toLowerCase()}.`);
    }
  };

  const handleStartGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCurrentImageUrl(null); 
    setCurrentSceneDescription('');
    setLoadingMessage('Starting your adventure...');
    try {
      chatRef.current = createChatSession();
      const initialResponse = await sendMessageToGemini(chatRef.current, "Start the adventure.");
      if (initialResponse) {
        setCurrentSceneDescription(initialResponse.sceneDescription);
        setLoadingMessage('Generating scene artwork...');
        const imageUrl = await generateImageWithCloudflare(initialResponse.imagePrompt);
        setCurrentImageUrl(imageUrl);
        setGameStarted(true);
        setLoadingMessage('');
      } else {
        setLoadingMessage('');
        setError("Failed to initialize the game. The AI storyteller might be busy or returned an unexpected response.");
      }
    } catch (err) {
      handleGenericError(err, "starting game");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePlayerActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerAction.trim() || !chatRef.current || isLoading) return;

    setIsLoading(true);
    setError(null);
    const actionToSubmit = playerAction;
    setPlayerAction(''); // Clear input field immediately
    setLoadingMessage('Processing your action...');

    try {
      // Append player action to scene description for context
      setCurrentSceneDescription(prev => `${prev}\n\n> ${actionToSubmit}\n`);

      const gameResponse = await sendMessageToGemini(chatRef.current, actionToSubmit);
      if (gameResponse) {
        setCurrentSceneDescription(prev => `${prev}\n${gameResponse.sceneDescription}`);
        setLoadingMessage('Creating scene artwork...');
        const imageUrl = await generateImageWithCloudflare(gameResponse.imagePrompt);
        setCurrentImageUrl(imageUrl);
        setLoadingMessage('');
      } else {
        setLoadingMessage('');
        setError("The story took an unexpected turn, or the AI is pondering. Try a different action or check if the AI returned an empty response.");
         setCurrentSceneDescription(prev => `${prev}\n\n[The narrator seems to have lost their train of thought...]`);
      }
    } catch (err) {
      handleGenericError(err, "processing your action");
       setCurrentSceneDescription(prev => `${prev}\n\n[An ominous silence fills the air as your words echo unanswered...]`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRestartGame = () => {
    setGameStarted(false);
    setCurrentSceneDescription('');
    setCurrentImageUrl(null);
    setPlayerAction('');
    setError(null);
    setIsLoading(false);
    setLoadingMessage('');
    chatRef.current = null; // Reset chat session
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 selection:bg-purple-500 selection:text-white" style={{fontFamily: "'Inter', sans-serif"}}>
      <header className="w-full max-w-3xl text-center mb-8">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400" style={{fontFamily: "'MedievalSharp', cursive"}}>
          Simulated Souls
        </h1>
        <p className="text-purple-300 mt-2 text-lg">Your choices shape the world. What will you do?</p>
      </header>

      <main className="w-full max-w-3xl bg-gray-800 bg-opacity-70 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-8">
        <ErrorMessage message={error || ""} />

        {!gameStarted ? (
          <div className="text-center">
            {isLoading ? (
              <div className="flex flex-col items-center space-y-4">
                <LoadingSpinner size="w-16 h-16" />
                {loadingMessage && (
                  <p className="text-purple-300 text-lg animate-pulse">{loadingMessage}</p>
                )}
              </div>
            ) : (
              <button
                onClick={handleStartGame}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 text-xl focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-opacity-50"
              >
                Begin Your Adventure
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 h-72 md:h-96 w-full bg-gray-700 rounded-lg shadow-inner overflow-hidden flex items-center justify-center border-2 border-purple-500 border-opacity-30">
              {isLoading && !currentImageUrl ? (
                <div className="flex flex-col items-center space-y-4">
                  <LoadingSpinner size="w-16 h-16" />
                  {loadingMessage && (
                    <p className="text-purple-300 text-lg animate-pulse">{loadingMessage}</p>
                  )}
                </div>
              ) : currentImageUrl ? (
                <img src={currentImageUrl} alt="Current game scene" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-400 text-lg p-4">
                  {isLoading ? 'Conjuring visuals...' : 'Awaiting the first vision...'}
                </div>
              )}
            </div>
            
            <div 
              ref={sceneDescriptionRef}
              className="h-64 md:h-80 bg-gray-700 bg-opacity-50 p-4 rounded-lg shadow-inner mb-6 overflow-y-auto whitespace-pre-wrap text-lg leading-relaxed border border-gray-600 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800"
              aria-live="polite"
            >
              {currentSceneDescription || "The story awaits its beginning..."}
               {isLoading && <span className="animate-pulse"> The air shimmers with anticipation...</span>}
            </div>

            <form onSubmit={handlePlayerActionSubmit} className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={playerAction}
                onChange={(e) => setPlayerAction(e.target.value)}
                placeholder="What do you do?"
                className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-colors duration-200"
                disabled={isLoading}
                aria-label="Player action input"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                disabled={isLoading || !playerAction.trim()}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="w-5 h-5" />
                    <span className="text-sm">Sending...</span>
                  </div>
                ) : (
                  'Send Action'
                )}
              </button>
            </form>
            
            {isLoading && loadingMessage && (
              <div className="mt-3 text-center">
                <p className="text-purple-300 text-sm animate-pulse flex items-center justify-center space-x-2">
                  <span>🔮</span>
                  <span>{loadingMessage}</span>
                </p>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <button
                onClick={handleRestartGame}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
                disabled={isLoading}
              >
                Restart Adventure
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
