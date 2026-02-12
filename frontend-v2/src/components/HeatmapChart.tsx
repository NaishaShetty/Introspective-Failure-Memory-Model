import React, { useEffect, useState } from 'react';
import { Scatter } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { apiUrl } from '../api';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

interface EmbeddingPoint {
    x: number;
    y: number;
    cluster: number;
}

const HeatmapChart: React.FC = () => {
    const [points, setPoints] = useState<EmbeddingPoint[]>([]);

    useEffect(() => {
        const fetchPoints = async () => {
            try {
                const res = await fetch(apiUrl('/api/failures/embeddings'));
                if (res.ok) setPoints(await res.json());
            } catch (err) { console.error(err); }
        };
        const interval = setInterval(fetchPoints, 5000);
        fetchPoints();
        return () => clearInterval(interval);
    }, []);

    const clusterColors = ['#00f2ff', '#ff3b5c', '#3bff91'];

    const datasets = [0, 1, 2].map(cid => ({
        label: `Cluster ${cid}`,
        data: points.filter(p => p.cluster === cid).map(p => ({ x: p.x, y: p.y })),
        backgroundColor: clusterColors[cid],
        pointRadius: 4,
        pointHoverRadius: 6,
    }));

    const data = { datasets };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666' } }
        },
        plugins: {
            legend: { position: 'bottom' as const, labels: { color: '#aaa', font: { size: 10 } } },
        }
    };

    return (
        <div style={{ height: '300px' }}>
            <Scatter data={data} options={options} />
        </div>
    );
};

export default HeatmapChart;
