import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, FileText, CheckCircle2, Upload, Loader2, BookOpen, Hash, Plus, File, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../Workspace.css';

function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[\s]*[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
  return `<p>${html}</p>`;
}

export default function AppWorkspace() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Select a document from the left and start asking questions!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [chatProgressText, setChatProgressText] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [docIds, setDocIds] = useState([]);

  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocsForSearch, setSelectedDocsForSearch] = useState([]);
  const [searchScope, setSearchScope] = useState('All'); // 'All' or 'Selected'
  const [pdfPage, setPdfPage] = useState(1);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let interval;
    if (isUploading) {
      const states = ["UPLOADING...", "PARSING...", "INDEXING..."];
      let i = 0;
      setUploadProgressText(states[0]);
      interval = setInterval(() => {
        i = Math.min(i + 1, 2);
        setUploadProgressText(states[i]);
      }, 1000);
    } else if (!isUploading && uploadProgressText) {
      setUploadProgressText("READY ✓");
      setTimeout(() => setUploadProgressText(""), 2000);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  useEffect(() => {
    let interval;
    if (isLoading) {
      const states = ["RETRIEVING...", "RERANKING...", "GENERATING..."];
      let i = 0;
      setChatProgressText(states[0]);
      interval = setInterval(() => {
        i = Math.min(i + 1, 2);
        setChatProgressText(states[i]);
      }, 800);
    } else {
      setChatProgressText("");
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/v1/ingest/list_documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        if (data.documents && data.documents.length > 0 && !selectedDoc) {
          setSelectedDoc(data.documents[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/v1/ingest/upload_batch`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        if (data.document_ids?.length) {
          setDocIds(prev => [...new Set([...prev, ...data.document_ids])]);
        }
        await fetchDocuments();
        if (files[0].name) {
          setSelectedDoc(files[0].name);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (e, filename) => {
    e.stopPropagation(); // prevent selecting the document for preview
    if (!window.confirm(`Are you sure you want to remove ${filename}?`)) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/v1/ingest/document/filename/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(doc => doc !== filename));
        setSelectedDocsForSearch(prev => prev.filter(doc => doc !== filename));
        if (selectedDoc === filename) {
          setSelectedDoc(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete document", err);
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/v1/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg.content,
          session_id: sessionId,
          filenames: searchScope === 'Selected' && selectedDocsForSearch.length > 0 ? selectedDocsForSearch : null
        })
      });

      const data = await res.json();

      if (data.session_id) setSessionId(data.session_id);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        cached: data.cached
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to backend API." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="workspace-container">
      {/* HEADER */}
      <header className="workspace-header">
        <div className="workspace-logo" onClick={() => navigate('/')}>
          Doc <span className="serif-italic">AI.</span>
        </div>
        <div className="workspace-header-title">
          {selectedDoc ? selectedDoc : "No Document Selected"}
        </div>
        <div className="workspace-user">
          <div className="status-dot"></div> Online
        </div>
      </header>

      <div className="workspace-layout">

        {/* LEFT PANEL: DOCUMENTS */}
        <div className="workspace-panel sidebar-panel">
          <div className="panel-header">
            <h3>DOCUMENTS</h3>
          </div>

          <div className="upload-wrapper">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp"
              multiple
            />
            <button
              className="upload-action-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 size={16} className="spin" /> : (uploadProgressText === "READY ✓" ? <CheckCircle2 size={16} /> : <Plus size={16} />)}
              {isUploading ? uploadProgressText : (uploadProgressText || "Upload")}
            </button>
          </div>

          <div className="scope-toggle" style={{display: 'flex', gap: '10px', padding: '10px 15px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
            <button 
              style={{flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid ' + (searchScope === 'All' ? 'var(--primary-color)' : 'transparent'), background: searchScope === 'All' ? 'rgba(0,255,170,0.1)' : 'transparent', color: searchScope === 'All' ? 'var(--primary-color)' : '#888', cursor: 'pointer', transition: 'all 0.2s', fontSize: '12px'}}
              onClick={() => setSearchScope('All')}
            >
              All Docs
            </button>
            <button 
              style={{flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid ' + (searchScope === 'Selected' ? 'var(--primary-color)' : 'transparent'), background: searchScope === 'Selected' ? 'rgba(0,255,170,0.1)' : 'transparent', color: searchScope === 'Selected' ? 'var(--primary-color)' : '#888', cursor: 'pointer', transition: 'all 0.2s', fontSize: '12px'}}
              onClick={() => setSearchScope('Selected')}
            >
              Selected
            </button>
          </div>

          <div className="document-list">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className={`document-item ${selectedDoc === doc ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDoc(doc);
                  setPdfPage(1);
                  setMessages([{ role: 'assistant', content: `You are now chatting with **${doc}**. What would you like to know?` }]);
                  setSessionId(null);
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden'}}>
                  {searchScope === 'Selected' && (
                    <input 
                      type="checkbox" 
                      checked={selectedDocsForSearch.includes(doc)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedDocsForSearch(prev => [...prev, doc]);
                        } else {
                          setSelectedDocsForSearch(prev => prev.filter(d => d !== doc));
                        }
                      }}
                      style={{marginRight: '10px', cursor: 'pointer'}}
                    />
                  )}
                  <FileText size={16} className="doc-icon" style={{minWidth: '16px'}} />
                  <span className="doc-name" style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{doc}</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteDocument(e, doc)}
                  style={{background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', opacity: 0.7, padding: '4px', display: 'flex', alignItems: 'center'}}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                  title="Remove document"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {documents.length === 0 && !isUploading && (
              <div className="no-docs">No documents uploaded yet.</div>
            )}
          </div>
        </div>

        {/* MIDDLE PANEL: PDF VIEWER */}
        <div className="workspace-panel viewer-panel">
          <div className="panel-header">
            <h3>PDF / DOCUMENT</h3>
          </div>
          <div className="viewer-content">
            {selectedDoc ? (
              selectedDoc.endsWith('.pdf') ? (
                <iframe
                  key={`${selectedDoc}-${pdfPage}`}
                  src={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/documents/${selectedDoc}#page=${pdfPage}`}
                  className="pdf-iframe"
                  title="PDF Viewer"
                />
              ) : (
                <div className="non-pdf-viewer">
                  <File size={48} style={{ opacity: 0.5, marginBottom: '20px' }} />
                  <p>Preview for non-PDF files is not supported.</p>
                  <a href={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/documents/${selectedDoc}`} target="_blank" rel="noreferrer" className="view-raw-link">View File</a>
                </div>
              )
            ) : (
              <div className="empty-viewer">
                <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
                <p>Select a document to view</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: CHAT */}
        <div className="workspace-panel chat-panel">
          <div className="panel-header">
            <h3>CHAT</h3>
          </div>

          <div className="workspace-chat-messages">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`workspace-message-bubble ${msg.role}`}
              >
                <div className="message-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />

                {msg.sources && msg.sources.length > 0 && (
                  <div className="message-sources">
                    <div className="sources-title">Sources</div>
                    {msg.sources.map((src, idx) => (
                      <div key={idx} className="source-item">
                        <div className="source-header">
                          <div
                            className="source-location"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              if (src.filename) setSelectedDoc(src.filename);
                              if (src.page_number) setPdfPage(src.page_number);
                            }}
                          >
                            <BookOpen size={12} />
                            <span>Pg {src.page_number || '?'}</span>
                          </div>
                        </div>
                        <div className="source-preview">"{src.text_preview || (src.text ? src.text.substring(0, 80) + '...' : '')}"</div>
                      </div>
                    ))}
                  </div>
                )}
                {msg.cached && (
                  <div className="cached-badge">
                    <CheckCircle2 size={12} /> Cached
                  </div>
                )}
              </motion.div>
            ))}
            {isLoading && (
              <div className="workspace-message-bubble assistant loading" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                {chatProgressText}
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="workspace-chat-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
