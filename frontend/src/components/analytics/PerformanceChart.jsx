import { Bar } from 'react-chartjs-2'
import { 
  Chart as ChartJS, 
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'

ChartJS.register(
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  annotationPlugin
)

export const PerformanceChart = ({ data }) => {
  const chartData = {
    labels: data.map(d => new Date(d.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Accuracy',
        data: data.map(d => d.accuracy),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'F1 Score',
        data: data.map(d => d.f1_score),
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        type: 'line',
        yAxisID: 'y1',
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      annotation: {
        annotations: {
          threshold: {
            type: 'line',
            yMin: 0.75,
            yMax: 0.75,
            borderColor: 'rgb(255, 159, 64)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              content: 'Target Threshold',
              display: true
            }
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || ''
            return `${label}: ${context.raw.toFixed(2)}`
          }
        }
      }
    },
    scales: {
      y: {
        title: { text: 'Accuracy', display: true },
        min: 0,
        max: 1
      },
      y1: {
        position: 'right',
        title: { text: 'F1 Score', display: true },
        min: 0,
        max: 1,
        grid: { drawOnChartArea: false }
      }
    }
  }

  return (
    <div className="h-[400px] relative">
      <Bar data={chartData} options={options} />
    </div>
  )
}