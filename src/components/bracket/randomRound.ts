import type { BracketStageMatch } from "@/lib/core/models";
import { createRandomHeadToHeadScore } from "@/lib/core/randomResults";

type SaveBracketResult = (
  matchId: string,
  result: { scoreA?: number; scoreB?: number; winnerId: string }
) => void;

export function autoFillCurrentBracketRound(
  matches: BracketStageMatch[],
  onSaveResult: SaveBracketResult,
  activeMatchIds?: Set<string>
) {
  const readyMatches = matches.filter((match) => {
    const hasTeams = Boolean(match.participantA?.teamId && match.participantB?.teamId);
    const isActive = !activeMatchIds || activeMatchIds.has(match.id);
    return hasTeams && isActive && match.status === "ready";
  });

  if (!readyMatches.length) return;

  const firstRound = Math.min(...readyMatches.map((match) => match.round ?? 1));

  readyMatches
    .filter((match) => (match.round ?? 1) === firstRound)
    .forEach((match) => {
      const teamAId = match.participantA?.teamId;
      const teamBId = match.participantB?.teamId;
      if (!teamAId || !teamBId) return;

      const { scoreA, scoreB } = createRandomHeadToHeadScore();
      onSaveResult(match.id, {
        scoreA,
        scoreB,
        winnerId: scoreA > scoreB ? teamAId : teamBId
      });
    });
}
