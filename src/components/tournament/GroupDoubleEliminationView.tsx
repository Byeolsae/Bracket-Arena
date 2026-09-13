"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BracketStageMatch,
  GroupDoubleEliminationStage,
  GroupTripleEliminationStage,
  Team
} from "@/lib/core/models";
import {
  applyGroupDoubleEliminationResult,
  getGroupDoubleEliminationAdvancingTeams
} from "@/lib/core/groupDoubleElimination";
import {
  applyGroupTripleEliminationResult,
  getGroupTripleEliminationAdvancingTeams
} from "@/lib/core/groupElimination";
import { getCurrentPlayableMatchIds } from "@/lib/core/bracketOrder";
import { createRandomHeadToHeadScore } from "@/lib/core/randomResults";
import { BracketAxisLabel } from "@/components/bracket/BracketAxisLabel";
import { BracketLane } from "@/components/bracket/BracketLane";
import { BracketZoomControls } from "@/components/bracket/BracketZoomControls";
import { RandomRoundButton } from "@/components/bracket/RandomRoundButton";
import { MatchCard } from "@/components/bracket/MatchCard";
import { TeamLogo } from "@/components/teams/TeamLogo";

type GroupEliminationStage = GroupDoubleEliminationStage | GroupTripleEliminationStage;
type SectionTone = "red" | "gold" | "cyan";

type GroupDoubleEliminationViewProps = {
  stage: GroupEliminationStage;
  teams: Team[];
  onChange?: (stage: GroupEliminationStage) => void;
};

type BracketSection = {
  title: string;
  subtitle: string;
  tone: SectionTone;
  matches: BracketStageMatch[];
};

export function GroupDoubleEliminationView({ stage, teams, onChange }: GroupDoubleEliminationViewProps) {
  const [localStage, setLocalStage] = useState(stage);
  const [zoom, setZoom] = useState(1);
  const localStageRef = useRef(stage);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const advancingTeams = getAdvancingTeams(localStage, teams);
  const meta = getStageMeta(localStage.type);

  useEffect(() => {
    setLocalStage(stage);
    localStageRef.current = stage;
  }, [stage]);

  const saveResult = (
    groupId: string,
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => {
    const nextStage = applyResult(localStageRef.current, groupId, matchId, result);
    localStageRef.current = nextStage;
    setLocalStage(nextStage);
    onChange?.(nextStage);
  };

  const autoFillCurrentRound = () => {
    localStageRef.current.brackets.forEach((entry) => {
      const activeMatchIds = getCurrentPlayableMatchIds(entry.bracket.matches);

      entry.bracket.matches.forEach((match) => {
        const teamAId = match.participantA?.teamId;
        const teamBId = match.participantB?.teamId;
        if (match.status !== "ready" || !teamAId || !teamBId || !activeMatchIds.has(match.id)) return;

        const { scoreA, scoreB } = createRandomHeadToHeadScore();
        saveResult(entry.groupId, match.id, {
          scoreA,
          scoreB,
          winnerId: scoreA > scoreB ? teamAId : teamBId
        });
      });
    });
  };

  return (
    <section className="space-y-6">
      {localStage.warnings.length ? (
        <div className="rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-ink">
          {localStage.warnings.join(" ")}
        </div>
      ) : null}

      <div className="arena-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">조별 엘리미네이션</p>
            <h2 className="text-2xl font-black uppercase tracking-wide text-ink">{meta.title}</h2>
            <p className="text-sm text-muted">{meta.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm font-black text-cyan">
              조별 상위 {localStage.advancePerGroup}팀 진출
            </div>
            <BracketZoomControls
              zoom={zoom}
              onChange={setZoom}
              actions={<RandomRoundButton onClick={autoFillCurrentRound} />}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {advancingTeams.map((team, index) => (
            <div key={`${team.id}-${index}`} className="flex items-center gap-2 rounded-md border border-lime/40 bg-lime/10 px-2 py-1">
              <span className="text-[10px] font-black text-lime">#{index + 1}</span>
              <TeamLogo team={team} size="sm" />
              <span className="text-xs font-black uppercase text-ink">{team.shortName || team.name}</span>
            </div>
          ))}
          {!advancingTeams.length ? <span className="text-sm text-muted">아직 확정된 진출팀이 없습니다.</span> : null}
        </div>
      </div>

      {localStage.brackets.map((entry) => {
        const group = localStage.groups.find((item) => item.id === entry.groupId);
        const sections = getBracketSections(localStage, entry);

        return (
          <section key={entry.groupId} className="bracket-board">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/80 px-4 py-3">
              <div>
                <p className="section-kicker">{group?.name ?? entry.groupId}</p>
                <h3 className="text-xl font-black uppercase tracking-wide text-ink">{meta.groupTitle}</h3>
              </div>
              <GroupTeams teamIds={group?.teamIds ?? []} teamsById={teamsById} />
            </div>
            <div className="bracket-board-inner max-h-[78vh] overflow-auto">
              <div
                className="min-w-max origin-top-left space-y-8 pb-8 pr-16 transition-transform duration-150"
                style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
              >
                {localStage.type === "group_double_elimination" ? (
                  <GroupDoubleHourglassBracket
                    groupId={entry.groupId}
                    sections={sections}
                    teamsById={teamsById}
                    onSaveResult={saveResult}
                  />
                ) : (
                  sections.map((section) => (
                    <GroupBracketSection
                      key={section.title}
                      title={section.title}
                      subtitle={section.subtitle}
                      tone={section.tone}
                      groupId={entry.groupId}
                      matches={section.matches}
                      teamsById={teamsById}
                      onSaveResult={saveResult}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        );
      })}
    </section>
  );
}

function GroupTeams({ teamIds, teamsById }: { teamIds: string[]; teamsById: Map<string, Team> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {teamIds.map((teamId, index) => {
        const team = teamsById.get(teamId);
        return (
          <div key={teamId} className="flex items-center gap-2 rounded-md border border-line bg-field px-2 py-1">
            <span className="text-[10px] font-black text-cyan">#{index + 1}</span>
            <TeamLogo team={team} size="sm" />
            <span className="text-xs font-black uppercase text-ink">{team?.shortName || team?.name || "미정"}</span>
          </div>
        );
      })}
    </div>
  );
}

function GroupDoubleHourglassBracket({
  groupId,
  sections,
  teamsById,
  onSaveResult
}: {
  groupId: string;
  sections: BracketSection[];
  teamsById: Map<string, Team>;
  onSaveResult: (
    groupId: string,
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
}) {
  const upperMatches = sections.find((section) => section.title === "Upper Bracket")?.matches ?? [];
  const lowerMatches = sections.find((section) => section.title === "Lower Bracket")?.matches ?? [];
  const deciderMatches = sections.find((section) => section.title === "Decider")?.matches ?? [];
  const allMatches = [...upperMatches, ...lowerMatches, ...deciderMatches];
  const activeMatchIds = getCurrentPlayableMatchIds(allMatches);
  const openingMatches = upperMatches.filter((match) => match.round <= 1);
  const winnersMatches = upperMatches.filter((match) => match.round > 1);

  if (!deciderMatches.length) {
    return (
      <div className="space-y-4">
        <div className="space-y-8">
          {sections.map((section) => (
            <GroupBracketSection
              key={section.title}
              title={section.title}
              subtitle={section.subtitle}
              tone={section.tone}
              groupId={groupId}
              matches={section.matches}
              teamsById={teamsById}
              onSaveResult={onSaveResult}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-7 border-l-4 border-cyan/60 bg-arena/25 py-5 pr-5">
      <BracketAxisLabel label="Group Double" tone="cyan" />
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="bracket-ribbon bg-cyan text-arena">Group Double</div>
        </div>

        <div className="overflow-x-auto pb-6">
          <div className="relative min-h-[560px] min-w-[1240px] py-8">
            <HourglassConnectorLines />
            <div className="relative z-10 grid grid-cols-[280px_280px_280px] gap-x-32">
              <HourglassColumn
                title="Opening"
                tone="cyan"
                matches={openingMatches}
                teamsById={teamsById}
                activeMatchIds={activeMatchIds}
                className="justify-center gap-6"
                onSaveResult={(matchId, result) => onSaveResult(groupId, matchId, result)}
              />

              <div className="flex min-h-[500px] flex-col justify-between">
                <HourglassColumn
                  title="Winners"
                  tone="cyan"
                  matches={winnersMatches}
                  teamsById={teamsById}
                  activeMatchIds={activeMatchIds}
                  className="gap-5"
                  onSaveResult={(matchId, result) => onSaveResult(groupId, matchId, result)}
                />
                <HourglassColumn
                  title="Elimination"
                  tone="red"
                  matches={lowerMatches}
                  teamsById={teamsById}
                  activeMatchIds={activeMatchIds}
                  className="gap-5"
                  onSaveResult={(matchId, result) => onSaveResult(groupId, matchId, result)}
                />
              </div>

              <HourglassColumn
                title="Decider"
                tone="gold"
                matches={deciderMatches}
                teamsById={teamsById}
                activeMatchIds={activeMatchIds}
                className="justify-center gap-5"
                onSaveResult={(matchId, result) => onSaveResult(groupId, matchId, result)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HourglassColumn({
  title,
  tone,
  matches,
  teamsById,
  activeMatchIds,
  className,
  onSaveResult
}: {
  title: string;
  tone: SectionTone;
  matches: BracketStageMatch[];
  teamsById: Map<string, Team>;
  activeMatchIds: Set<string>;
  className?: string;
  onSaveResult: (matchId: string, result: { scoreA?: number; scoreB?: number; winnerId: string }) => void;
}) {
  const toneClassName = getHourglassToneClass(tone);

  return (
    <div className={`relative flex flex-col ${className ?? ""}`}>
      <div className={`bracket-round-label mb-5 w-64 ${toneClassName}`}>{title}</div>
      {matches.length ? (
        matches.map((match) => (
          <div key={match.id} className="relative">
            <MatchCard
              match={match}
              teamsById={teamsById}
              locked={match.status !== "complete" && !activeMatchIds.has(match.id)}
              active={activeMatchIds.has(match.id)}
              roundToneClassName={toneClassName}
              onSaveResult={onSaveResult}
              onClearResult={() => undefined}
            />
          </div>
        ))
      ) : (
        <div className="w-64 border border-dashed border-line bg-panel/70 p-5 text-sm font-semibold text-muted">
          아직 생성된 매치가 없습니다.
        </div>
      )}
    </div>
  );
}

function HourglassConnectorLines() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full opacity-70 md:block"
      viewBox="0 0 1240 560"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M270 188 H350 V128 H402" className="fill-none stroke-line" strokeWidth="2" />
      <path d="M270 304 H350 V432 H402" className="fill-none stroke-line" strokeWidth="2" />
      <path d="M688 128 H784 V278 H812" className="fill-none stroke-line" strokeWidth="2" />
      <path d="M688 432 H784 V278 H812" className="fill-none stroke-line" strokeWidth="2" />
      <path d="M350 188 L350 304" className="fill-none stroke-line/70" strokeWidth="2" />
      <path d="M784 128 L784 432" className="fill-none stroke-line/70" strokeWidth="2" />
    </svg>
  );
}

function getHourglassToneClass(tone: SectionTone) {
  if (tone === "gold") return "bg-gold text-arena";
  if (tone === "red") return "bg-danger text-white";
  return "bg-cyan text-arena";
}

function GroupBracketSection({
  title,
  subtitle,
  tone,
  groupId,
  matches,
  teamsById,
  onSaveResult
}: {
  title: string;
  subtitle: string;
  tone: SectionTone;
  groupId: string;
  matches: BracketStageMatch[];
  teamsById: Map<string, Team>;
  onSaveResult: (
    groupId: string,
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
}) {
  return (
    <section
      className={`grid grid-cols-[56px_minmax(0,1fr)] gap-x-7 border-l-4 bg-arena/25 py-4 pr-4 ${
        tone === "gold" ? "border-gold/60" : tone === "cyan" ? "border-cyan/60" : "border-danger/60"
      }`}
    >
      <BracketAxisLabel label={title} tone={tone} />
      <div className="min-w-0">
        <BracketLane
          title={title}
          subtitle={subtitle}
          matches={matches}
          teamsById={teamsById}
          tone={tone}
          progressiveTone
          minHeight="300px"
          scrollable={false}
          onSaveResult={(matchId, result) => onSaveResult(groupId, matchId, result)}
          onClearResult={() => undefined}
        />
      </div>
    </section>
  );
}

function applyResult(
  stage: GroupEliminationStage,
  groupId: string,
  matchId: string,
  result: { scoreA?: number; scoreB?: number; winnerId: string }
) {
  if (stage.type === "group_triple_elimination") {
    return applyGroupTripleEliminationResult(stage, groupId, matchId, result.scoreA, result.scoreB, result.winnerId);
  }

  return applyGroupDoubleEliminationResult(stage, groupId, matchId, result.scoreA, result.scoreB, result.winnerId);
}

function getAdvancingTeams(stage: GroupEliminationStage, teams: Team[]) {
  if (stage.type === "group_triple_elimination") return getGroupTripleEliminationAdvancingTeams(stage, teams);
  return getGroupDoubleEliminationAdvancingTeams(stage, teams);
}

function getBracketSections(
  stage: GroupEliminationStage,
  entry: GroupEliminationStage["brackets"][number]
): BracketSection[] {
  if (stage.type === "group_triple_elimination") {
    const bracket = entry.bracket as GroupTripleEliminationStage["brackets"][number]["bracket"];
    return [
      {
        title: "Upper Bracket",
        subtitle: "1위 / 2위 결정",
        tone: "cyan",
        matches: bracket.matches.filter((match) => match.bracketGroup === "zero-loss")
      },
      {
        title: "Middle Bracket",
        subtitle: "3위 결정",
        tone: "gold",
        matches: bracket.matches.filter((match) => match.bracketGroup === "one-loss")
      },
      {
        title: "Lower Bracket",
        subtitle: "4위 결정",
        tone: "red",
        matches: bracket.matches.filter((match) => match.bracketGroup === "two-loss")
      }
    ];
  }

  const bracket = entry.bracket as GroupDoubleEliminationStage["brackets"][number]["bracket"];
  const winnersMatches = bracket.matches.filter((match) => match.bracketGroup === "winners");
  const losersMatches = bracket.matches.filter((match) => match.bracketGroup === "losers");
  const deciderMatches = bracket.matches.filter((match) => match.bracketGroup === "grand-final");

  if (!deciderMatches.length) {
    return [
      {
        title: "Upper Bracket",
        subtitle: "1-2시드 결정",
        tone: "cyan",
        matches: winnersMatches
      },
      {
        title: "Lower Bracket",
        subtitle: "3-4시드 결정",
        tone: "red",
        matches: losersMatches
      }
    ];
  }

  return [
    {
      title: "Upper Bracket",
      subtitle: "1위 결정",
      tone: "cyan",
      matches: winnersMatches
    },
    {
      title: "Lower Bracket",
      subtitle: "탈락전",
      tone: "red",
      matches: losersMatches
    },
    {
      title: "Decider",
      subtitle: "2위 결정",
      tone: "gold",
      matches: deciderMatches
    }
  ];
}

function getStageMeta(type: GroupEliminationStage["type"]) {
  if (type === "group_triple_elimination") {
    return {
      title: "그룹 트리플 엘리미네이션",
      groupTitle: "Triple Elimination Group",
      description: "각 조 8팀 기준으로 상위 조에서 1, 2위, 중위/하위 조에서 3, 4위를 결정합니다."
    };
  }

  return {
    title: "그룹 더블 엘리미네이션",
    groupTitle: "Double Elimination Group",
    description: "각 조 8팀 기준으로 승자조 2팀은 1-2시드, 패자조 2팀은 3-4시드로 진출합니다."
  };
}
