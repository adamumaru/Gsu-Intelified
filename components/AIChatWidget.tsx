import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import type { ChatMessage } from '../types';

export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: "Hello! I'm the GSU AI Assistant. How can I help you with GSU IntelliFind today?", sender: 'ai', timestamp: Date.now() }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), text: userInput, sender: 'user', timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    // Fix: Add explicit type for chat history to satisfy Gemini API requirements.
    const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    const aiResponseText = await geminiService.chatWithAI(history, userInput);
    
    const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), text: aiResponseText, sender: 'ai', timestamp: Date.now() };
    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);
  };

  return (
    <>
      <div className={`fixed bottom-6 right-6 transition-all duration-300 z-50 ${isOpen ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-deep-navy text-white w-16 h-16 rounded-full shadow-soft-lg flex items-center justify-center hover:bg-gray-800 transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary-green/50"
          aria-label="Open AI Chat"
        >
          <ChatIcon />
        </button>
      </div>

      <div className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-[calc(100%-3rem)] sm:w-96 h-[70vh] max-h-[600px] bg-white dark:bg-deep-navy rounded-3xl shadow-soft-lg flex flex-col transition-all duration-300 ease-in-out transform z-50 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-deep-navy rounded-t-3xl">
          <h3 className="text-lg font-bold text-white">GSU AI Assistant</h3>
          <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
            <CloseIcon />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-warm-gray dark:bg-gray-800">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                 {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-primary-gold flex items-center justify-center text-deep-navy font-bold flex-shrink-0">A</div>}
                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-primary-green text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-deep-navy dark:text-white rounded-bl-none'}`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2 justify-start">
                 <div className="w-8 h-8 rounded-full bg-primary-gold flex items-center justify-center text-deep-navy font-bold flex-shrink-0">A</div>
                 <div className="max-w-[80%] p-3 rounded-2xl bg-white dark:bg-gray-700 text-deep-navy dark:text-white rounded-bl-none">
                    <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.15s]"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.3s]"></span>
                    </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-pill focus:outline-none focus:ring-2 focus:ring-primary-green"
              disabled={isLoading}
            />
            <button type="submit" className="bg-deep-navy text-white w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center hover:bg-gray-800 disabled:bg-gray-400" disabled={isLoading || !userInput.trim()}>
              <SendIcon />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
);