const { Pinecone } = require('@pinecone-database/pinecone');
const openai = require('./openaiClient');

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const namespace = process.env.PINECONE_NAMESPACE || 'sessions';

const pineconeApiKey = process.env.PINECONE_API_KEY;
const pineconeIndexName = process.env.PINECONE_INDEX_NAME;
const pineconeIndexHost = process.env.PINECONE_INDEX_HOST;

let pineconeIndex = null;

if (pineconeApiKey && pineconeIndexName) {
  try {
    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    pineconeIndex = pinecone.index(
      pineconeIndexName,
      pineconeIndexHost || undefined
    );
    console.log('Connected to Pinecone index:', pineconeIndexName);
  } catch (error) {
    console.error('Failed to initialize Pinecone client:', error.message);
  }
} else {
  console.warn('Pinecone not configured. Set PINECONE_API_KEY and PINECONE_INDEX_NAME to enable vector search.');
}

async function embedText(text) {
  if (!openai?.embeddings) {
    console.warn('OpenAI client not configured. Skipping embedding creation.');
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error.message);
    return null;
  }
}

function buildSessionSummary(session) {
  const durationMinutes = Math.round((session.duration || 0) / 60000);
  const lines = [
    `Browsing session`,
    session.title ? `Title: ${session.title}` : null,
    session.url ? `URL: ${session.url}` : null,
    `DurationMinutes: ${durationMinutes}`,
    session.category ? `Category: ${session.category}` : null,
    session.notes ? `Notes: ${session.notes}` : null,
    session.timestamp ? `Timestamp: ${new Date(session.timestamp).toISOString()}` : null
  ].filter(Boolean);

  return lines.join('\n');
}

async function upsertSessionEmbedding(session) {
  if (!pineconeIndex) {
    return false;
  }

  const text = buildSessionSummary(session);
  const embedding = await embedText(text);

  if (!embedding) {
    return false;
  }

  try {
    await pineconeIndex.namespace(namespace).upsert([
      {
        id: session.id?.toString() || `${session.url}-${session.timestamp}`,
        values: embedding,
        metadata: {
          title: session.title || 'Untitled session',
          url: session.url,
          timestamp: session.timestamp || Date.now(),
          duration: session.duration || 0,
          category: session.category || 'Uncategorized',
          source: session.source || 'browser_session'
        }
      }
    ]);

    return true;
  } catch (error) {
    console.error('Failed to upsert vector to Pinecone:', error.message);
    return false;
  }
}

async function querySimilarSessions(query, { topK = 8, startTime } = {}) {
  if (!pineconeIndex) {
    return [];
  }

  const queryEmbedding = await embedText(query);

  if (!queryEmbedding) {
    return [];
  }

  const filter = {};
  if (startTime) {
    filter.timestamp = { $gte: startTime };
  }

  try {
    const response = await pineconeIndex
      .namespace(namespace)
      .query({
        topK,
        vector: queryEmbedding,
        includeMetadata: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });

    return (response.matches || []).map(match => ({
      id: match.id,
      score: match.score,
      title: match.metadata?.title,
      url: match.metadata?.url,
      timestamp: match.metadata?.timestamp,
      duration: match.metadata?.duration,
      category: match.metadata?.category
    }));
  } catch (error) {
    console.error('Failed to query Pinecone:', error.message);
    return [];
  }
}

module.exports = {
  upsertSessionEmbedding,
  querySimilarSessions,
  isConfigured: () => Boolean(pineconeIndex)
};
