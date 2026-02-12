import React, { useState } from 'react';
import { apiUrl } from '../api';

interface ControlPanelProps {
    threshold: number;
    paused: boolean;
    onUpdate: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ threshold, paused, onUpdate }) => {
    const [localThreshold, setLocalThreshold] = useState(threshold);

    const handleAction = async (data: any) => {
        try {
            await fetch(apiUrl('/api/control'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            onUpdate();
        } catch (err) { console.error(err); }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            await fetch(apiUrl('/api/upload'), { method: 'POST', body: formData });
            alert('Dataset uploaded successfully!');
        } catch (err) { console.error(err); }
    };

    return (
        <div className="control-panel glass">
            <div className="control-section">
                <p className="section-title">Simulation Controls</p>
                <div className="btn-group">
                    <button className={`ctrl-btn ${paused ? 'active' : ''}`} onClick={() => handleAction({ paused: !paused })}>
                        {paused ? '▶ Play' : '⏸ Pause'}
                    </button>
                    <button className="ctrl-btn" onClick={() => handleAction({ step: true })}>
                        ⏭ Step
                    </button>
                    <a className="ctrl-btn export-btn" href={apiUrl('/api/export')}>
                        📥 Export CSV
                    </a>
                </div>
            </div>

            <div className="control-section">
                <p className="section-title">Conf. Threshold: <b>{(localThreshold * 100).toFixed(0)}%</b></p>
                <input
                    type="range" min="0.1" max="0.9" step="0.05"
                    value={localThreshold}
                    onChange={(e) => setLocalThreshold(parseFloat(e.target.value))}
                    onMouseUp={() => handleAction({ threshold: localThreshold })}
                    className="threshold-slider"
                />
            </div>

            <div className="control-section">
                <p className="section-title">Inject Regime Shift</p>
                <div className="regime-grid">
                    {[0, 1, 2, 3, 4].map(id => (
                        <button key={id} className="regime-btn" onClick={() => handleAction({ regime_override: id })}>
                            R{id}
                        </button>
                    ))}
                    <button className="regime-btn reset" onClick={() => handleAction({ regime_override: null })}>
                        Auto
                    </button>
                </div>
            </div>

            <div className="control-section">
                <p className="section-title">Load Custom Data</p>
                <label className="upload-label">
                    📎 Select CSV
                    <input type="file" accept=".csv" onChange={handleUpload} style={{ display: 'none' }} />
                </label>
            </div>

            <style>{`
                .control-panel { padding: 1.5rem; border-radius: 20px; display: flex; flex-direction: column; gap: 1.5rem; }
                .section-title { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.8rem; }
                .btn-group { display: flex; gap: 0.5rem; }
                .ctrl-btn {
                    flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--border);
                    color: white; padding: 0.6rem; border-radius: 10px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
                    text-decoration: none; text-align: center;
                }
                .ctrl-btn:hover { background: rgba(255,255,255,0.1); }
                .ctrl-btn.active { border-color: var(--accent-primary); box-shadow: 0 0 10px rgba(0,242,255,0.2); }
                .export-btn { background: rgba(0,242,255,0.1); color: var(--accent-primary); border-color: rgba(0,242,255,0.2); }
                
                .threshold-slider { width: 100%; accent-color: var(--accent-primary); cursor: pointer; }
                
                .regime-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
                .regime-btn {
                    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
                    color: var(--text-muted); padding: 0.4rem; border-radius: 6px; font-size: 0.7rem; cursor: pointer;
                }
                .regime-btn:hover { border-color: var(--accent-primary); color: white; }
                .regime-btn.reset { grid-column: span 3; color: var(--accent-primary); }
                
                .upload-label {
                    display: block; width: 100%; text-align: center; padding: 0.6rem;
                    border: 1px dashed var(--border); border-radius: 10px; font-size: 0.75rem; 
                    color: var(--text-muted); cursor: pointer; transition: all 0.2s;
                }
                .upload-label:hover { border-color: var(--accent-primary); color: white; background: rgba(0,242,255,0.02); }
            `}</style>
        </div>
    );
};

export default ControlPanel;
