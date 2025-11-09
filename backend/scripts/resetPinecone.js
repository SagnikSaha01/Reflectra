const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pinecone } = require('@pinecone-database/pinecone');
const { createClient } = require('@supabase/supabase-js');
const vectorStore = require('../services/vectorStore');

const {
  SUPABASE_URL,
  SUPABASE_KEY,
  PINECONE_API_KEY,
  PINECONE_INDEX_NAME,
  PINECONE_INDEX_HOST,
  PINECONE_NAMESPACE = 'sessions'
} = process.env;

async function clearPineconeNamespace() {
  if (!PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
    throw new Error('Pinecone credentials are missing. Check your .env file.');
  }

  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.index(PINECONE_INDEX_NAME, PINECONE_INDEX_HOST || undefined);

  console.log(`🧹 Clearing Pinecone namespace "${PINECONE_NAMESPACE}"...`);
  await index.namespace(PINECONE_NAMESPACE).deleteAll();
  console.log('✅ Namespace cleared.');
}

async function fetchSessions() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase credentials are missing. Check your .env file.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      url,
      title,
      duration,
      timestamp,
      categories:category_id (
        name
      )
    `)
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch sessions from Supabase: ${error.message}`);
  }

  return data.map(session => ({
    id: session.id,
    url: session.url,
    title: session.title,
    duration: session.duration,
    timestamp: session.timestamp,
    category: session.categories?.name || 'Uncategorized'
  }));
}

async function repopulatePinecone() {
  if (!vectorStore.isConfigured()) {
    throw new Error('Vector store is not configured. Check Pinecone/OpenAI env vars.');
  }

  const sessions = await fetchSessions();
  console.log(`📥 Loaded ${sessions.length} sessions from Supabase.`);

  for (const session of sessions) {
    const success = await vectorStore.upsertSessionEmbedding(session);
    if (success) {
      console.log(`🔁 Synced session ${session.id} (${session.title || session.url})`);
    } else {
      console.warn(`⚠️  Failed to sync session ${session.id}`);
    }
  }
}

async function main() {
  try {
    await clearPineconeNamespace();
    await repopulatePinecone();
    console.log('🎉 Pinecone reset complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Pinecone reset failed:', error.message);
    process.exit(1);
  }
}

main();
