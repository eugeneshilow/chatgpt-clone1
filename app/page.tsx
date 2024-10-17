"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useRef } from 'react';
import { Menu, Send, Plus } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { streamMessage, ChatMessage } from '../actions/stream-message';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { readStreamableValue } from 'ai/rsc';

export default function Home() {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [conversations, setConversations] = useState<ChatMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => setSidebarVisible(!isSidebarVisible);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isStreaming) {
      const userMessage: ChatMessage = { id: messages.length, role: 'user', content: inputMessage };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsStreaming(true);
      setIsGenerating(true);

      const assistantMessageId = messages.length + 1;
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      try {
        const { output } = await streamMessage([...messages, userMessage]);

        for await (const chunk of readStreamableValue(output)) {
          console.log("Received chunk:", chunk); // Debug log
          if (typeof chunk === 'string') {  // Add this check
            setMessages(prev => {
              const newMessages = [...prev];
              const assistantMessageIndex = newMessages.findIndex(m => m.id === assistantMessageId);
              if (assistantMessageIndex !== -1) {
                newMessages[assistantMessageIndex] = {
                  ...newMessages[assistantMessageIndex],
                  content: chunk
                };
              }
              return newMessages;
            });
          }
        }
      } catch (error) {
        console.error('Error streaming message:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          const assistantMessageIndex = newMessages.findIndex(m => m.id === assistantMessageId);
          if (assistantMessageIndex !== -1) {
            newMessages[assistantMessageIndex] = {
              ...newMessages[assistantMessageIndex],
              content: `Sorry, an error occurred while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
          return newMessages;
        });
      } finally {
        setIsStreaming(false);
        setIsGenerating(false);
      }
    }
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.5; }
           50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        .typing-dot {
          width: 10px;
          height: 10px;
          background-color: #10a37f;
          border-radius: 50%;
          display: inline-block;
          margin: 0 3px;
        }
        .typing-dot:nth-child(1) { animation: pulse 1.5s infinite 0s; }
        .typing-dot:nth-child(2) { animation: pulse 1.5s infinite 0.3s; }
        .typing-dot:nth-child(3) { animation: pulse 1.5s infinite 0.6s; }
      `}</style>
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
        {/* Sidebar toggle and content */}
        <div style={{ position: 'relative' }}>
          <Menu
            onClick={toggleSidebar}
            style={{
              position: 'absolute',
              top: '20px',
              left: '10px',
              cursor: 'pointer',
              color: '#333',
              zIndex: 1,
            }}
          />
        </div>
        {isSidebarVisible && (
          <div style={{ width: '300px', backgroundColor: '#f7f7f8', borderRight: '1px solid #e0e0e0', padding: '20px' }}>
            {/* Sidebar content */}
          </div>
        )}
        
        <div style={{ flex: 1, backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            {messages.map((message) => (
              <div key={message.id} style={{
                display: 'flex',
                padding: '20px 0',
                borderBottom: '1px solid #e5e5e5',
              }}>
                <div style={{
                  backgroundColor: message.role === 'user' ? '#5436DA' : '#10a37f',
                  color: '#fff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '15px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}>
                  {message.role === 'user' ? 'U' : 'A'}
                </div>
                <div style={{ flex: 1 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isGenerating && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSendMessage} style={{ 
            borderTop: '1px solid #e5e5e5', 
            padding: '20px', 
            backgroundColor: '#fff', 
            maxWidth: '800px',
            margin: '0 auto',
            width: '100%',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #e5e5e5',
              borderRadius: '5px',
              padding: '8px',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            }}>
              <TextareaAutosize
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                minRows={1}
                maxRows={5}
                placeholder="Send a message"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  resize: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isStreaming}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px',
                }}
              >
                <Send size={20} color="#10a37f" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function TypingIndicator() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      padding: '20px 0',
      borderBottom: '1px solid #e5e5e5',
    }}>
      <div style={{
        backgroundColor: '#10a37f',
        color: '#fff',
        width: '30px',
        height: '30px',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '15px',
        fontSize: '14px',
        fontWeight: 'bold',
      }}>
        A
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
    </div>
  );
}
