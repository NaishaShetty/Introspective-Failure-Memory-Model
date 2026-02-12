import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import InfoSection from './components/InfoSection';

const App: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="app-container">
            <div className="background-glow"></div>

            <nav className={scrolled ? 'nav-scrolled' : ''}>
                <div className="container nav-content">
                    <div className="logo">
                        <span className="gradient-text">IFM</span>
                        <span className="version">v2.0 (React)</span>
                    </div>
                    <ul className="nav-links">
                        <li><a href="#about">About</a></li>
                        <li><a href="#features">Features</a></li>
                        <li><a href="#dashboard">Dashboard</a></li>
                    </ul>
                    <button className="btn-primary">Connect Engine</button>
                </div>
            </nav>

            <main>
                <section className="hero">
                    <div className="container">
                        <h1 className="hero-title">Introspective<br /><span>Failure Memory</span></h1>
                        <p className="hero-subtitle">
                            Empowering AI with the self-awareness to recognize its own limitations and proactively mitigate risks.
                        </p>
                        <div className="hero-btns">
                            <a href="#dashboard" className="btn-primary">Live Preview</a>
                            <a href="#about" className="btn-secondary">Learn More</a>
                        </div>
                    </div>
                </section>

                <InfoSection />

                <section id="dashboard">
                    <div className="container">
                        <div className="section-header">
                            <h2>System <span className="gradient-text">Intelligence</span></h2>
                            <p>Real-time failure detection and regime analysis.</p>
                        </div>
                        <Dashboard />
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
                    padding: 2rem 0;
                    z-index: 1000;
                    transition: all 0.4s ease;
                }
                .nav-scrolled {
                    padding: 1rem 0;
                    background: rgba(10, 12, 16, 0.8);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid var(--border);
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
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    border: 1px solid var(--border);
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .nav-links {
                    display: flex;
                    list-style: none;
                    gap: 3rem;
                }
                .nav-links a {
                    color: var(--text-muted);
                    text-decoration: none;
                    font-size: 0.9rem;
                    transition: color 0.3s ease;
                    font-weight: 500;
                }
                .nav-links a:hover {
                    color: var(--accent-primary);
                }

                .btn-primary {
                    background: var(--gradient);
                    border: none;
                    padding: 0.8rem 1.8rem;
                    border-radius: 12px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-decoration: none;
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(0, 242, 255, 0.3);
                }
                .btn-secondary {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border);
                    padding: 0.8rem 1.8rem;
                    border-radius: 12px;
                    color: var(--text-main);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-decoration: none;
                }
                .btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .hero {
                    text-align: center;
                    padding-top: 12rem;
                }
                .hero-title {
                    font-size: 5rem;
                    font-weight: 800;
                    line-height: 1;
                    margin-bottom: 2rem;
                    letter-spacing: -2px;
                }
                .hero-title span {
                    background: linear-gradient(90deg, #fff, #444);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .hero-subtitle {
                    color: var(--text-muted);
                    font-size: 1.4rem;
                    max-width: 700px;
                    margin: 0 auto 3rem;
                }
                .hero-btns {
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                }

                .section-header {
                    text-align: center;
                    margin-bottom: 5rem;
                }
                .section-header h2 {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }

                footer {
                    padding: 4rem 0;
                    border-top: 1px solid var(--border);
                    text-align: center;
                    color: var(--text-muted);
                }

                @media (max-width: 768px) {
                    .hero-title { font-size: 3rem; }
                    .nav-links { display: none; }
                }
            `}</style>
        </div>
    );
};

export default App;
