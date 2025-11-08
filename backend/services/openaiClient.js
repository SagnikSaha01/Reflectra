const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not set. Features relying on OpenAI will be disabled.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = openai;
