import React from 'react';

const InfoSection: React.FC = () => {
    return (
        <section id="about" className="info-section">
            <div className="container">
                <div className="info-grid">
                    <div className="info-card glass main-info">
                        <h2>Why IFM?</h2>
                        <p className="large-p">
                            Deep Learning models are notoriously "overconfident" even when they are wrong.
                            When a model encounters a situation it hasn't seen before (OOD) or a sudden shift
                            in logic (Regime Change), it often provides a false prediction with high confidence.
                        </p>
                        <div className="benefits-list">
                            <div className="benefit">
                                <h3>01. Risk Mitigation</h3>
                                <p>By identifying failure clusters, the system knows exactly when to abstain, reducing critical errors by up to 80%.</p>
                            </div>
                            <div className="benefit">
                                <h3>02. Operational Cost</h3>
                                <p>Only escalate to human intervention when the model recognizes its own "Failure Memory" triggers, optimizing resource allocation.</p>
                            </div>
                            <div className="benefit">
                                <h3>03. Dynamic Adaptability</h3>
                                <p>Unlike static models, IFM continuously patterns its own failures to provide a growing protective layer for the core logic.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="features-grid">
                    <div className="feature-item">
                        <div className="icon">🧠</div>
                        <h4>Regime Discovery</h4>
                        <p>Clusters failures into semantic groups like Noise, Bounday Flips, or Contextual Lapses.</p>
                    </div>
                    <div className="feature-item">
                        <div className="icon">🛡️</div>
                        <h4>Safe Abstention</h4>
                        <p>Calculates the optimal Risk-Coverage tradeoff to ensure the model only acts when safe.</p>
                    </div>
                    <div className="feature-item">
                        <div className="icon">⚡</div>
                        <h4>High Throughput</h4>
                        <p>Optimized embedding checks ensure the safety layer adds minimal latency to the inference pipeline.</p>
                    </div>
                </div>
            </div>

            <style>{`
                .info-section {
                    background: rgba(255, 255, 255, 0.01);
                }
                .main-info {
                    padding: 5rem;
                    text-align: center;
                    border-radius: 40px;
                }
                .main-info h2 {
                    font-size: 3.5rem;
                    margin-bottom: 2rem;
                }
                .large-p {
                    font-size: 1.2rem;
                    color: var(--text-muted);
                    max-width: 800px;
                    margin: 0 auto 4rem;
                }
                .benefits-list {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 3rem;
                    text-align: left;
                }
                .benefit h3 {
                    color: var(--accent-primary);
                    margin-bottom: 1rem;
                    font-size: 1.1rem;
                    letter-spacing: 2px;
                }
                .benefit p {
                    font-size: 0.95rem;
                    color: var(--text-muted);
                }

                .features-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 2rem;
                    margin-top: 4rem;
                }
                .feature-item {
                    padding: 3rem;
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    transition: all 0.3s ease;
                }
                .feature-item:hover {
                    border-color: var(--accent-primary);
                    background: rgba(0, 242, 255, 0.02);
                }
                .feature-item .icon {
                    font-size: 2rem;
                    margin-bottom: 1.5rem;
                }
                .feature-item h4 {
                    font-size: 1.3rem;
                    margin-bottom: 1rem;
                }
                .feature-item p {
                    color: var(--text-muted);
                    font-size: 0.95rem;
                }

                @media (max-width: 968px) {
                    .benefits-list, .features-grid { grid-template-columns: 1fr; }
                    .main-info { padding: 2rem; }
                }
            `}</style>
        </section>
    );
};

export default InfoSection;
