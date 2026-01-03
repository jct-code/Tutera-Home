"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  Loader2,
  MessageSquare,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useCommandHistoryStore } from "@/stores/commandHistoryStore";
import { useSuggestionStore } from "@/stores/suggestionStore";
import type { ExecutedAction } from "@/stores/commandHistoryStore";
import type { DeviceStateSnapshot } from "@/lib/ai/command-processor";

interface AICommandModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Speech recognition types for TypeScript
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Command history item display
interface ConversationItem {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  canUndo?: boolean;
  actions?: ExecutedAction[];
  commandStoreId?: string; // Links to the command history store for undo
}

export function AICommandModal({ isOpen, onClose }: AICommandModalProps) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [conversation, setConversation] = useState<ConversationItem[]>(() => {
    // Restore conversation from sessionStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('ai-chat-history');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.map((item: ConversationItem) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }));
        }
      } catch (e) {
        console.error('Failed to restore chat history:', e);
      }
    }
    return [];
  });
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  
  // Save conversation to sessionStorage whenever it changes
  useEffect(() => {
    if (conversation.length > 0) {
      try {
        sessionStorage.setItem('ai-chat-history', JSON.stringify(conversation));
      } catch (e) {
        console.error('Failed to save chat history:', e);
      }
    }
  }, [conversation]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const { getAuthHeaders } = useAuthStore();
  const { addCommand, markUndone, getLastUndoableCommand, getSnapshotsForUndo } =
    useCommandHistoryStore();
  const { setContextualSuggestions, recordCommand, getTopSuggestions, clearContextualSuggestions } =
    useSuggestionStore();
  
  // Get current suggestions (reactive)
  const suggestions = getTopSuggestions(5);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setInterimTranscript("");
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setInput(finalTranscript);
          setInterimTranscript("");
          // Auto-submit after voice input
          setTimeout(() => {
            handleSubmit(finalTranscript);
          }, 300);
        } else {
          setInterimTranscript(interimTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setError("Microphone access denied. Please enable it in your browser settings.");
        }
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom of conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  // Toggle voice recording
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      recognitionRef.current.start();
    }
  }, [isListening]);

  // Handle undo
  const handleUndo = useCallback(async (commandStoreId: string, conversationItemId: string) => {
    const snapshots = getSnapshotsForUndo(commandStoreId);
    if (snapshots.length === 0) {
      setError("No undo data available for this command.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch("/api/ai/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          message: "undo",
          undoSnapshots: snapshots,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        markUndone(commandStoreId);
        setConversation((prev) => [
          ...prev,
          {
            id: `undo-${Date.now()}`,
            type: "assistant",
            content: data.response || "Undone successfully.",
            timestamp: new Date(),
          },
        ]);
        
        // Update the original message to show it was undone
        setConversation((prev) =>
          prev.map((item) =>
            item.id === conversationItemId ? { ...item, canUndo: false } : item
          )
        );
      } else {
        setError(data.error || "Failed to undo command.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo command.");
    } finally {
      setIsProcessing(false);
    }
  }, [getAuthHeaders, getSnapshotsForUndo, markUndone]);

  // Submit command
  const handleSubmit = useCallback(async (overrideInput?: string) => {
    const messageText = overrideInput || input.trim();
    if (!messageText || isProcessing) return;
    
    // Record command for frequent usage tracking
    recordCommand(messageText);
    
    // Add user message to conversation
    const userMessageId = `user-${Date.now()}`;
    const newUserMessage = {
      id: userMessageId,
      type: "user" as const,
      content: messageText,
      timestamp: new Date(),
    };
    
    setConversation((prev) => [...prev, newUserMessage]);
    
    setInput("");
    setIsProcessing(true);
    setError(null);
    
    try {
      // Build conversation history for context (last 10 messages)
      const historyForAPI = [...conversation, newUserMessage]
        .slice(-10)
        .map((msg) => ({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.content,
        }));
      
      const response = await fetch("/api/ai/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ 
          message: messageText,
          conversationHistory: historyForAPI,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update contextual suggestions from AI if provided
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setContextualSuggestions(data.suggestions);
        }
        
        // Check if AI requested to clear conversation
        if (data.clearConversation) {
          setConversation([{
            id: `fresh-${Date.now()}`,
            type: "assistant",
            content: data.response,
            timestamp: new Date(),
          }]);
          // Clear contextual suggestions for fresh start
          clearContextualSuggestions();
        } else {
          const assistantMessageId = `assistant-${Date.now()}`;
          const hasActions = data.actions && data.actions.length > 0;
          
          // Add to command history store if there were actions and get the store ID
          let commandStoreId: string | undefined;
          if (hasActions) {
            commandStoreId = addCommand({
              userInput: messageText,
              aiResponse: data.response,
              actions: data.actions,
            });
          }
          
          setConversation((prev) => [
            ...prev,
            {
              id: assistantMessageId,
              type: "assistant",
              content: data.response,
              timestamp: new Date(),
              canUndo: hasActions && !data.wasUndo,
              actions: data.actions,
              commandStoreId, // Link to command store for undo
            },
          ]);
        }
      } else {
        setError(data.error || "Failed to process command.");
        setConversation((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            type: "assistant",
            content: data.error || "Sorry, I couldn't process that command.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send command.";
      setError(errorMessage);
      setConversation((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: "assistant",
          content: "Sorry, there was an error processing your request.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, getAuthHeaders, addCommand, conversation, recordCommand, setContextualSuggestions, clearContextualSuggestions]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const formatMessage = (content: string, onSuggestionClick?: (text: string) => void) => {
    const lines = content.split('\n');
    let inSuggestionSection = false;
    
    return lines.map((line, index) => {
      const isBullet = line.trim().startsWith('•');
      const isHeader = line.includes(':') && !isBullet && index === 0;
      const isSuggestionHeader = line.toLowerCase().includes('suggestion') || 
                                  line.toLowerCase().includes('you could') ||
                                  line.toLowerCase().includes('try:');
      const isDashSuggestion = line.trim().startsWith('- ') && !line.includes(':');
      
      // Track if we're in a suggestion section
      if (isSuggestionHeader) {
        inSuggestionSection = true;
      }
      
      // Render dash suggestions as clickable buttons
      if (isDashSuggestion && onSuggestionClick) {
        const suggestionText = line.replace(/^[\s-]+/, '').trim();
        return (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestionText)}
            className="flex items-center gap-2 py-1.5 px-3 my-1 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 rounded-lg text-[var(--accent)] transition-colors text-left w-full"
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{suggestionText}</span>
          </button>
        );
      }
      
      if (isBullet) {
        return (
          <div key={index} className="flex items-start gap-2 py-1">
            <span className="text-[var(--accent)] mt-0.5">•</span>
            <span>{line.replace('•', '').trim()}</span>
          </div>
        );
      }
      
      if (isHeader) {
        return (
          <div key={index} className="font-semibold text-base mb-2">
            {line}
          </div>
        );
      }
      
      // Suggestion section header styling
      if (isSuggestionHeader) {
        return (
          <div key={index} className="font-medium text-sm text-[var(--text-secondary)] mt-3 mb-1">
            {line}
          </div>
        );
      }
      
      return (
        <div key={index} className={index > 0 ? 'mt-1' : ''}>
          {line}
        </div>
      );
    });
  };
  
  // Handle clicking an inline suggestion
  const handleInlineSuggestionClick = useCallback((text: string) => {
    if (!isProcessing) {
      setInput(text);
      handleSubmit(text);
    }
  }, [isProcessing, handleSubmit]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
            onClick={onClose}
          />
          
          {/* Floating Webpage Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="fixed inset-4 md:inset-auto md:top-8 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[600px] lg:w-[700px] bg-[var(--background)] rounded-3xl shadow-2xl border border-[var(--border-light)] z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--accent)]/15 via-[var(--accent)]/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/70 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-[var(--text-primary)] text-xl">
                    AI Home Control
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Control your home with natural language
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="w-6 h-6 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            {/* Conversation Area - Flexible height */}
            <div
              ref={conversationRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {conversation.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-full bg-[var(--surface)] flex items-center justify-center mb-4">
                    <MessageSquare className="w-10 h-10 text-[var(--text-secondary)] opacity-40" />
                  </div>
                  <p className="text-lg font-medium text-[var(--text-primary)]">Start a conversation</p>
                  <p className="text-base text-[var(--text-secondary)] mt-2 max-w-[400px]">
                    Ask me to control your lights, adjust the temperature, or check the status of your home.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <span className="px-3 py-1.5 bg-[var(--surface)] rounded-full text-sm text-[var(--text-secondary)]">
                      "Turn off 2nd floor lights"
                    </span>
                    <span className="px-3 py-1.5 bg-[var(--surface)] rounded-full text-sm text-[var(--text-secondary)]">
                      "Set living room to 72°"
                    </span>
                    <span className="px-3 py-1.5 bg-[var(--surface)] rounded-full text-sm text-[var(--text-secondary)]">
                      "What's on?"
                    </span>
                  </div>
                </div>
              ) : (
                conversation.map((item) => (
                  <div
                    key={item.id}
                    className={`flex ${item.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] md:max-w-[80%] rounded-2xl px-5 py-4 ${
                        item.type === "user"
                          ? "bg-[var(--accent)] text-white rounded-br-lg"
                          : "bg-[var(--surface)] text-[var(--text-primary)] rounded-bl-lg border border-[var(--border-light)]"
                      }`}
                    >
                      <div className="text-base leading-relaxed">
                        {item.type === "assistant" ? formatMessage(item.content, handleInlineSuggestionClick) : item.content}
                      </div>
                      {item.type === "assistant" && item.canUndo && item.commandStoreId && (
                        <button
                          onClick={() => handleUndo(item.commandStoreId!, item.id)}
                          disabled={isProcessing}
                          className="mt-3 flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline disabled:opacity-50 font-medium"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Undo this action
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-[var(--surface)] border border-[var(--border-light)] rounded-2xl rounded-bl-lg px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                      <span className="text-base text-[var(--text-secondary)]">
                        Processing your request...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Interim transcript */}
              {interimTranscript && (
                <div className="flex justify-end">
                  <div className="bg-[var(--accent)]/60 text-white rounded-2xl rounded-br-lg px-5 py-4 italic">
                    <p className="text-base">{interimTranscript}...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Error display */}
            {error && (
              <div className="px-6 py-3 bg-[var(--danger)]/10 border-t border-[var(--danger)]/20">
                <div className="flex items-center gap-3 text-[var(--danger)] text-base">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            {/* Input Area */}
            <div className="p-6 border-t border-[var(--border-light)] bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                {/* Voice button */}
                {speechSupported && (
                  <button
                    onClick={toggleListening}
                    disabled={isProcessing}
                    className={`p-4 rounded-2xl transition-all ${
                      isListening
                        ? "bg-[var(--danger)] text-white animate-pulse shadow-lg"
                        : "bg-[var(--background)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border-light)]"
                    } disabled:opacity-50`}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? (
                      <MicOff className="w-6 h-6" />
                    ) : (
                      <Mic className="w-6 h-6" />
                    )}
                  </button>
                )}
                
                {/* Text input */}
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Listening..." : "Type a command..."}
                    disabled={isProcessing || isListening}
                    className="w-full px-5 py-4 bg-[var(--background)] border border-[var(--border-light)] rounded-2xl text-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] disabled:opacity-50 transition-all"
                  />
                </div>
                
                {/* Send button */}
                <button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || isProcessing}
                  className="p-4 rounded-2xl bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
              
              {/* Quick suggestions - single horizontal scrollable row */}
              <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1 -mx-6 px-6">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      handleSubmit(suggestion);
                    }}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm bg-[var(--background)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full border border-[var(--border-light)] transition-all disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
