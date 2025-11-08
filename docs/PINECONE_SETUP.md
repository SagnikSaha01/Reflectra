# Pinecone Vector Database Setup

Reflectra now uses Pinecone as a vector database so the reflection service can run Retrieval-Augmented Generation (RAG) over your browsing history. Follow the steps below to provision Pinecone and wire it into the backend.

---

## 1. Create a Pinecone Account

1. Go to [https://app.pinecone.io](https://app.pinecone.io) and sign up or log in.
2. Create an API key (`API Keys` tab → `Create API Key`). Copy the value—you will need it shortly.
3. Confirm you are on the **Serverless** plan (default for new accounts) so you can create indexes in the free tier.

---

## 2. Create a Serverless Index

1. In the Pinecone console, click **Indexes → Create Index**.
2. Use the following settings:
   - **Name**: `reflectra-sessions` (or any lowercase name you prefer).
   - **Metric**: `cosine`.
   - **Dimension**: `1536` (matches OpenAI `text-embedding-3-small` outputs).
   - **Cloud/Region**: pick a region close to your backend (e.g., `aws us-east-1`).
3. Wait for the index status to become `Ready`.
4. Open the index details panel and copy the **Index Host URL** (looks like `https://reflectra-sessions-xxxx.svc.aped-aws.pinecone.io`).

---

## 3. Configure Environment Variables

Add the following variables to `backend/.env` (values shown here are placeholders):

```env
PINECONE_API_KEY=pcn-xxxxxxxxxxxxxxxxxxxxxxxx
PINECONE_INDEX_NAME=reflectra-sessions
PINECONE_INDEX_HOST=https://reflectra-sessions-xxxx.svc.aped-aws.pinecone.io
PINECONE_NAMESPACE=sessions        # optional, defaults to "sessions"
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

> **Note:** If you change `OPENAI_EMBEDDING_MODEL`, make sure the Pinecone index dimension matches the embedding size of the new model.

Restart the backend (`npm run dev`) after saving the environment file so the Pinecone client is initialized with the new credentials.

---

## 4. Verify the Integration

1. Load the Chrome extension and browse a site long enough to create a session.
2. Check backend logs—you should see `Connected to Pinecone index: reflectra-sessions` once at startup and no errors when sessions are ingested.
3. Optional: trigger a manual session insert to confirm everything works:

   ```bash
   curl -X POST http://localhost:3000/api/sessions \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
       "title": "Interview prep techniques",
       "duration": 420000,
       "timestamp": 1735689600000
     }'
   ```

   Use the Pinecone console's **Query** tab to confirm the record appears in your namespace.

---

## 5. How Reflection Uses Pinecone

- Each new browsing session now generates an OpenAI embedding and is stored in Pinecone with metadata (title, URL, duration, timestamp).
- When a user asks a reflection question, the backend:
  1. Embeds the query text.
  2. Searches Pinecone for the top matches within the same time range (today/week/month).
  3. Adds these relevant sessions to the LLM prompt so the answer can reference specific activities (e.g., a YouTube interview-prep video).

No extra work is required in the dashboard or extension—the RAG layer is entirely inside the backend.

---

## 6. (Optional) Backfill Existing Sessions

Only new sessions automatically sync to Pinecone. If you want historical data in the vector index:

1. Export existing sessions from Supabase (`sessions` table).
2. Write a small Node script that loops over those rows and calls `vectorStore.upsertSessionEmbedding(session)`.
3. Run the script once—after that point the background ingestion will keep Pinecone updated.

---

You are now ready to use Pinecone-powered reflections! When users ask questions such as “Did I do any interview prep today?”, the RAG pipeline will surface the matching sessions so the AI can respond with concrete evidence.
