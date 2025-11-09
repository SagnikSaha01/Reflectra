import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Calendar, Clock, ArrowDownUp } from 'lucide-react'
import { mergeDuplicateSessions, formatTime as formatTimeUtil, getDomain as getDomainUtil } from '../utils/sessionUtils'
import './History.css'

function History() {
  const [sessions, setSessions] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortField, setSortField] = useState('duration')
  const [sortOrder, setSortOrder] = useState('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchSessions(selectedCategory)
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories')
      setCategories(response.data)
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }

  const fetchSessions = async (categoryId = 'all') => {
    setLoading(true)
    setError(null)
    try {
      let url = '/api/sessions?limit=50'
      if (categoryId !== 'all') {
        url += `&categoryId=${categoryId}`
      }

      const response = await axios.get(url)
      setSessions(response.data)
      setLoading(false)
    } catch (err) {
      setError('Failed to load session history')
      setLoading(false)
    }
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


  const sortedSessions = useMemo(() => {
    // First merge duplicates
    const mergedList = mergeDuplicateSessions(sessions)

    const getValue = (session) => {
      if (sortField === 'recency') {
        return session.timestamp || 0
      }
      return session.duration || 0
    }

    mergedList.sort((a, b) => {
      const valueA = getValue(a)
      const valueB = getValue(b)

      if (sortOrder === 'desc') {
        return valueB - valueA
      }
      return valueA - valueB
    })
    return mergedList
  }, [sessions, sortField, sortOrder])

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))
  }

  const toggleSortField = () => {
    setSortField(prev => (prev === 'duration' ? 'recency' : 'duration'))
  }

  const sortLabel = useMemo(() => {
    if (sortField === 'recency') {
      return sortOrder === 'desc' ? 'Newest → Oldest' : 'Oldest → Newest'
    }
    return sortOrder === 'desc' ? 'Longest → Shortest' : 'Shortest → Longest'
  }, [sortField, sortOrder])

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '32px' }}>Browsing History</h1>

      <div className="history-controls">
        <div className="control-group">
          <label htmlFor="categoryFilter">Filter by category</label>
          <select
            id="categoryFilter"
            className="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group sort-control">
          <label>Sort by</label>
          <div className="sort-button-row">
            <button
              type="button"
              className="sort-toggle-button"
              onClick={toggleSortOrder}
              title="Reverse order"
            >
              <ArrowDownUp
                size={18}
                className={sortOrder === 'desc' ? 'sort-icon-desc' : 'sort-icon-asc'}
              />
            </button>
            <button
              type="button"
              className="sort-type-button"
              onClick={toggleSortField}
            >
              {sortLabel}
            </button>
          </div>
        </div>

        <div className="control-group search-control">
          <label htmlFor="sessionSearch">Search</label>
          <input
            id="sessionSearch"
            type="text"
            className="history-search-input"
            placeholder="Search titles or URLs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading session history...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: 'var(--muted-text)', padding: '40px' }}>
            No browsing sessions recorded yet
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="session-list">
            {sortedSessions.map(session => (
              <div key={session.id} className="session-item">
                <div className="session-header">
                  <div className="session-title">
                    {session.title || getDomainUtil(session.url)}
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

                <div className="session-url">{getDomainUtil(session.url)}</div>

                <div className="session-meta">
                  <div className="meta-item">
                    <Calendar size={14} />
                    <span>{formatDate(session.timestamp)}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={14} />
                    <span>{formatTimeUtil(session.duration)}</span>
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
