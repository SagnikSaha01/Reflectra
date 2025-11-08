import { useState, useEffect } from 'react'
import api from '../utils/api'
import { Calendar, Clock } from 'lucide-react'
import './History.css'

function History() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      console.log('Fetching sessions...')
      const response = await api.get('/sessions?limit=50')
      console.log('Sessions response:', response.data)
      setSessions(response.data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching sessions:', err)
      console.error('Error response:', err.response?.data)
      setError('Failed to load session history: ' + (err.response?.data?.message || err.message))
      setLoading(false)
    }
  }

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return 'Today, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return date.toLocaleDateString() + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getDomain = (url) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  if (loading) {
    return <div className="loading">Loading session history...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '32px' }}>Browsing History</h1>

      {sessions.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            No browsing sessions recorded yet
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="session-list">
            {sessions.map(session => (
              <div key={session.id} className="session-item">
                <div className="session-header">
                  <div className="session-title">
                    {session.title || getDomain(session.url)}
                  </div>
                  {session.category_name && (
                    <span
                      className="session-category"
                      style={{ backgroundColor: session.category_color + '20', color: session.category_color }}
                    >
                      {session.category_name}
                    </span>
                  )}
                </div>

                <div className="session-url">{getDomain(session.url)}</div>

                <div className="session-meta">
                  <div className="meta-item">
                    <Calendar size={14} />
                    <span>{formatDate(session.timestamp)}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={14} />
                    <span>{formatTime(session.duration)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default History
