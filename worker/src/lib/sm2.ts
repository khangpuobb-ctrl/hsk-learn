export function calculateNextReview(
  easeFactor: number,
  interval: number,
  quality: number  // 0-5: 0 = complete blackout, 5 = perfect recall
) {
  // Helpers to get ISO string for reviews
  const getDaysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  if (quality < 3) {
    // Forgot or struggled heavily: reset interval to 1 day, keep ease factor
    return {
      interval: 1,
      easeFactor: easeFactor,
      nextReview: getDaysFromNow(1)
    };
  }

  // Recalculate ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // The user prompt formula: easeFactor + 0.1 - (5 - quality) * 0.08
  const newEF = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * 0.08));

  let newInterval = 1;
  if (interval === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * newEF);
  }

  return {
    interval: newInterval,
    easeFactor: parseFloat(newEF.toFixed(2)),
    nextReview: getDaysFromNow(newInterval)
  };
}
