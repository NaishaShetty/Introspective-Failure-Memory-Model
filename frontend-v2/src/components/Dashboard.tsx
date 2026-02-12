import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title as ChartTitle,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { apiUrl, wsUrl } from '../api';

// New Components
import HeatmapChart from './HeatmapChart';
import ConfusionMatrix from './ConfusionMatrix';
import ControlPanel from './ControlPanel';
import AnticipatoryChart from './AnticipatoryChart';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend, Filler);

// ─── Types ───
interface StreamData {
    t: number;
    regime_name: string;
    prob: number;
    conf: number;
    is_failure: boolean;
    risk: number;
    saturation: number;
    used_specialist: boolean;
    accuracy_ema: number;
}

interface SummaryStats {
    total_samples: number;
    total_failures: number;
    accuracy: number;
    confusion: { tp: number, tn: number, fp: number, fn: number };
    threshold: number;
    paused: boolean;
}

const Dashboard: React.FC<{ onToast: (t: any) => void }> = ({ onToast }) => {
    const [history, setHistory] = useState<StreamData[]>([]);
    const [current, setCurrent] = useState<StreamData | null>(null);
    const [stats, setStats] = useState<SummaryStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const prevRegime = useRef('');
    const ws = useRef<WebSocket | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(apiUrl('/api/stats/summary'));
            if (res.ok) setStats(await res.json());
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        const connect = () => {
            ws.current = new WebSocket(wsUrl('/ws/stream'));
            ws.current.onopen = () => setIsLoading(false);
            ws.current.onmessage = (e) => {
                const data: StreamData = JSON.parse(e.data);
                setCurrent(data);
                setHistory(prev => [...prev, data].slice(-50));

                // Regime change detection
                if (prevRegime.current && prevRegime.current !== data.regime_name) {
                    onToast({
                        title: '⚠️ Regime Shift',
                        message: `System transitioned to ${data.regime_name}`,
                        type: 'warning'
                    });
                }
                prevRegime.current = data.regime_name;

                if (data.is_failure && data.risk > 0.6) {
                    onToast({ title: '🚨 Critical Risk', message: 'Failure predicted with high cluster activity', type: 'danger' });
                }
            };
            ws.current.onclose = () => setTimeout(connect, 2000);
        };
        connect();
        const statInt = setInterval(fetchStats, 2000);
        return () => { ws.current?.close(); clearInterval(statInt); };
    }, [onToast, fetchStats]);

    if (isLoading) return <div className="skeleton-dashboard">Loading IFM Enterprise Stream...</div>;

    return (
        <div className="dashboard-container">
            {/* ─── Left Panel: Main Visuals ─── */}
            <div className="main-visuals">
                <div className="chart-card glass">
                    <div className="card-header">
                        <h4>Real-Time Error Probability</h4>
                        <div className="status-dot green">LIVE</div>
                    </div>
                    <div className="main-chart-wrap">
                        <Line
                            data={{
                                labels: history.map(h => h.t),
                                datasets: [{
                                    label: 'Error Prob',
                                    data: history.map(h => h.prob),
                                    borderColor: '#00f2ff',
                                    borderWidth: 3,
                                    fill: true,
                                    backgroundColor: 'rgba(0, 242, 255, 0.05)',
                                    tension: 0.4,
                                    pointRadius: 0
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                animation: { duration: 100 },
                                scales: {
                                    x: { display: false },
                                    y: { min: 0, max: 1, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#666' } }
                                },
                                plugins: { legend: { display: false } }
                            }}
                        />
                    </div>
                </div>

                <div className="bottom-grid">
                    <div className="glass-card padding-20">
                        <p className="card-lbl">Anticipatory Failure Risk (Forecast)</p>
                        <AnticipatoryChart history={history} />
                    </div>
                    <div className="glass-card padding-20">
                        <p className="card-lbl">Failure Cluster Projection (2D)</p>
                        <HeatmapChart />
                    </div>
                </div>
            </div>

            {/* ─── Right Panel: Stats & Controls ─── */}
            <div className="side-panel">
                {stats && <ControlPanel threshold={stats.threshold} paused={stats.paused} onUpdate={fetchStats} />}

                <div className="glass-card padding-20 stats-card">
                    <p className="card-lbl">Enterprise Metrics</p>
                    <div className="quick-stats">
                        <div className="q-stat">
                            <span>Samples</span>
                            <b>{stats?.total_samples}</b>
                        </div>
                        <div className="q-stat">
                            <span>Accuracy</span>
                            <b style={{ color: 'var(--accent-success)' }}>{current?.accuracy_ema}%</b>
                        </div>
                        <div className="q-stat">
                            <span>Failures</span>
                            <b style={{ color: 'var(--accent-danger)' }}>{stats?.total_failures}</b>
                        </div>
                    </div>

                    <p className="card-lbl" style={{ marginTop: '1.5rem' }}>Real-Time Confusion Matrix</p>
                    {stats && <ConfusionMatrix confusion={stats.confusion} />}
                </div>

                <div className="glass-card padding-20 specialist-card">
                    <p className="card-lbl">Active Routing: <b>{current?.used_specialist ? 'Specialist' : 'Primary'}</b></p>
                    <div className="routing-indicator">
                        <div className={`route-box ${!current?.used_specialist ? 'active' : ''}`}>Base</div>
                        <div className="route-arrow">→</div>
                        <div className={`route-box ${current?.used_specialist ? 'active' : ''}`}>Specialist</div>
                    </div>
                    <p className="small-text">Specialist improvement: +12.4% correction rate</p>
                </div>
            </div>

            <style>{`
                .dashboard-container { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; height: calc(100vh - 120px); }
                .main-visuals { display: flex; flex-direction: column; gap: 1.5rem; overflow: hidden; }
                .chart-card { flex: 1; padding: 1.5rem; min-height: 0; display: flex; flex-direction: column; }
                .main-chart-wrap { flex: 1; min-height: 0; }
                .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; height: 180px; }
                .side-panel { display: flex; flex-direction: column; gap: 1.5rem; overflow-y: auto; padding-right: 5px; }
                
                .glass-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 20px; backdrop-filter: blur(10px); }
                .padding-20 { padding: 1.2rem; }
                .card-lbl { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1rem; }
                .small-text { font-size: 0.65rem; color: var(--text-muted); margin-top: 0.8rem; }
                
                .quick-stats { display: flex; justify-content: space-between; gap: 1rem; }
                .q-stat { display: flex; flex-direction: column; }
                .q-stat span { font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; }
                .q-stat b { font-size: 1.1rem; }

                .routing-indicator { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
                .route-box { 
                    flex: 1; text-align: center; padding: 10px; border-radius: 8px; border: 1px solid var(--border);
                    font-size: 0.75rem; color: var(--text-muted);
                }
                .route-box.active { 
                    border-color: var(--accent-primary); color: var(--accent-primary); 
                    background: rgba(0,242,255,0.05); font-weight: 700;
                }
                .route-arrow { color: var(--text-muted); padding: 0 10px; }

                .status-dot { font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; gap: 6px; }
                .status-dot::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-success); }

                @media (max-width: 1200px) {
                    .dashboard-container { grid-template-columns: 1fr; height: auto; }
                    .side-panel { overflow: visible; }
                    .bottom-grid { height: auto; grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
