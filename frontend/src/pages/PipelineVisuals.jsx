import React from 'react';
import { motion } from 'framer-motion';
import './PipelineVisuals.css';

// ==========================================
// 01 - SEMANTIC CHUNKING VISUAL
// ==========================================
export const SemanticChunkingVisual = () => {
  const chunks = [
    { id: 'CHUNK 01', title: 'System Architecture', tag: 'dim: 1536', delay: 0.2 },
    { id: 'CHUNK 02', title: 'Dense Retrieval Engine', tag: 'dim: 1536', delay: 0.4 },
    { id: 'CHUNK 03', title: 'Empirical Benchmarks', tag: 'dim: 1536', delay: 0.6 },
  ];

  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <span className="visual-dot green-dot" />
        <span className="visual-meta-title">SEMANTIC BOUNDARY DETECTION</span>
        <span className="visual-badge">GPU ACCELERATED</span>
      </div>

      <div className="chunking-visual-stage">
        {/* Animated Scanner Beam */}
        <motion.div
          className="chunk-scan-beam"
          animate={{ y: [0, 160, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {chunks.map((c, i) => (
          <motion.div
            key={c.id}
            className="chunk-box"
            initial={{ opacity: 0, x: -20, y: 0 }}
            whileInView={{ opacity: 1, x: 0, y: i * 4 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="chunk-box-left">
              <span className="chunk-id">{c.id}</span>
              <span className="chunk-text">{c.title}</span>
            </div>
            <div className="chunk-box-right">
              <span className="chunk-dim-tag">{c.tag}</span>
              <motion.span
                className="chunk-node-orb"
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="visual-card-footer">
        <span className="visual-footer-info">Chunks separated by embedding similarity threshold &gt; 0.82</span>
      </div>
    </div>
  );
};

// ==========================================
// 02 - HYBRID SEARCH VISUAL
// ==========================================
export const HybridSearchVisual = () => {
  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <span className="visual-dot blue-dot" />
        <span className="visual-meta-title">DUAL-STREAM RETRIEVAL</span>
        <span className="visual-badge">ANN + BM25</span>
      </div>

      <div className="hybrid-visual-stage">
        {/* User Query Pill */}
        <motion.div
          className="hybrid-query-pill"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="query-prefix">Q:</span> "transformer attention scalability"
        </motion.div>

        {/* Parallel Streams Branch */}
        <div className="hybrid-streams-row">
          {/* Dense Stream */}
          <motion.div
            className="hybrid-stream-col dense-col"
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="stream-header">
              <span className="stream-name">DENSE (ANN)</span>
              <span className="stream-score">0.94 COS</span>
            </div>
            <div className="stream-items">
              <div className="stream-candidate active"><span>#1</span> Chunk 17</div>
              <div className="stream-candidate"><span>#2</span> Chunk 29</div>
            </div>
          </motion.div>

          {/* Sparse Stream */}
          <motion.div
            className="hybrid-stream-col sparse-col"
            initial={{ opacity: 0, x: 15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="stream-header">
              <span className="stream-name">SPARSE (BM25)</span>
              <span className="stream-score">0.89 TF-IDF</span>
            </div>
            <div className="stream-items">
              <div className="stream-candidate"><span>#1</span> Chunk 04</div>
              <div className="stream-candidate active"><span>#2</span> Chunk 17</div>
            </div>
          </motion.div>
        </div>

        {/* Convergence Arrow / Fusion Node */}
        <motion.div
          className="hybrid-rrf-merge"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="rrf-tag">RRF CONVERGENCE (k=60)</div>
          <div className="rrf-top-match">
            <span className="rrf-rank">TOP MATCH:</span>
            <span className="rrf-id">CHUNK 17</span>
            <span className="rrf-score">0.965 COMBINED</span>
          </div>
        </motion.div>
      </div>

      <div className="visual-card-footer">
        <span className="visual-footer-info">Reciprocal Rank Fusion mitigates dense false-positives</span>
      </div>
    </div>
  );
};

// ==========================================
// 03 - CROSS-ENCODER VISUAL
// ==========================================
export const CrossEncoderVisual = () => {
  const candidates = [
    { id: 'CHUNK 29', initialScore: '0.78', finalScore: '0.94', isTop: true, title: 'Attention head caching' },
    { id: 'CHUNK 17', initialScore: '0.85', finalScore: '0.88', isTop: false, title: 'Linear complexity proofs' },
    { id: 'CHUNK 04', initialScore: '0.89', finalScore: '0.69', isTop: false, title: 'Historical hardware notes' },
  ];

  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <span className="visual-dot cyan-dot" />
        <span className="visual-meta-title">FULL ATTENTION RERANKING</span>
        <span className="visual-badge">CROSS-ENCODER</span>
      </div>

      <div className="rerank-visual-stage">
        <div className="rerank-table-header">
          <span>CANDIDATE</span>
          <span>RETRIEVER</span>
          <span>CROSS-SCORE</span>
        </div>

        {candidates.map((c, i) => (
          <motion.div
            key={c.id}
            className={`rerank-card-row ${c.isTop ? 'highlight-top' : ''}`}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
          >
            <div className="rerank-left">
              <span className="rerank-chunk-id">{c.id}</span>
              <span className="rerank-title">{c.title}</span>
            </div>
            <div className="rerank-score-initial">{c.initialScore}</div>
            <div className="rerank-score-final">
              <span className="final-value">{c.finalScore}</span>
              {c.isTop && <span className="top-badge">BEST</span>}
            </div>
          </motion.div>
        ))}

        <motion.div
          className="rerank-beam-line"
          animate={{ top: ['5%', '90%', '5%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="visual-card-footer">
        <span className="visual-footer-info">Cross-encoder computes query-document joint attention</span>
      </div>
    </div>
  );
};

// ==========================================
// 04 - STRICT ABSTENTION VISUAL
// ==========================================
export const StrictAbstentionVisual = () => {
  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <span className="visual-dot red-dot" />
        <span className="visual-meta-title">HALLUCINATION GUARDRAILS</span>
        <span className="visual-badge">THRESHOLD τ = 0.75</span>
      </div>

      <div className="abstain-visual-stage">
        {/* Scenario A: Passed */}
        <motion.div
          className="scenario-card pass-card"
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="scenario-top">
            <span className="scenario-name">QUERY A: FACTUAL IN-DOMAIN</span>
            <span className="scenario-tag green">0.92 CONFIDENCE</span>
          </div>
          <div className="scenario-bar-bg">
            <motion.div
              className="scenario-bar-fill green-fill"
              initial={{ width: 0 }}
              whileInView={{ width: '92%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
            <div className="threshold-marker-line" style={{ left: '75%' }} />
          </div>
          <div className="scenario-result-msg green">✓ SUFFICIENT EVIDENCE → GENERATE</div>
        </motion.div>

        {/* Scenario B: Safely Abstained */}
        <motion.div
          className="scenario-card abstain-card"
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="scenario-top">
            <span className="scenario-name">QUERY B: UNGROUNDED / UNKNOWN</span>
            <span className="scenario-tag red">0.38 CONFIDENCE</span>
          </div>
          <div className="scenario-bar-bg">
            <motion.div
              className="scenario-bar-fill red-fill"
              initial={{ width: 0 }}
              whileInView={{ width: '38%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
            />
            <div className="threshold-marker-line" style={{ left: '75%' }} />
          </div>
          <div className="scenario-result-msg red">✕ BELOW THRESHOLD → SAFELY ABSTAIN</div>
        </motion.div>
      </div>

      <div className="visual-card-footer">
        <span className="visual-footer-info">Zero tolerance for hallucination — system abstains when evidence is sparse</span>
      </div>
    </div>
  );
};

// ==========================================
// 05 - GROUNDED SYNTHESIS VISUAL
// ==========================================
export const GroundedSynthesisVisual = () => {
  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <span className="visual-dot purple-dot" />
        <span className="visual-meta-title">FACTUAL SYNTHESIS</span>
        <span className="visual-badge">100% GROUNDED</span>
      </div>

      <div className="synth-visual-stage">
        {/* Citations Stream */}
        <div className="synth-cits-row">
          <span className="cits-label">VERIFIED SOURCES:</span>
          <span className="synth-cit-badge">[CHUNK 17]</span>
          <span className="synth-cit-badge">[CHUNK 29]</span>
        </div>

        {/* Generative Output Card */}
        <motion.div
          className="synth-output-box"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="synth-text">
            "The multi-stage retrieval architecture achieves sub-10ms latency{' '}
            <span className="synth-inline-cite">[CHUNK 17]</span> while preserving rigorous citation fidelity{' '}
            <span className="synth-inline-cite">[CHUNK 29]</span> across all generated answers."
          </div>
        </motion.div>

        {/* Verification Footer Indicator */}
        <div className="synth-status-row">
          <span className="synth-status-pill">
            <span className="pulse-dot" /> ZERO UNGROUNDED CLAIMS DETECTED
          </span>
        </div>
      </div>

      <div className="visual-card-footer">
        <span className="visual-footer-info">Every assertion directly maps to exact vector chunks</span>
      </div>
    </div>
  );
};
