import { useState, useEffect } from 'react'
import axios from 'axios'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { Clock, Activity, TrendingUp } from 'lucide-react'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTodayStats()
  }, [])

  const fetchTodayStats = async () => {
    try {
      const response = await axios.get('/api/stats/today')
      setStats(response.data)
      setLoading(false)
    } catch (err) {
      setError('Failed to load statistics')
      setLoading(false)
    }
  }

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  if (loading) {
    return <div className="loading">Loading your wellness data...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  const pieData = stats.categories.map(cat => ({
    name: cat.name,
    value: cat.time,
    color: cat.color
  }))

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '32px' }}>Today's Digital Wellness</h1>

      <div className="grid grid-3">
        <div className="wellness-score-card">
          <div className="wellness-score-label">Wellness Score</div>
          <div className="wellness-score-value">
            {stats.wellnessScore !== null ? stats.wellnessScore : '--'}
          </div>
          <p style={{ opacity: 0.9, marginTop: '8px' }}>
            {stats.wellnessScore >= 70 ? 'Great balance!' : stats.wellnessScore >= 50 ? 'Room for improvement' : 'Consider rebalancing'}
          </p>
        </div>

        <div className="stat-card">
          <Clock size={32} color="#4CAF50" style={{ margin: '0 auto' }} />
          <div className="stat-value">{formatTime(stats.totalTime)}</div>
          <div className="stat-label">Total Time</div>
        </div>

        <div className="stat-card">
          <Activity size={32} color="#2196F3" style={{ margin: '0 auto' }} />
          <div className="stat-value" style={{ color: '#2196F3' }}>{stats.sessionCount}</div>
          <div className="stat-label">Sessions</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: '24px' }}>
        <div className="card">
          <h2 className="card-title">Time Distribution</h2>
          {stats.categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatTime(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
              No activity yet today
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Categories Breakdown</h2>
          <div className="category-list">
            {stats.categories.map(cat => {
              const percentage = ((cat.time / stats.totalTime) * 100).toFixed(1)
              return (
                <div key={cat.name} className="category-item" style={{ borderLeftColor: cat.color }}>
                  <div className="category-color" style={{ backgroundColor: cat.color }}></div>
                  <div className="category-name">{cat.name}</div>
                  <div className="category-time">{formatTime(cat.time)}</div>
                  <div className="category-percentage">{percentage}%</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
