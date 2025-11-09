/**
 * Merges duplicate sessions that occur close together with the same URL and title
 * @param {Array} sessionsList - Array of session objects
 * @param {number} mergeWindow - Time window in ms to consider sessions as duplicates (default: 5 minutes)
 * @returns {Array} Array of merged sessions
 */
/**
 * Normalizes a URL by removing query parameters and hash fragments
 * This helps merge sessions on the same page with different URL parameters
 */
const normalizeUrl = (url) => {
  try {
    const urlObj = new URL(url)
    // Return just the origin + pathname (no query params or hash)
    return urlObj.origin + urlObj.pathname
  } catch {
    return url
  }
}

export const mergeDuplicateSessions = (sessionsList, mergeWindow = 300000) => {
  if (!sessionsList || sessionsList.length === 0) return []

  console.log(`[Merge] Starting merge of ${sessionsList.length} sessions with ${mergeWindow}ms window`)

  // Sort by timestamp first
  const sorted = [...sessionsList].sort((a, b) => a.timestamp - b.timestamp)
  const merged = []

  let currentGroup = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const lastInGroup = currentGroup[currentGroup.length - 1]

    // Normalize URLs to ignore query parameters and hash fragments
    const currentNormalizedUrl = normalizeUrl(current.url)
    const lastNormalizedUrl = normalizeUrl(lastInGroup.url)

    // Check if this session should be merged with the current group
    const isSameUrl = currentNormalizedUrl === lastNormalizedUrl
    const isSameTitle = current.title === lastInGroup.title

    // Calculate time between session starts (simpler check)
    const timeBetweenStarts = current.timestamp - lastInGroup.timestamp
    const minutesBetween = Math.floor(timeBetweenStarts / 60000)
    const secondsBetween = Math.floor(timeBetweenStarts / 1000)

    // Merge if same URL/title AND within 5 minutes
    const isWithinWindow = timeBetweenStarts <= mergeWindow

    console.log(`[Merge] Comparing:`)
    console.log(`  Current: "${current.title}" @ ${new Date(current.timestamp).toLocaleTimeString()}`)
    console.log(`  Last:    "${lastInGroup.title}" @ ${new Date(lastInGroup.timestamp).toLocaleTimeString()}`)
    console.log(`  URL match: ${isSameUrl} (normalized), Title match: ${isSameTitle}`)
    console.log(`  Time gap: ${secondsBetween}s (within ${mergeWindow/60000}min window: ${isWithinWindow})`)

    if (isSameUrl && isSameTitle && isWithinWindow) {
      console.log(`[Merge] ✓ MERGING "${current.title}" (${minutesBetween}min ${secondsBetween % 60}s apart)`)
      // Add to current group
      currentGroup.push(current)
    } else {
      if (!isSameUrl || !isSameTitle) {
        console.log(`[Merge] ✗ Different URL/title: "${current.title}"`)
        if (!isSameUrl) {
          console.log(`    Normalized URLs: "${currentNormalizedUrl}" vs "${lastNormalizedUrl}"`)
          console.log(`    Original URLs: "${current.url}" vs "${lastInGroup.url}"`)
        }
        if (!isSameTitle) console.log(`    Titles: "${current.title}" vs "${lastInGroup.title}"`)
      } else {
        console.log(`[Merge] ✗ Too far apart: "${current.title}" (${minutesBetween}min ${secondsBetween % 60}s)`)
      }

      // Finalize current group and start new one
      if (currentGroup.length > 1) {
        // Merge the group
        const mergedSession = {
          ...currentGroup[0],
          duration: currentGroup.reduce((sum, s) => sum + s.duration, 0),
          id: currentGroup[0].id, // Keep first ID
          mergedCount: currentGroup.length // Track how many were merged
        }
        merged.push(mergedSession)
      } else {
        merged.push(currentGroup[0])
      }
      currentGroup = [current]
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 1) {
    const mergedSession = {
      ...currentGroup[0],
      duration: currentGroup.reduce((sum, s) => sum + s.duration, 0),
      id: currentGroup[0].id,
      mergedCount: currentGroup.length
    }
    merged.push(mergedSession)
  } else if (currentGroup.length > 0) {
    merged.push(currentGroup[0])
  }

  return merged
}

/**
 * Formats milliseconds to human-readable time
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
export const formatTime = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Gets the domain from a URL
 * @param {string} url - Full URL
 * @returns {string} Domain name
 */
export const getDomain = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
