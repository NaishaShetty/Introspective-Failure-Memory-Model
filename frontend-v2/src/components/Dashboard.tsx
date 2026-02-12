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
    Filler,
    ChartData,
    ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { apiUrl, wsUrl } from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend, Filler);

// ─── Memoized Stream Chart (Feature 1: Proper sizing) ───
const StreamGraph = React.memo(({ data }: { data: number[] }) => {
    const chartData: ChartData<'line'> = {
        labels: Array.from({ length: data.length }, (_, i) => `${i}`),
        datasets: [{
            fill: true,
            label: 'Failure Probability',
            data: data,
            borderColor: '#00f2ff',
            backgroundColor: 'rgba(0, 242, 255, 0.08)',
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
        }]
    };
    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
            x: { display: false },
            y: { min: 0, max: 1, grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#666', font: { size: 10 } } }
        }
    };
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Line data={chartData} options={chartOptions} />
        </div>
    );
});

// ─── Types ───
interface StreamSample {
    t: number;
    regime_id: number;
    regime_name: string;
    failure_probability: number;
    confidence: number;
    prediction: number;
    true_label: number;
    is_failure: boolean;
    memory_saturation: number;
}

interface Toast {
    id: number;
    title: string;
    message: string;
    type: 'warning' | 'danger' | 'success';
    exiting?: boolean;
}

interface DashboardProps {
    onToast: (toast: Omit<Toast, 'id'>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onToast }) => {
    const [streamData, setStreamData] = useState<number[]>(Array(40).fill(0));
    const [regime, setRegime] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [failureCount, setFailureCount] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const prevRegimeRef = useRef('');
    const wsRef = useRef<WebSocket | null>(null);
    const failCountRef = useRef(0);

    useEffect(() => {
        // Try WebSocket first, fallback to HTTP polling
        let ws: WebSocket;
        let pollInterval: ReturnType<typeof setInterval>;

        const connectWs = () => {
            try {
                ws = new WebSocket(wsUrl('/ws/stream'));
                wsRef.current = ws;

                ws.onopen = () => {
                    setIsLoading(false);
                    console.log('[WS] Connected');
                };

                ws.onmessage = (event) => {
                    const data: StreamSample = JSON.parse(event.data);
                    handleStreamData(data);
                };

                ws.onerror = () => {
                    console.log('[WS] Error, falling back to HTTP polling');
                    ws.close();
                    startPolling();
                };

                ws.onclose = () => {
                    console.log('[WS] Closed');
                };
            } catch {
                startPolling();
            }
        };

        const startPolling = () => {
            pollInterval = setInterval(async () => {
                try {
                    const res = await fetch(apiUrl('/api/stream'));
                    if (res.ok) {
                        const data: StreamSample = await res.json();
                        setIsLoading(false);
                        handleStreamData(data);
                    }
                } catch {
                    // Backend not started yet
                }
            }, 200);
        };

        connectWs();

        return () => {
            if (ws) ws.close();
            if (pollInterval) clearInterval(pollInterval);
        };
    }, []);

    const handleStreamData = useCallback((data: StreamSample) => {
        setStreamData(prev => {
            const next = [...prev];
            next.shift();
            next.push(data.failure_probability);
            return next;
        });

        // Regime change detection (Feature 3)
        if (prevRegimeRef.current && prevRegimeRef.current !== data.regime_name) {
            onToast({
                title: '⚠️ Regime Shift Detected',
                message: `${prevRegimeRef.current} → ${data.regime_name}`,
                type: 'warning',
            });
        }
        prevRegimeRef.current = data.regime_name;

        setRegime(data.regime_name);
        setConfidence(data.confidence);
        setSaturation(data.memory_saturation);

        // Track failures
        if (data.is_failure) {
            failCountRef.current += 1;
            setFailureCount(failCountRef.current);
            const time = new Date().toLocaleTimeString();
            setLogs(prev => [`${time} ❌ Failure in ${data.regime_name} (conf: ${data.confidence}%)`, ...prev].slice(0, 5));

            if (data.failure_probability > 0.7) {
                onToast({
                    title: '🚨 Critical Failure',
                    message: `High-risk prediction detected in regime "${data.regime_name}"`,
                    type: 'danger',
                });
            }
        } else {
            const time = new Date().toLocaleTimeString();
            if (Math.random() < 0.02) {
                setLogs(prev => [`${time} ✅ Safe prediction (conf: ${data.confidence}%)`, ...prev].slice(0, 5));
            }
        }
    }, [onToast]);

    // Skeleton Loader (Feature 11)
    if (isLoading) {
        return (
            <div className="dashboard-grid">
                <div className="chart-wrapper glass">
                    <div className="chart-header">
                        <div className="skeleton skeleton-text" style={{ width: '200px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                    </div>
                    <div className="skeleton skeleton-chart"></div>
                </div>
                <div className="stats-wrapper glass">
                    {[1, 2, 3].map(i => (
                        <div className="stat-card" key={i}>
                            <div className="skeleton skeleton-text"></div>
                            <div className="skeleton skeleton-value"></div>
                        </div>
                    ))}
                </div>
                <style>{dashboardStyles}</style>
            </div>
        );
    }

    return (
        <div className="dashboard-grid">
            <div className="chart-wrapper glass">
                <div className="chart-header">
                    <h4>Failure Probability Stream</h4>
                    <div className="live-badge">⚡ WebSocket Live</div>
                </div>
                <div className="canvas-container">
                    <StreamGraph data={streamData} />
                </div>
            </div>

            <div className="stats-wrapper glass">
                <div className="stat-card">
                    <span className="label">Active Regime</span>
                    <h3 className="value highlight">{regime}</h3>
                </div>
                <div className="stat-card">
                    <span className="label">Model Confidence</span>
                    <h3 className="value">{confidence}%</h3>
                </div>
                <div className="stat-card">
                    <span className="label">Failures Detected</span>
                    <h3 className="value" style={{ color: failureCount > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{failureCount}</h3>
                </div>
                <div className="stat-card">
                    <span className="label">Memory Saturation</span>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${saturation}%` }}></div>
                    </div>
                </div>
                <div className="cluster-log">
                    <p className="log-title">Event Log</p>
                    {logs.length === 0 && <div className="log-item">Waiting for events...</div>}
                    {logs.map((log, i) => <div key={i} className="log-item">{log}</div>)}
                </div>
            </div>

            <style>{dashboardStyles}</style>
        </div>
    );
};

const dashboardStyles = `
    .dashboard-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 2rem;
    }
    .chart-wrapper {
        padding: 2rem;
        min-height: 420px;
        display: flex;
        flex-direction: column;
    }
    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    .live-badge {
        background: rgba(0, 242, 255, 0.1);
        color: var(--accent-primary);
        padding: 4px 14px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .live-badge::before {
        content: '';
        width: 6px;
        height: 6px;
        background: var(--accent-primary);
        border-radius: 50%;
        box-shadow: 0 0 10px var(--accent-primary);
        animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
    }
    .canvas-container {
        flex: 1;
        min-height: 0;
        position: relative;
    }
    .stats-wrapper {
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .stat-card {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }
    .stat-card .label {
        font-size: 0.7rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 1.5px;
    }
    .stat-card .value { font-size: 1.5rem; font-weight: 700; }
    .stat-card .value.highlight { color: var(--accent-primary); }
    .cluster-log {
        margin-top: auto;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border);
    }
    .log-title {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-bottom: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .log-item {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin-bottom: 0.4rem;
        font-family: 'Courier New', monospace;
        line-height: 1.4;
    }
    @media (max-width: 968px) {
        .dashboard-grid { grid-template-columns: 1fr; }
        .chart-wrapper { min-height: 300px; }
    }
`;

export default Dashboard;
