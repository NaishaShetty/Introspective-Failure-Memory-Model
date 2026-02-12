import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
    history: { risk: number, conf: number }[];
}

const AnticipatoryChart: React.FC<Props> = ({ history }) => {
    const data = {
        labels: history.map((_, i) => i),
        datasets: [
            {
                label: 'Anticipatory Failure Risk',
                data: history.map(h => h.risk),
                borderColor: '#ffa500',
                backgroundColor: 'rgba(255, 165, 0, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            },
            {
                label: 'Inherent Error Prob',
                data: history.map(h => 1 - h.conf / 100),
                borderColor: 'rgba(255,255,255,0.2)',
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0.4,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { display: false },
            y: { min: 0, max: 1, grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#666', font: { size: 9 } } }
        },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        }
    };

    return (
        <div style={{ height: '120px' }}>
            <Line data={data} options={options} />
        </div>
    );
};

export default AnticipatoryChart;
