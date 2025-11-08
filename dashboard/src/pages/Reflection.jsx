import { useState } from 'react'
import axios from 'axios'
import { Send, Sparkles } from 'lucide-react'
import './Reflection.css'

function Reflection() {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const suggestedQueries = [
    "What did I spend most time on today?",
    "Summarize my browsing patterns this week",
    "What have I been learning lately?",
    "How balanced was my digital activity today?",
    "What websites consumed most of my time?"
  ]

  const handleAsk = async (questionText) => {
    const question = questionText || query
    if (!question.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await axios.post('/api/reflection/ask', {
        query: question,
        timeRange: 'today'
      })

      setResponse(result.data)
      setQuery('')
    } catch (err) {
      setError('Failed to generate reflection. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleAsk()
  }

  return (
    <div className="reflection-page">
      <div className="reflection-header">
        <Sparkles size={32} color="#667eea" />
        <h1>Reflect on Your Digital Life</h1>
        <p>Ask questions about your browsing behavior and get personalized insights</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="reflection-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Ask me anything about your browsing activity..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="reflection-input"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !query.trim()}
            >
              <Send size={20} />
              {loading ? 'Thinking...' : 'Ask'}
            </button>
          </div>
        </form>

        <div className="suggested-queries">
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
            Suggested questions:
          </p>
          <div className="query-chips">
            {suggestedQueries.map((q, index) => (
              <button
                key={index}
                className="query-chip"
                onClick={() => handleAsk(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {response && (
        <div className="card response-card">
          <div className="response-header">
            <Sparkles size={20} color="#667eea" />
            <h3>Reflection</h3>
          </div>
          <div className="response-content">
            {response.answer}
          </div>
          <div className="response-meta">
            Generated {new Date(response.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  )
}

export default Reflection
