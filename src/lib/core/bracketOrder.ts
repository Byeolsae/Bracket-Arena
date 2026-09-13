import type { BracketGroup, BracketStageMatch } from "./models";

const groupOrder: Record<BracketGroup, number> = {
  winners: 0,
  "zero-loss": 0,
  losers: 1,
  "one-loss": 1,
  "two-loss": 2,
  "grand-final": 3,
  stepladder: 4
};

export function compareBracketMatches(left: BracketStageMatch, right: BracketStageMatch) {
  return (
    getBracketGroupOrder(left.bracketGroup) - getBracketGroupOrder(right.bracketGroup) ||
    left.round - right.round ||
    left.matchNumber - right.matchNumber ||
    left.id.localeCompare(right.id)
  );
}

export function sortBracketMatches<T extends BracketStageMatch>(matches: T[]): T[] {
  return [...matches].sort(compareBracketMatches);
}

export function getBracketGroupOrder(group: BracketGroup) {
  return groupOrder[group] ?? 99;
}

export function getBracketPlayOrder(match: Partial<Pick<BracketStageMatch, "bracketGroup" | "round">>) {
  const round = Math.max(1, match.round ?? 1);

  if (match.bracketGroup === "winners") return round * 3 - 2;
  if (match.bracketGroup === "losers") {
    if (round === 1) return 2;
    const winnersCheckpoint = Math.ceil(round / 2);
    return winnersCheckpoint * 3 - 1 + (round % 2 === 1 ? 1 : 0);
  }
  if (match.bracketGroup === "zero-loss") return round * 4 - 3;
  if (match.bracketGroup === "one-loss") return round * 4 - 2;
  if (match.bracketGroup === "two-loss") return round * 4 - 1;
  if (match.bracketGroup === "grand-final") return 999;

  return round;
}

export function getCurrentPlayableMatchIds(matches: Array<Partial<BracketStageMatch> & Pick<BracketStageMatch, "id">>) {
  const playable = matches.filter(
    (match) =>
      match.status === "ready" &&
      Boolean(match.participantA?.teamId && match.participantB?.teamId)
  );

  if (!playable.length) return new Set<string>();

  const currentOrder = Math.min(...playable.map(getBracketPlayOrder));
  return new Set(playable.filter((match) => getBracketPlayOrder(match) === currentOrder).map((match) => match.id));
}
