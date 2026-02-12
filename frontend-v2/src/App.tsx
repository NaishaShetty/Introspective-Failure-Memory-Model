import React, { useState, useEffect, useCallback, useRef } from 'react';
import Dashboard from './components/Dashboard';
import InfoSection from './components/InfoSection';
import RiskCoverageSection from './components/RiskCoverageSection';
import { apiUrl } from './api';

// ─── Types ───
interface Toast {
    id: number;
    title: string;
    message: string;
    type: 'warning' | 'danger' | 'success';
    exiting?: boolean;
}

interface ConnectStats {
    model_type: string;
    total_failures: number;
    dataset_size: number;
    regimes: Record<string, number>;
}

const App: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [modalPhase, setModalPhase] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [connectStats, setConnectStats] = useState<ConnectStats | null>(null);
    const toastIdRef = useRef(0);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Theme toggle
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Toast management
    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { ...toast, id }]);
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 300);
        }, 4000);
    }, []);

    // Connect Engine (Feature 2)
    const handleConnect = async () => {
        setShowModal(true);
        setModalPhase('connecting');

        try {
            const res = await fetch(apiUrl('/api/connect'));
            if (res.ok) {
                const data = await res.json();
                await new Promise(resolve => setTimeout(resolve, 1500)); // Visual delay
                setConnectStats(data);
                setModalPhase('connected');
                addToast({ title: '✅ Engine Connected', message: 'IFM pipeline is live and monitoring.', type: 'success' });
            } else {
                setModalPhase('error');
            }
        } catch {
            setModalPhase('error');
        }
    };

    return (
        <div className="app-container">
            <div className="background-glow"></div>

            {/* ─── Toast Container (Feature 3) ─── */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
                        <div className="toast-title">{toast.title}</div>
                        <div className="toast-message">{toast.message}</div>
                    </div>
                ))}
            </div>

            {/* ─── Connect Engine Modal (Feature 2) ─── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => modalPhase !== 'connecting' && setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        {modalPhase === 'connecting' && (
                            <>
                                <div className="spinner"></div>
                                <h2>Connecting to Engine...</h2>
                                <p>Initializing pipeline, training model, and clustering failures.</p>
                            </>
                        )}
                        {modalPhase === 'connected' && connectStats && (
                            <>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                                <h2>Engine <span className="gradient-text">Connected</span></h2>
                                <p>IFM pipeline is live. Model trained and failure clusters identified.</p>
                                <div className="modal-stats">
                                    <div className="modal-stat">
                                        <div className="stat-label">Model</div>
                                        <div className="stat-val">{connectStats.model_type}</div>
                                    </div>
                                    <div className="modal-stat">
                                        <div className="stat-label">Failures</div>
                                        <div className="stat-val">{connectStats.total_failures}</div>
                                    </div>
                                    <div className="modal-stat">
                                        <div className="stat-label">Dataset</div>
                                        <div className="stat-val">{(connectStats.dataset_size / 1000).toFixed(0)}K</div>
                                    </div>
                                    <div className="modal-stat">
                                        <div className="stat-label">Regimes</div>
                                        <div className="stat-val">{Object.keys(connectStats.regimes).length}</div>
                                    </div>
                                </div>
                                <button className="btn-primary" style={{ marginTop: '2rem', width: '100%' }} onClick={() => setShowModal(false)}>
                                    Begin Monitoring →
                                </button>
                            </>
                        )}
                        {modalPhase === 'error' && (
                            <>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                                <h2>Connection Failed</h2>
                                <p>Make sure the backend is running: <code style={{ color: 'var(--accent-primary)' }}>py api.py</code></p>
                                <button className="btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => { setShowModal(false); }}>
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Navigation with Theme Toggle ─── */}
            <nav className={scrolled ? 'nav-scrolled' : ''}>
                <div className="container nav-content">
                    <div className="logo">
                        <span className="gradient-text">IFM</span>
                        <span className="version">v3.0</span>
                    </div>
                    <ul className="nav-links">
                        <li><a href="#about">About</a></li>
                        <li><a href="#features">Features</a></li>
                        <li><a href="#risk-coverage">Risk Curve</a></li>
                        <li><a href="#dashboard">Dashboard</a></li>
                    </ul>
                    <div className="nav-actions">
                        <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        <button className="btn-primary" onClick={handleConnect}>Connect Engine</button>
                    </div>
                </div>
            </nav>

            {/* ─── Main Content ─── */}
            <main>
                <section className="hero">
                    <div className="container">
                        <h1 className="hero-title">Introspective<br /><span>Failure Memory</span></h1>
                        <p className="hero-subtitle">
                            Empowering AI with the self-awareness to recognize its own limitations and proactively mitigate risks.
                        </p>
                        <div className="hero-btns">
                            <button className="btn-primary" onClick={handleConnect}>⚡ Connect Engine</button>
                            <a href="#about" className="btn-secondary">Learn More</a>
                        </div>
                    </div>
                </section>

                <InfoSection />

                <RiskCoverageSection />

                <section id="dashboard">
                    <div className="container">
                        <div className="section-header">
                            <h2>System <span className="gradient-text">Intelligence</span></h2>
                            <p>Real-time failure detection and regime analysis powered by WebSocket streaming.</p>
                        </div>
                        <Dashboard onToast={addToast} />
                    </div>
                </section>
            </main>

            <footer>
                <div className="container">
                    <p>&copy; 2026 IFM Laboratory. Next-Gen Model Safety.</p>
                </div>
            </footer>

            <style>{`
                nav {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    padding: 1.5rem 0;
                    z-index: 1000;
                    transition: all 0.4s ease;
                }
                .nav-scrolled {
                    padding: 0.8rem 0;
                    background: rgba(10, 12, 16, 0.85);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid var(--border);
                }
                [data-theme="light"] .nav-scrolled {
                    background: rgba(240, 242, 245, 0.85);
                }
                .nav-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .logo {
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .version {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    border: 1px solid var(--border);
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .nav-links {
                    display: flex;
                    list-style: none;
                    gap: 2.5rem;
                }
                .nav-links a {
                    color: var(--text-muted);
                    text-decoration: none;
                    font-size: 0.85rem;
                    transition: color 0.3s ease;
                    font-weight: 500;
                }
                .nav-links a:hover { color: var(--accent-primary); }
                .nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .btn-primary {
                    background: var(--gradient);
                    border: none;
                    padding: 0.7rem 1.6rem;
                    border-radius: 12px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-decoration: none;
                    font-size: 0.9rem;
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(0, 242, 255, 0.3);
                }
                .btn-secondary {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border);
                    padding: 0.7rem 1.6rem;
                    border-radius: 12px;
                    color: var(--text-main);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    font-size: 0.9rem;
                }
                .btn-secondary:hover { background: rgba(255,255,255,0.1); }

                .hero {
                    text-align: center;
                    padding-top: 10rem;
                    padding-bottom: 4rem;
                }
                .hero-title {
                    font-size: 4.5rem;
                    font-weight: 800;
                    line-height: 1;
                    margin-bottom: 2rem;
                    letter-spacing: -2px;
                }
                .hero-title span {
                    background: linear-gradient(90deg, var(--text-main), var(--text-muted));
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .hero-subtitle {
                    color: var(--text-muted);
                    font-size: 1.3rem;
                    max-width: 650px;
                    margin: 0 auto 2.5rem;
                }
                .hero-btns {
                    display: flex;
                    justify-content: center;
                    gap: 1.5rem;
                }

                .section-header {
                    text-align: center;
                    margin-bottom: 4rem;
                }
                .section-header h2 {
                    font-size: 2.5rem;
                    margin-bottom: 0.8rem;
                }
                .section-header p {
                    color: var(--text-muted);
                }

                footer {
                    padding: 3rem 0;
                    border-top: 1px solid var(--border);
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                }

                /* ─── Mobile Responsive (Feature 10) ─── */
                @media (max-width: 968px) {
                    .nav-links { display: none; }
                    .hero-title { font-size: 3rem; }
                    .hero-subtitle { font-size: 1.1rem; }
                }
                @media (max-width: 480px) {
                    .hero-title { font-size: 2.2rem; letter-spacing: -1px; }
                    .hero-subtitle { font-size: 1rem; }
                    .hero-btns { flex-direction: column; gap: 1rem; align-items: center; }
                    .nav-actions { gap: 0.5rem; }
                    .btn-primary, .btn-secondary { font-size: 0.8rem; padding: 0.6rem 1.2rem; }
                }
            `}</style>
        </div>
    );
};

export default App;
