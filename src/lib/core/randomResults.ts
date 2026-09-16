export function createRandomHeadToHeadScore(options: { allowDraw?: boolean; maxScore?: number } = {}) {
  const maxScore = options.maxScore ?? 5;
  const scoreA = randomInt(0, maxScore);
  let scoreB = randomInt(0, maxScore);

  if (!options.allowDraw) {
    while (scoreA === scoreB) {
      scoreB = randomInt(0, maxScore);
    }
  }

  return { scoreA, scoreB };
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
