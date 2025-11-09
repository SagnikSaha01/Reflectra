import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { Clock, Activity, TrendingUp, Lightbulb, Sparkles } from 'lucide-react'
import { mergeDuplicateSessions } from '../utils/sessionUtils'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [insights, setInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTodayData()
  }, [])

  const fetchTodayData = async () => {
    try {
      // Fetch both stats and raw sessions
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayTimestamp = todayStart.getTime()

      const [statsResponse, sessionsResponse] = await Promise.all([
        axios.get('/api/stats/today'),
        axios.get(`/api/sessions?startDate=${todayTimestamp}&limit=1000`)
      ])

      setStats(statsResponse.data)
      setSessions(sessionsResponse.data)
      setLoading(false)

      // Fetch insights separately (don't block main UI)
      fetchInsights()
    } catch (err) {
      setError('Failed to load statistics')
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    setLoadingInsights(true)
    try {
      const response = await axios.get('/api/stats/insights')
      setInsights(response.data)
    } catch (err) {
      console.error('Failed to load insights:', err)
      setInsights({
        insights: "Unable to generate insights at this time.",
        suggestions: []
      })
    } finally {
      setLoadingInsights(false)
    }
  }

  // Calculate merged session count
  const mergedSessionCount = useMemo(() => {
    if (!sessions || sessions.length === 0) return 0
    const merged = mergeDuplicateSessions(sessions)
    return merged.length
  }, [sessions])

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
          <Clock size={32} color="var(--accent-color)" style={{ margin: '0 auto' }} />
          <div className="stat-value">{formatTime(stats.totalTime)}</div>
          <div className="stat-label">Total Time</div>
        </div>

        <div className="stat-card">
          <Activity size={32} color="var(--accent-secondary)" style={{ margin: '0 auto' }} />
          <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>{mergedSessionCount}</div>
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
            <p style={{ textAlign: 'center', color: 'var(--muted-text)', padding: '40px' }}>
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

      {/* AI Insights Section */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Sparkles size={24} color="#FFD700" />
          <h2 className="card-title" style={{ margin: 0 }}>Daily Insights</h2>
        </div>

        {loadingInsights ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted-text)' }}>
            <div style={{ marginBottom: '12px' }}>Analyzing your activity...</div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>Generating personalized insights with AI</div>
          </div>
        ) : insights ? (
          <div>
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(255, 215, 0, 0.05)',
              borderRadius: '12px',
              borderLeft: '4px solid #FFD700',
              marginBottom: '20px'
            }}>
              <p style={{
                fontSize: '16px',
                lineHeight: '1.6',
                margin: 0,
                color: 'var(--text-color)'
              }}>
                {insights.insights}
              </p>
            </div>

            {insights.suggestions && insights.suggestions.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--text-color)'
                }}>
                  <Lightbulb size={18} color="#4CAF50" />
                  <span>Suggestions for You</span>
                </div>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {insights.suggestions.map((suggestion, index) => (
                    <li key={index} style={{
                      padding: '12px 16px',
                      backgroundColor: 'rgba(76, 175, 80, 0.05)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #4CAF50',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: 'var(--text-color)'
                    }}>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted-text)' }}>
            <Lightbulb size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>Start browsing to get personalized insights!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
