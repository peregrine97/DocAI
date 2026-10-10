import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  SemanticChunkingVisual, 
  HybridSearchVisual, 
  CrossEncoderVisual, 
  StrictAbstentionVisual, 
  GroundedSynthesisVisual 
} from './PipelineVisuals';

const features = [
  {
    meta: "01 - INGESTION",
    title: "SEMANTIC CHUNKING",
    description: "Intelligently divides documents by meaning, not arbitrary limits."
  },
  {
    meta: "02 - RETRIEVAL",
    title: "TWO-STAGE SEARCH",
    description: "Lightning-fast ANN combined with deep Cross-Encoder reranking."
  },
  {
    meta: "03 - GENERATION",
    title: "ZERO HALLUCINATION",
    description: "Strict confidence thresholds guarantee factually grounded responses."
  }
];

const pipelineSteps = [
  { step: "01", category: "INGESTION", name: "Semantic Chunking", detail: "Documents are intelligently divided by semantic meaning, not arbitrary character limits, and embedded into high-dimensional vectors.", bgImage: "/semantic_bg_2.jpg" },
  { step: "02", category: "RETRIEVAL", name: "Hybrid Search", detail: "Qdrant executes a high-speed Approximate Nearest Neighbor search to quickly filter thousands of vectors and find relevant context.", bgImage: "/step_02_bg.jpg" },
  { step: "03", category: "RERANKING", name: "Cross-Encoder", detail: "A deep neural network analyzes the exact contextual relationship between your query and each candidate chunk to guarantee relevance.", bgImage: "/step_03_bg.jpg" },
  { step: "04", category: "GUARDRAILS", name: "Strict Abstention", detail: "If the confidence score falls below our strict threshold, the system safely abstains from answering to completely prevent hallucinations.", bgImage: "/step_04_bg.jpg" },
  { step: "05", category: "GENERATION", name: "Grounded Synthesis", detail: "The LLM synthesizes a final conversational response, actively citing the exact document chunk IDs used as factual evidence.", bgImage: "/step_05_bg.jpg" }
];

const FloatingNav = ({ isLoaded }) => {
  const navigate = useNavigate();
  return (
    <motion.div 
      className="floating-nav"
      initial={{ y: -100, opacity: 0, x: "-50%" }}
      animate={{ y: isLoaded ? 0 : -100, opacity: isLoaded ? 1 : 0, x: "-50%" }}
      transition={{ duration: 0.8, delay: isLoaded ? 0.8 : 0, ease: [0.16, 1, 0.3, 1] }}
    >
      <div 
        className="nav-logo" 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ cursor: 'pointer' }}
      >
        Doc <span className="serif-italic" style={{fontWeight: 600}}>AI.</span>
      </div>
      <button className="nav-btn" onClick={() => navigate('/app')}>BEGIN</button>
    </motion.div>
  );
};

// GSAP-style SplitText Stagger Component
const SplitTextTitle = () => {
  const w1 = "Doc ".split("");
  const w2 = "AI.".split("");
  
  return (
    <motion.h1 
      className="hero-title"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
      }}
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}
    >
      <span style={{ display: 'flex', alignItems: 'baseline' }}>
        {w1.map((char, i) => (
          <span key={'w1'+i} style={{ display: 'inline-block' }}>
            <motion.span
              style={{ display: 'inline-block', transformOrigin: 'bottom' }}
              variants={{
                hidden: { y: "40%", opacity: 0, rotateZ: 8 },
                visible: { y: 0, opacity: 1, rotateZ: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          </span>
        ))}
      </span>
      <span className="serif-italic" style={{ display: 'flex', alignItems: 'baseline' }}>
        {w2.map((char, i) => (
          <span key={'w2'+i} style={{ display: 'inline-block' }}>
            <motion.span
              style={{ display: 'inline-block', transformOrigin: 'bottom' }}
              variants={{
                hidden: { y: "40%", opacity: 0, rotateZ: -8 },
                visible: { y: 0, opacity: 1, rotateZ: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
              }}
            >
              {char}
            </motion.span>
          </span>
        ))}
      </span>
    </motion.h1>
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Wait for the SplitText animation to finish before smoothly staggering in the rest
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing-container">
      <FloatingNav isLoaded={isLoaded} />
      
      {/* Hero Section */}
      <section className="hero-section snap-section">
        <div className="hero-content-wrapper">
          
          <div className="hero-main">
            
            {/* The Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="badge mono-meta hero-badge"
            >
              // ADVANCED INTELLIGENCE
            </motion.div>

            {/* SplitText Stagger Reveal */}
            <SplitTextTitle />

            {/* Subtitle & Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: isLoaded ? 0.2 : 0 }}
              className="hero-secondary-actions"
            >
              <p className="hero-subtitle">The enterprise-grade retrieval pipeline built for absolute precision and clarity in every insight.</p>
              
              <div className="hero-actions">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="begin-btn"
                  onClick={() => navigate('/app')}
                >
                  Begin Analysis
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Floating Features Grid */}
          <div className="hero-features-grid">
            {features.map((feat, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30, rotateX: 10 }}
                animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30, rotateX: isLoaded ? 0 : 10 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: isLoaded ? 0.4 + (index * 0.15) : 0 }}
                className="hero-feature-card glass-panel"
                style={{ perspective: 1000 }}
              >
                <div className="mono-meta hero-feature-meta">{feat.meta}</div>
                <h4>{feat.title}</h4>
                <p>{feat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fullscreen Pipeline Steps */}
      <div className="pipeline-fullscreen-container">
        {pipelineSteps.map((item, idx) => (
          <motion.section 
            key={idx}
            className="fullscreen-step snap-section"
            style={{ position: 'relative', overflow: 'hidden' }}
            initial="hidden"
            whileInView="visible"
            viewport={{ amount: 0.4 }} 
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { staggerChildren: 0.15 }
              }
            }}
          >
            {item.bgImage && (
              <div 
                className="step-bg-image"
                style={{ backgroundImage: `url(${item.bgImage})` }}
              />
            )}
            <div className="step-content">
              <motion.div 
                className="step-header"
                variants={{
                  hidden: { opacity: 0, x: -50, filter: "blur(5px)" },
                  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: "easeOut" } }
                }}
              >
                <span className="mono-meta">{item.step} — {item.category}</span>
              </motion.div>
              
              <div className="title-overflow-container">
                <motion.h2 
                  className="step-title"
                  variants={{
                    hidden: { y: "100%", opacity: 0, rotateX: -30, filter: "blur(15px)" },
                    visible: { y: 0, opacity: 1, rotateX: 0, filter: "blur(0px)", transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }
                  }}
                >
                  {item.name}
                </motion.h2>
              </div>

              <div className="step-interactive-area">
                <motion.div 
                  className="step-desc-wrapper"
                  variants={{
                    hidden: { opacity: 0, y: 30, filter: "blur(5px)" },
                    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: "easeOut" } }
                  }}
                >
                  <p className="step-desc">{item.detail}</p>
                  <div className="mono-meta version-meta">DOC AI // V1.0.0</div>
                </motion.div>

                <motion.div 
                  className="step-visual-wrapper"
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, delay: 0.2, ease: "easeOut" } }
                  }}
                >
                  {idx === 0 && <SemanticChunkingVisual />}
                  {idx === 1 && <HybridSearchVisual />}
                  {idx === 2 && <CrossEncoderVisual />}
                  {idx === 3 && <StrictAbstentionVisual />}
                  {idx === 4 && <GroundedSynthesisVisual />}
                </motion.div>
              </div>
            </div>
          </motion.section>
        ))}
      </div>
      
      <style>{`
        /* FLOATING NAV */
        .floating-nav {
          position: fixed;
          top: 30px;
          left: 50%;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px 8px 24px;
          border-radius: 40px;
          background: rgba(2, 6, 23, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(15px);
          width: 90%;
          max-width: 320px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }

        .nav-logo {
          font-family: 'Inter', sans-serif;
          font-weight: 900;
          font-size: 1.3rem;
          letter-spacing: -1px;
          color: var(--text-primary);
        }

        .nav-links {
          font-size: 11px;
          color: var(--text-secondary);
          letter-spacing: 2px;
        }

        .nav-btn {
          background: var(--text-primary);
          color: var(--bg-color);
          border: none;
          padding: 10px 28px;
          border-radius: 30px;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .nav-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(255,255,255,0.2);
          background: #e0e0e0;
        }

        html, body {
          scroll-snap-type: y proximity;
          scroll-behavior: smooth;
        }

        .landing-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 10;
        }
        
        .snap-section {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .hero-section {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0 5%;
          position: relative;
        }

        .hero-content-wrapper {
          width: 100%;
          max-width: 1200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12vh;
          margin-top: 10vh;
        }
        
        .hero-main {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .hero-badge {
          margin-bottom: 24px;
        }

        .badge {
          display: inline-block;
          padding: 8px 18px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.2);
          color: var(--text-secondary);
          font-size: 11px;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(5px);
        }
        
        .hero-title {
          font-size: 6.5rem;
          font-weight: 900;
          letter-spacing: -4px;
          margin-bottom: 16px;
        }
        
        .hero-secondary-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-subtitle {
          font-size: 1.2rem;
          color: var(--text-secondary);
          max-width: 550px;
          margin: 0 auto 40px;
          line-height: 1.7;
        }
        
        .begin-btn {
          padding: 16px 40px;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: var(--text-primary);
          color: var(--bg-color);
          border: none;
          border-radius: 30px;
          cursor: pointer;
          box-shadow: 0 0 30px rgba(255,255,255,0.1);
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
        }
        
        .begin-btn:hover {
          box-shadow: 0 0 40px rgba(255,255,255,0.3);
          background: #e0e0e0;
        }

        .hero-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 40px;
        }

        .hero-feature-card {
          padding: 24px;
          text-align: left;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          transition: transform 0.3s ease, border-color 0.3s ease;
        }

        .hero-feature-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.06);
        }

        .hero-feature-meta {
          font-size: 10px;
          color: var(--accent);
          margin-bottom: 12px;
          font-weight: 700;
        }

        .hero-feature-card h4 {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .hero-feature-card p {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .fullscreen-step {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5%;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .step-bg-image {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
          mask-image: radial-gradient(circle at center, black 0%, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at center, black 0%, transparent 80%);
        }

        .step-content {
          width: 100%;
          max-width: 1400px;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 10;
        }

        .step-header {
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 20px;
          margin-bottom: 5vh;
        }

        .step-header .mono-meta {
          color: var(--text-secondary);
          font-size: 14px;
          letter-spacing: 4px;
        }

        .title-overflow-container {
          overflow: hidden;
          margin-bottom: 10vh;
          perspective: 1000px;
        }

        .step-title {
          font-size: 7.5vw;
          font-weight: 900;
          line-height: 1.05;
          text-transform: uppercase;
          letter-spacing: -3px;
          max-width: 95%;
          word-wrap: break-word;
          transform-origin: bottom center;
        }

        .step-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          width: 100%;
        }

        .step-desc {
          font-size: 1.3rem;
          color: var(--text-secondary);
          max-width: 600px;
          line-height: 1.7;
        }

        .version-meta {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          text-align: right;
          margin-left: auto;
        }

        @media (max-width: 900px) {
          .hero-features-grid {
            grid-template-columns: 1fr;
          }
          .hero-content-wrapper {
            margin-top: 5vh;
          }
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 4.5rem; }
          .step-title { font-size: 12vw; letter-spacing: -1px; }
          .step-footer { flex-direction: column; align-items: flex-start; gap: 20px; }
          .step-desc { font-size: 1.1rem; }
        }
      `}</style>
    </div>
  );
}
