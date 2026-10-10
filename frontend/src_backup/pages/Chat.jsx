import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, FileText, CheckCircle2, Upload, Loader2, BookOpen, Hash } from 'lucide-react';

// Simple Markdown to HTML converter
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // Headings
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^[\s]*[-*] (.+)$/gm, '<li>$1</li>')
    // Line breaks to paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
  return `<p>${html}</p>`;
}

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am connected to the Doc AI backend. Upload a document using the button in the header, then ask me questions about it.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  // Documents uploaded in this chat; questions are scoped to these so stale chunks from old uploads never leak in
  const [docIds, setDocIds] = useState([]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/ingest/upload_batch', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.document_ids?.length) {
          setDocIds(prev => [...new Set([...prev, ...data.document_ids])]);
        }
        const details = (data.files || []).map(f => {
          const parts = [`**${f.filename}**: ${f.total_pages ?? '?'} page(s), ${f.total_chunks} chunks`];
          if (f.scanned_pages) parts.push(`${f.ocr_pages_recovered ?? 0}/${f.scanned_pages} scanned pages OCR'd`);
          if (f.chunking_mode) parts.push(`${f.chunking_mode} chunking`);
          if (f.seconds !== undefined) parts.push(`${f.seconds}s`);
          const warn = f.warning || f.error ? ` ⚠️ ${f.warning || f.error}` : '';
          return `- ${parts.join(' · ')}${warn}`;
        }).join('\n');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.total_chunks > 0
            ? `Successfully ingested **${data.total_files} document(s)** into ${data.total_chunks} chunks.\n\n${details}\n\nYou can now ask questions across all of them.`
            : `No readable text could be extracted.\n\n${details}`
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Upload failed: ${data.detail}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error uploading document. Make sure the backend is running on port 8000." }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userMsg.content,
          session_id: sessionId,
          document_ids: docIds.length ? docIds : null
        })
      });
      
      const data = await res.json();
      
      if (data.session_id) {
        setSessionId(data.session_id);
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.answer,
        sources: data.sources,
        cached: data.cached
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to backend API. Make sure it is running on port 8000." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="chat-container"
    >
      <div className="chat-window glass-panel">
        <header className="chat-header">
          <div className="header-title">Doc <span className="serif-italic" style={{fontWeight: 600}}>AI.</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="upload-container">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
                accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp" 
                multiple
              />
              <button 
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                {isUploading ? "INGESTING..." : "UPLOAD DOC"}
              </button>
            </div>
            <div className="header-status">
              <span className="status-dot"></span> Online
            </div>
          </div>
        </header>
        
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`message-bubble ${msg.role}`}
            >
              <div className="message-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              
              {msg.sources && msg.sources.length > 0 && (
                <div className="message-sources">
                  <div className="sources-title">Sources</div>
                  {msg.sources.map((src, idx) => (
                    <div key={idx} className="source-item">
                      <div className="source-header">
                        <div className="source-location">
                          <BookOpen size={12} />
                          <span>Page {src.page_number || '?'}</span>
                          <span className="source-divider">•</span>
                          <Hash size={12} />
                          <span>Section {src.chunk_index || idx + 1}</span>
                        </div>
                        <div className="source-confidence">
                          <div className="confidence-bar">
                            <div className="confidence-fill" style={{ width: `${Math.min(Math.max((src.reranker_score || 0) / 8 * 100, 10), 100)}%` }}></div>
                          </div>
                          <span className="confidence-label">{(src.reranker_score || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="source-preview">"{src.text_preview || (src.text ? src.text.substring(0, 120) + '...' : '')}"</div>
                    </div>
                  ))}
                </div>
              )}
              {msg.cached && (
                <div className="cached-badge">
                  <CheckCircle2 size={12} /> Served instantly from Cache
                </div>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <div className="message-bubble assistant loading">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-container">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..." 
            className="chat-input"
            disabled={isLoading}
          />
          <button type="submit" className="send-btn" disabled={isLoading || !input.trim()}>
            <Send size={20} />
          </button>
        </form>
      </div>

      <style>{`
        .chat-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          position: relative;
          z-index: 10;
        }
        .chat-window {
          width: 100%;
          max-width: 900px;
          height: 100%;
          max-height: 800px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .chat-header {
          padding: 20px 30px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0,0,0,0.2);
        }
        .header-title {
          font-weight: 600;
          font-size: 1.2rem;
          letter-spacing: -0.5px;
        }
        .header-status {
          font-size: 0.85rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
        }
        .upload-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-primary);
          padding: 6px 14px;
          border-radius: 20px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .upload-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }
        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        
        .chat-messages {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .message-bubble {
          max-width: 85%;
          padding: 18px 24px;
          border-radius: 18px;
          line-height: 1.6;
          font-size: 15px;
        }
        .message-bubble.user {
          align-self: flex-end;
          background: var(--accent);
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .message-bubble.assistant {
          align-self: flex-start;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-bottom-left-radius: 4px;
        }
        .message-content {
          color: var(--text-primary);
        }
        .message-content h1, .message-content h2, .message-content h3, .message-content h4 {
          margin: 24px 0 12px 0;
          color: var(--accent);
          font-weight: 600;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 8px;
        }
        .message-content h1:first-child, .message-content h2:first-child, .message-content h3:first-child {
          margin-top: 0;
        }
        .message-content h1 { font-size: 1.4rem; }
        .message-content h2 { font-size: 1.25rem; }
        .message-content h3 { font-size: 1.1rem; }
        .message-content h4 { font-size: 1rem; }
        .message-content strong {
          color: var(--accent);
          font-weight: 700;
        }
        .message-content ul, .message-content ol {
          margin: 12px 0 12px 8px;
          padding-left: 20px;
          border-left: 2px solid var(--accent-glow);
        }
        .message-content li {
          margin-bottom: 10px;
          padding-left: 8px;
          line-height: 1.7;
          color: rgba(255,255,255,0.9);
        }
        .message-content li::marker {
          color: var(--accent);
        }
        .message-content p {
          margin: 12px 0;
          line-height: 1.7;
          color: rgba(255,255,255,0.9);
        }
        .message-content li p {
          margin: 0;
        }
        .message-content p:first-child {
          margin-top: 0;
        }
        .message-content p:last-child {
          margin-bottom: 0;
        }
        .message-sources {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.08);
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .sources-title {
          margin-bottom: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
        }
        .source-item {
          margin-bottom: 10px;
          background: rgba(0,0,0,0.35);
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.05);
          transition: border-color 0.2s;
        }
        .source-item:hover {
          border-color: rgba(255,255,255,0.12);
        }
        .source-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .source-location {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
        }
        .source-divider {
          color: rgba(255,255,255,0.2);
          margin: 0 2px;
        }
        .source-confidence {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .confidence-bar {
          width: 50px;
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .confidence-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 2px;
          transition: width 0.3s;
        }
        .confidence-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-family: 'Space Mono', monospace;
        }
        .source-preview {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          font-style: italic;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .cached-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #f59e0b;
          margin-top: 12px;
          font-weight: 600;
        }
        .chat-input-container {
          padding: 24px 30px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          gap: 16px;
          background: rgba(0,0,0,0.2);
        }
        .chat-input {
          flex: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 30px;
          padding: 0 24px;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s;
        }
        .chat-input:focus {
          border-color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.05);
        }
        .send-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--text-primary);
          color: var(--bg-color);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, background 0.3s;
        }
        .send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          background: #e0e0e0;
        }
        .send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .loading {
          display: flex;
          gap: 6px;
          align-items: center;
          padding: 24px;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: var(--text-secondary);
          border-radius: 50%;
          animation: pulse 1.5s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
