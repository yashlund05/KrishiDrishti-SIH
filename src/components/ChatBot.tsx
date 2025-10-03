import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Volume2, Languages, Bot, User, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export const ChatBot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [language, setLanguage] = useState("en");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
  ];

  const getWelcomeMessage = useCallback((lang: string) => ({
    en: "Hello! I'm your AI farming assistant. How can I help you with your crops today?",
    es: "¡Hola! Soy tu asistente de IA agrícola. ¿Cómo puedo ayudarte con tus cultivos hoy?",
    fr: "Bonjour! Je suis votre assistant IA agricole. Comment puis-je vous aider avec vos cultures aujourd'hui?",
    hi: "नमस्ते! मैं आपका AI कृषि सहायक हूँ। आज मैं आपकी फसलों के साथ कैसे मदद कर सकता हूँ?",
    pt: "Olá! Sou seu assistente de IA agrícola. Como posso ajudá-lo com suas culturas hoje?",
  })[lang as keyof typeof welcomeMessages] || "Hello!", [language]);
  
  useEffect(() => {
    setMessages([{
      id: "1", content: getWelcomeMessage(language), sender: "bot", timestamp: new Date(),
    }]);
  }, [language, getWelcomeMessage]);

  useEffect(() => {
    setSpeechSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  }, []);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), content, sender: "user", timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: content, language }
      });

      if (error) throw new Error(error.message || 'Failed to get response from AI');
      if (!data?.message) throw new Error('No response received from AI');

      const botMessage: Message = { id: (Date.now() + 1).toString(), content: data.message, sender: "bot", timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
      
      await playTextToSpeech(data.message);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const playTextToSpeech = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, language, voice: 'alloy' }
      });
      if (error) throw new Error(error.message);

      if (data?.audioContent) {
        const audioBlob = new Blob([Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error: any) {
      console.error('Error playing TTS:', error);
    }
  };
  
  const processAudioTranscription = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: { audio: base64Audio, language }
        });

        if (error) throw new Error(error.message);
        if (data?.text) await sendMessage(data.text);
      };
      reader.readAsDataURL(audioBlob);
    } catch (error: any) {
      console.error('Error processing audio:', error);
      toast({ title: "Transcription Error", description: error.message, variant: "destructive" });
    }
  };

  const startListening = async () => {
    if (!speechSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await processAudioTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsListening(true);
    } catch (error: any) {
      toast({ title: "Microphone Error", description: error.message, variant: "destructive" });
    }
  };

  const stopListening = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsListening(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };
  
  const getPlaceholder = () => ({
    en: "Ask about your crops, soil, or farming tips...",
    es: "Pregunta sobre cultivos...", fr: "Demandez des conseils...",
    hi: "फसलों के बारे में पूछें...", pt: "Pergunte sobre cultivos...",
  })[language] || "Ask a question...";

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl overflow-hidden shadow-2xl border">
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"><Bot className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">Farm AI Assistant<Sparkles className="w-5 h-5 animate-bounce" /></h2>
              <div className="flex items-center gap-2 text-green-100 text-sm"><div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div><span>Always here to help</span></div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Volume2 className="w-5 h-5 text-green-200" />
            <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-2">
              <Languages className="w-4 h-4" />
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent border-0 text-white text-sm outline-none">
                {languages.map((lang) => (<option key={lang.code} value={lang.code} className="text-gray-800">{lang.flag} {lang.name}</option>))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] group`}>
                {message.sender === 'bot' && (<div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><span className="text-xs font-medium text-green-600">AI Assistant</span></div>)}
                {message.sender === 'user' && (<div className="flex items-center gap-2 mb-2 justify-end"><span className="text-xs font-medium text-gray-600">You</span><div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-white" /></div></div>)}
                <div className={`p-4 rounded-2xl shadow-lg ${message.sender === 'user' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'}`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className={`flex items-center gap-1 mt-2 text-xs ${message.sender === 'user' ? 'text-green-200' : 'text-gray-500'}`}><span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{message.sender === 'user' && <span className="ml-1">✓✓</span>}</div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (<div className="flex justify-start"><div className="max-w-[80%]"><div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div><span className="text-xs font-medium text-green-600">AI Assistant</span></div><div className="bg-white p-4 rounded-2xl rounded-bl-sm border border-gray-200 shadow-lg"><div className="flex items-center gap-1"><div className="flex gap-1"><div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div><span className="text-xs text-gray-500 ml-2">AI is thinking...</span></div></div></div></div>)}
          <div ref={messagesEndRef} />
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSubmit(e)} placeholder={getPlaceholder()} className="w-full px-4 py-3 bg-gray-100 rounded-full border-0 focus:ring-2 focus:ring-green-500 pr-12" disabled={isLoading} />
              {speechSupported && (<button type="button" onClick={isListening ? stopListening : startListening} disabled={isLoading} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`}><Mic className="w-4 h-4" /></button>)}
            </div>
            <button type="submit" disabled={!inputValue.trim() || isLoading} className={`p-3 rounded-full transition-all ${inputValue.trim() && !isLoading ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:scale-105' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><Send className="w-5 h-5" /></button>
          </form>
        </div>
      </div>
    </div>
  );
};