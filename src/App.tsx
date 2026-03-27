/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, MessageSquare, X, ChevronRight, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { FAQ_DATA } from './constants';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content: "Hello! I'm your FAQ assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Check if it matches an FAQ
    const matchedFAQ = FAQ_DATA.find(faq => 
      content.toLowerCase().includes(faq.question.toLowerCase()) ||
      faq.question.toLowerCase().includes(content.toLowerCase())
    );

    if (matchedFAQ) {
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: matchedFAQ.answer,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 500);
      return;
    }

    // If no FAQ match, use Gemini
    try {
      const model = "gemini-3-flash-preview";
      const response = await genAI.models.generateContent({
        model,
        contents: content,
        config: {
          systemInstruction: "You are a helpful FAQ chatbot. Keep your answers concise and professional. If you don't know the answer, politely say so.",
        }
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: response.text || "I'm sorry, I couldn't process that request.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: "Oops! Something went wrong. Please try again later.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[80vh] border border-slate-200">
        {/* Header */}
        <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight">FAQ Assistant</h1>
              <p className="text-xs text-indigo-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Online & Ready to help
              </p>
            </div>
          </div>
          <button className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
                    ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-3 rounded-2xl shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    <p className={`text-[10px] mt-1 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 items-center bg-white border border-slate-100 p-3 rounded-2xl shadow-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-medium">Assistant is thinking...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* FAQ Suggestions */}
        {messages.length < 4 && !isLoading && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 px-1">Suggested Questions</p>
            <div className="flex flex-wrap gap-2">
              {FAQ_DATA.map((faq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(faq.question)}
                  className="text-xs bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-all flex items-center gap-1 group shadow-sm"
                >
                  <MessageSquare size={12} className="text-slate-400 group-hover:text-indigo-500" />
                  {faq.question}
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 -ml-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question here..."
              className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 flex items-center justify-center"
            >
              <Send size={20} />
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-3">
            Powered by Gemini AI • Built with AI Studio
          </p>
        </div>
      </div>
    </div>
  );
}
