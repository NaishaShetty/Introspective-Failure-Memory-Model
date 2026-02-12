import React from 'react';

interface MatrixProps {
    confusion: { tp: number, tn: number, fp: number, fn: number };
}

const ConfusionMatrix: React.FC<MatrixProps> = ({ confusion }) => {
    const total = confusion.tp + confusion.tn + confusion.fp + confusion.fn || 1;

    const getCellColor = (val: number, isGood: boolean) => {
        const opacity = Math.min(0.8, val / total + 0.1);
        return isGood ? `rgba(59, 255, 145, ${opacity})` : `rgba(255, 59, 92, ${opacity})`;
    };

    return (
        <div className="matrix-grid">
            <div className="matrix-cell label">Pred \ True</div>
            <div className="matrix-cell label">FAIL (1)</div>
            <div className="matrix-cell label">SAFE (0)</div>

            <div className="matrix-cell label">FAIL (1)</div>
            <div className="matrix-cell val" style={{ background: getCellColor(confusion.tp, true) }}>
                <div className="num">{confusion.tp}</div>
                <div className="text">TP</div>
            </div>
            <div className="matrix-cell val" style={{ background: getCellColor(confusion.fp, false) }}>
                <div className="num">{confusion.fp}</div>
                <div className="text">FP</div>
            </div>

            <div className="matrix-cell label">SAFE (0)</div>
            <div className="matrix-cell val" style={{ background: getCellColor(confusion.fn, false) }}>
                <div className="num">{confusion.fn}</div>
                <div className="text">FN</div>
            </div>
            <div className="matrix-cell val" style={{ background: getCellColor(confusion.tn, true) }}>
                <div className="num">{confusion.tn}</div>
                <div className="text">TN</div>
            </div>

            <style>{`
                .matrix-grid {
                    display: grid;
                    grid-template-columns: 0.8fr 1fr 1fr;
                    gap: 8px;
                    border-radius: 12px;
                    overflow: hidden;
                }
                .matrix-cell {
                    padding: 12px;
                    text-align: center;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    border: 1px solid var(--border);
                }
                .matrix-cell.label {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    background: rgba(255,255,255,0.02);
                }
                .matrix-cell.val .num { font-size: 1.2rem; font-weight: 800; color: white; }
                .matrix-cell.val .text { font-size: 0.6rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
            `}</style>
        </div>
    );
};

export default ConfusionMatrix;
