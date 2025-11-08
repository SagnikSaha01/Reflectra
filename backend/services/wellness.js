const supabase = require('../db/database');

/**
 * Calculate Digital Wellness Score (0-100)
 * Based on balance between different activity types
 */
function calculateDailyScore(categoryData) {
  if (!categoryData || categoryData.length === 0) {
    return null;
  }

  const weights = {
    productive: parseFloat(process.env.FOCUS_WEIGHT || 0.3),
    growth: parseFloat(process.env.LEARNING_WEIGHT || 0.25),
    rest: parseFloat(process.env.REST_WEIGHT || 0.25),
    social: parseFloat(process.env.SOCIAL_WEIGHT || 0.2)
  };

  // Aggregate time by wellness type
  const wellnessTime = {
    productive: 0,
    growth: 0,
    rest: 0,
    social: 0,
    drain: 0,
    unknown: 0
  };

  let totalTime = 0;

  categoryData.forEach(cat => {
    const time = cat.time || 0;
    totalTime += time;

    // Map categories to wellness types
    const wellnessType = getWellnessType(cat.name);
    if (wellnessTime.hasOwnProperty(wellnessType)) {
      wellnessTime[wellnessType] += time;
    }
  });

  if (totalTime === 0) return 0;

  // Calculate ideal time distribution (in percentage)
  const ideal = {
    productive: 0.35,  // 35% focused work
    growth: 0.25,      // 25% learning
    rest: 0.25,        // 25% relaxation
    social: 0.15       // 15% social
  };

  // Calculate actual distribution
  const actual = {
    productive: wellnessTime.productive / totalTime,
    growth: wellnessTime.growth / totalTime,
    rest: wellnessTime.rest / totalTime,
    social: wellnessTime.social / totalTime
  };

  // Penalty for "drain" activities (mindless scrolling)
  const drainPenalty = (wellnessTime.drain / totalTime) * 30;

  // Calculate score based on how close to ideal distribution
  let balanceScore = 100;

  Object.keys(ideal).forEach(type => {
    const diff = Math.abs(ideal[type] - actual[type]);
    balanceScore -= diff * 100; // Penalize deviation from ideal
  });

  // Apply drain penalty
  balanceScore -= drainPenalty;

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, Math.round(balanceScore)));
}

function getWellnessType(categoryName) {
  const mapping = {
    'Focused Work': 'productive',
    'Learning': 'growth',
    'Research': 'growth',
    'Social Connection': 'social',
    'Relaxation': 'rest',
    'Mindless Scroll': 'drain',
    'Communication': 'productive',
    'Uncategorized': 'unknown'
  };

  return mapping[categoryName] || 'unknown';
}

async function saveDailyWellnessScore(date, score, categoryData) {
  const wellnessTime = {
    focus_time: 0,
    learning_time: 0,
    rest_time: 0,
    social_time: 0,
    mindless_time: 0
  };

  categoryData.forEach(cat => {
    const type = getWellnessType(cat.name);
    const time = cat.time || 0;

    switch (type) {
      case 'productive':
        wellnessTime.focus_time += time;
        break;
      case 'growth':
        wellnessTime.learning_time += time;
        break;
      case 'rest':
        wellnessTime.rest_time += time;
        break;
      case 'social':
        wellnessTime.social_time += time;
        break;
      case 'drain':
        wellnessTime.mindless_time += time;
        break;
    }
  });

  const { error } = await supabase
    .from('wellness_scores')
    .upsert({
      date,
      score,
      focus_time: wellnessTime.focus_time,
      learning_time: wellnessTime.learning_time,
      rest_time: wellnessTime.rest_time,
      social_time: wellnessTime.social_time,
      mindless_time: wellnessTime.mindless_time
    }, {
      onConflict: 'date'
    });

  if (error) {
    console.error('Error saving wellness score:', error.message);
  }
}

function getFocusRestRatio(categoryData) {
  let focusTime = 0;
  let restTime = 0;

  categoryData.forEach(cat => {
    const type = getWellnessType(cat.name);
    if (type === 'productive' || type === 'growth') {
      focusTime += cat.time || 0;
    } else if (type === 'rest') {
      restTime += cat.time || 0;
    }
  });

  if (restTime === 0) return focusTime > 0 ? 'Infinity' : '0:0';

  const ratio = focusTime / restTime;
  return ratio.toFixed(2);
}

module.exports = {
  calculateDailyScore,
  saveDailyWellnessScore,
  getFocusRestRatio,
  getWellnessType
};
