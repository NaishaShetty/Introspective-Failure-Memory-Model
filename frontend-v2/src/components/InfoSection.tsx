import React, { useEffect, useRef, useState } from 'react';

// ─── Animated Counter Component ───
const AnimatedCounter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({ target, suffix = '', duration = 2000 }) => {
    const [value, setValue] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                const start = Date.now();
                const animate = () => {
                    const elapsed = Date.now() - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setValue(Math.round(target * eased));
                    if (progress < 1) requestAnimationFrame(animate);
                };
                animate();
            }
        }, { threshold: 0.5 });

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target, duration]);

    return <span ref={ref}>{value}{suffix}</span>;
};

const InfoSection: React.FC = () => {
    return (
        <>
            {/* ─── Why IFM Section ─── */}
            <section id="about" className="info-section">
                <div className="container">
                    <div className="info-card glass main-info">
                        <h2>Why <span className="gradient-text">IFM</span>?</h2>
                        <p className="large-p">
                            Deep Learning models are notoriously "overconfident" even when they are wrong.
                            When a model encounters a situation it hasn't seen before (OOD) or a sudden shift
                            in logic (Regime Change), it often provides a false prediction with high confidence.
                            <strong> IFM solves this by adding a Meta-Cognitive safety layer.</strong>
                        </p>
                        <div className="benefits-list">
                            <div className="benefit">
                                <div className="benefit-number">01</div>
                                <h3>Risk Mitigation</h3>
                                <p>By identifying failure clusters, the system knows exactly when to abstain, reducing critical errors by up to 80%.</p>
                            </div>
                            <div className="benefit">
                                <div className="benefit-number">02</div>
                                <h3>Operational Cost</h3>
                                <p>Only escalate to human intervention when the model recognizes its own "Failure Memory" triggers.</p>
                            </div>
                            <div className="benefit">
                                <div className="benefit-number">03</div>
                                <h3>Dynamic Adaptability</h3>
                                <p>IFM continuously patterns its own failures to provide a growing protective layer for the core logic.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Features Grid ─── */}
            <section id="features">
                <div className="container">
                    <div className="section-header">
                        <h2>Core <span className="gradient-text">Capabilities</span></h2>
                        <p>The building blocks of introspective model safety.</p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-item">
                            <div className="icon">🧠</div>
                            <h4>Regime Discovery</h4>
                            <p>Clusters failures into semantic groups like Noise, Boundary Flips, or Contextual Lapses using KMeans on failure embeddings.</p>
                        </div>
                        <div className="feature-item">
                            <div className="icon">🛡️</div>
                            <h4>Safe Abstention</h4>
                            <p>Calculates the optimal Risk-Coverage tradeoff to ensure the model only acts when safe, reducing risk from 35% to 7%.</p>
                        </div>
                        <div className="feature-item">
                            <div className="icon">⚡</div>
                            <h4>Real-Time Streaming</h4>
                            <p>WebSocket-powered inference stream delivers sub-200ms failure detection for production-grade monitoring.</p>
                        </div>
                        <div className="feature-item">
                            <div className="icon">📊</div>
                            <h4>Anticipatory Confidence</h4>
                            <p>Analyzes temporal failure patterns to predict incoming failures before they happen.</p>
                        </div>
                        <div className="feature-item">
                            <div className="icon">🔬</div>
                            <h4>Cluster Specialists</h4>
                            <p>Deploy localized experts trained specifically on identified failure clusters for targeted improvements.</p>
                        </div>
                        <div className="feature-item">
                            <div className="icon">🎯</div>
                            <h4>Failure Embeddings</h4>
                            <p>PCA-based embedding space maps failures into interpretable 2D representations with confidence margins.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── How It Works (Feature 8) ─── */}
            <section className="how-it-works-section">
                <div className="container">
                    <div className="section-header">
                        <h2>How It <span className="gradient-text">Works</span></h2>
                        <p>The IFM pipeline in four steps.</p>
                    </div>
                    <div className="pipeline">
                        <div className="pipeline-step">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h4>Input Data</h4>
                                <p>Raw features arrive from the inference pipeline along with contextual metadata.</p>
                            </div>
                        </div>
                        <div className="pipeline-arrow">→</div>
                        <div className="pipeline-step">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h4>Base Model</h4>
                                <p>LogisticRegression makes a prediction and outputs a confidence score.</p>
                            </div>
                        </div>
                        <div className="pipeline-arrow">→</div>
                        <div className="pipeline-step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h4>Memory Check</h4>
                                <p>The failure embedding is compared against the FailureMemory buffer for known patterns.</p>
                            </div>
                        </div>
                        <div className="pipeline-arrow">→</div>
                        <div className="pipeline-step">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <h4>Safe Output</h4>
                                <p>If the pattern matches a failure cluster, the model abstains. Otherwise, the prediction is trusted.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Benchmarks (Feature 8) ─── */}
            <section className="benchmarks-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Performance <span className="gradient-text">Benchmarks</span></h2>
                        <p>Measured on 10,000 synthetic samples across 5 failure regimes.</p>
                    </div>
                    <div className="benchmark-grid">
                        <div className="benchmark-card glass">
                            <div className="benchmark-value"><AnimatedCounter target={80} suffix="%" /></div>
                            <div className="benchmark-label">Error Reduction</div>
                            <div className="benchmark-desc">Compared to uncalibrated baseline</div>
                        </div>
                        <div className="benchmark-card glass">
                            <div className="benchmark-value"><AnimatedCounter target={5} suffix="" /></div>
                            <div className="benchmark-label">Regimes Detected</div>
                            <div className="benchmark-desc">Clean, Flip, Noise, Context, OOD</div>
                        </div>
                        <div className="benchmark-card glass">
                            <div className="benchmark-value"><AnimatedCounter target={200} suffix="ms" /></div>
                            <div className="benchmark-label">Stream Latency</div>
                            <div className="benchmark-desc">WebSocket real-time updates</div>
                        </div>
                        <div className="benchmark-card glass">
                            <div className="benchmark-value"><AnimatedCounter target={3} suffix="" /></div>
                            <div className="benchmark-label">Failure Clusters</div>
                            <div className="benchmark-desc">KMeans-discovered groups</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Architecture (Feature 8) ─── */}
            <section className="architecture-section">
                <div className="container">
                    <div className="section-header">
                        <h2>System <span className="gradient-text">Architecture</span></h2>
                        <p>A modular, composable safety framework.</p>
                    </div>
                    <div className="arch-grid">
                        <div className="arch-layer glass">
                            <div className="arch-label">Frontend Layer</div>
                            <div className="arch-items">
                                <span className="arch-chip">React + Vite</span>
                                <span className="arch-chip">Chart.js</span>
                                <span className="arch-chip">WebSocket Client</span>
                            </div>
                        </div>
                        <div className="arch-connector">↕</div>
                        <div className="arch-layer glass">
                            <div className="arch-label">API Layer</div>
                            <div className="arch-items">
                                <span className="arch-chip">FastAPI</span>
                                <span className="arch-chip">REST + WebSocket</span>
                                <span className="arch-chip">CORS</span>
                            </div>
                        </div>
                        <div className="arch-connector">↕</div>
                        <div className="arch-layer glass">
                            <div className="arch-label">Intelligence Layer</div>
                            <div className="arch-items">
                                <span className="arch-chip">FailureMemory</span>
                                <span className="arch-chip">FailureEmbedder</span>
                                <span className="arch-chip">LogisticRegression</span>
                            </div>
                        </div>
                        <div className="arch-connector">↕</div>
                        <div className="arch-layer glass">
                            <div className="arch-label">Data Layer</div>
                            <div className="arch-items">
                                <span className="arch-chip">Synthetic Dataset</span>
                                <span className="arch-chip">Regime Scheduler</span>
                                <span className="arch-chip">5 Failure Modes</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <style>{`
                /* ─── Info Section ─── */
                .info-section { background: rgba(255, 255, 255, 0.01); }
                .main-info { padding: 4rem; text-align: center; border-radius: 32px; }
                .main-info h2 { font-size: 3rem; margin-bottom: 1.5rem; }
                .large-p { font-size: 1.15rem; color: var(--text-muted); max-width: 800px; margin: 0 auto 3rem; }
                .benefits-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5rem; text-align: left; }
                .benefit-number { font-size: 2.5rem; font-weight: 800; color: var(--accent-primary); opacity: 0.2; margin-bottom: 0.5rem; }
                .benefit h3 { color: var(--accent-primary); margin-bottom: 0.8rem; font-size: 1rem; letter-spacing: 1px; }
                .benefit p { font-size: 0.9rem; color: var(--text-muted); }

                /* ─── Features Grid ─── */
                .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
                .feature-item {
                    padding: 2.5rem;
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .feature-item:hover {
                    transform: translateY(-6px);
                    border-color: var(--accent-primary);
                    box-shadow: 0 20px 40px rgba(0, 242, 255, 0.06);
                }
                .feature-item .icon { font-size: 2rem; margin-bottom: 1.2rem; }
                .feature-item h4 { font-size: 1.2rem; margin-bottom: 0.8rem; }
                .feature-item p { color: var(--text-muted); font-size: 0.9rem; }

                /* ─── Pipeline / How It Works ─── */
                .pipeline {
                    display: flex;
                    align-items: stretch;
                    gap: 0;
                    justify-content: center;
                }
                .pipeline-step {
                    flex: 1;
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 2rem;
                    text-align: center;
                    transition: all 0.3s ease;
                }
                .pipeline-step:hover {
                    border-color: var(--accent-primary);
                    background: rgba(0, 242, 255, 0.02);
                }
                .step-number {
                    width: 40px;
                    height: 40px;
                    background: var(--gradient);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    margin: 0 auto 1rem;
                    color: white;
                }
                .step-content h4 { margin-bottom: 0.5rem; }
                .step-content p { color: var(--text-muted); font-size: 0.85rem; }
                .pipeline-arrow {
                    display: flex;
                    align-items: center;
                    font-size: 1.5rem;
                    color: var(--accent-primary);
                    padding: 0 0.8rem;
                    font-weight: 800;
                }

                /* ─── Benchmarks ─── */
                .benchmark-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
                .benchmark-card { padding: 2.5rem; text-align: center; }
                .benchmark-value { font-size: 3rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 0.5rem; }
                .benchmark-label { font-size: 1rem; font-weight: 600; margin-bottom: 0.3rem; }
                .benchmark-desc { font-size: 0.8rem; color: var(--text-muted); }

                /* ─── Architecture ─── */
                .arch-grid { max-width: 600px; margin: 0 auto; }
                .arch-layer { padding: 2rem; text-align: center; }
                .arch-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; color: var(--accent-primary); margin-bottom: 1rem; font-weight: 700; }
                .arch-items { display: flex; gap: 0.8rem; justify-content: center; flex-wrap: wrap; }
                .arch-chip {
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    padding: 0.4rem 1rem;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    transition: all 0.3s ease;
                }
                .arch-chip:hover { border-color: var(--accent-primary); color: var(--text-main); }
                .arch-connector { text-align: center; font-size: 1.5rem; color: var(--accent-primary); padding: 0.5rem 0; opacity: 0.5; }

                /* ─── Responsive ─── */
                @media (max-width: 968px) {
                    .benefits-list, .features-grid { grid-template-columns: 1fr; }
                    .main-info { padding: 2rem; }
                    .benchmark-grid { grid-template-columns: repeat(2, 1fr); }
                    .pipeline { flex-direction: column; }
                    .pipeline-arrow { transform: rotate(90deg); justify-content: center; padding: 0.5rem 0; }
                }
                @media (max-width: 480px) {
                    .benchmark-grid { grid-template-columns: 1fr; }
                    .main-info h2 { font-size: 2rem; }
                }
            `}</style>
        </>
    );
};

export default InfoSection;
