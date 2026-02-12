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

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ChartTitle,
    Tooltip,
    Legend,
    Filler
);

// Memoized Chart Component for Performance
const StreamGraph = React.memo(({ data }: { data: number[] }) => {
    const chartData: ChartData<'line'> = {
        labels: Array.from({ length: 30 }, (_, i) => i),
        datasets: [{
            fill: true,
            label: 'Failure Probability',
            data: data,
            borderColor: '#00f2ff',
            backgroundColor: 'rgba(0, 242, 255, 0.1)',
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
        }]
    };

    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        },
        scales: {
            x: { display: false },
            y: {
                min: 0,
                max: 1,
                grid: { color: 'rgba(255,255,255,0.02)' },
                ticks: { color: '#666', font: { size: 10 } }
            }
        }
    };

    return <Line data={chartData} options={chartOptions} />;
});

const Dashboard: React.FC = () => {
    const [streamData, setStreamData] = useState<number[]>(Array(30).fill(0.1));
    const [regime, setRegime] = useState('Connecting...');
    const [confidence, setConfidence] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    // Fetch data from FastAPI backend
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:8000/api/stream');
            if (response.ok) {
                const data = await response.json();

                // Update Stream Data
                setStreamData(prev => {
                    const recent = [...prev];
                    recent.shift();
                    recent.push(data.failure_probability);
                    return recent;
                });

                // Update Stats
                setRegime(data.regime_name);
                setConfidence(Number(data.confidence.toFixed(1)));
                setSaturation(data.memory_saturation);

                // Add logs if regime changes or failure prob is high
                if (data.failure_probability > 0.5) {
                    const time = new Date().toLocaleTimeString();
                    setLogs(prev => [`${time} - High Failure Risk: ${(data.failure_probability * 100).toFixed(0)}%`, ...prev].slice(0, 3));
                }
            }
        } catch (error) {
            console.error("API Connection Failed", error);
            setRegime("Offline (Simulating)");
            // Fallback simulation logic could go here
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(fetchData, 200); // 5Hz update rate
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div className="dashboard-grid">
            <div className="chart-wrapper glass">
                <div className="chart-header">
                    <h4>Recursive Memory Stream</h4>
                    <div className="live-badge">Live Handshake</div>
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
                    <span className="label">Inference Confidence</span>
                    <h3 className="value">{confidence}%</h3>
                </div>
                <div className="stat-card">
                    <span className="label">Memory Saturation</span>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${saturation}%` }}></div>
                    </div>
                </div>
                <div className="cluster-log">
                    <p className="log-title">Recent Event Log</p>
                    {logs.map((log, i) => (
                        <div key={i} className="log-item">{log}</div>
                    ))}
                    {logs.length === 0 && <div className="log-item">System nominal...</div>}
                </div>
            </div>

            <style>{`
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 2rem;
                }
                .chart-wrapper {
                    padding: 2rem;
                    height: 450px;
                    display: flex;
                    flex-direction: column;
                }
                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .live-badge {
                    background: rgba(0, 242, 255, 0.1);
                    color: var(--accent-primary);
                    padding: 4px 12px;
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

                .canvas-container { flex: 1; }
                
                .stats-wrapper {
                    padding: 2.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                .stat-card {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .stat-card .label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                }
                .stat-card .value { font-size: 1.8rem; font-weight: 700; }
                .stat-card .value.highlight { color: var(--accent-primary); }

                .cluster-log {
                    margin-top: 1rem;
                    padding-top: 2rem;
                    border-top: 1px solid var(--border);
                }
                .log-title {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-bottom: 1rem;
                }
                .log-item {
                    font-size: 0.85rem;
                    color: #666;
                    margin-bottom: 0.5rem;
                    font-family: monospace;
                }

                @media (max-width: 968px) {
                    .dashboard-grid { grid-template-columns: 1fr; }
                    .chart-wrapper { height: 350px; }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
