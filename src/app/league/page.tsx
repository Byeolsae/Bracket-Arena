"use client";

import Link from "next/link";
import { Play, Swords } from "lucide-react";
import { getAdvancingTeams } from "@/lib/core/advancement";
import { calculateLeagueStandings } from "@/lib/core/league";
import { summarizePlayoffSlots } from "@/lib/core/slotMapping";
import { LeagueStandingsTable } from "@/components/stages/LeagueStandingsTable";
import { StageMatchRow } from "@/components/stages/StageMatchRow";
import { useStageStore } from "@/store/stageStore";
import { useTeamStore } from "@/store/teamStore";
import { useTournamentStore } from "@/store/tournamentStore";

export default function LeaguePage() {
  const teams = useTeamStore((state) => state.teams);
  const league = useStageStore((state) => state.league);
  const createLeagueStage = useStageStore((state) => state.createLeagueStage);
  const updateLeagueResult = useStageStore((state) => state.updateLeagueResult);
  const setLeagueAdvanceCount = useStageStore((state) => state.setLeagueAdvanceCount);
  const createTournament = useTournamentStore((state) => state.createTournament);
  const activeTeams = league
    ? league.teamIds.map((teamId) => teams.find((team) => team.id === teamId)).filter(Boolean)
    : teams;
  const stageTeams = activeTeams as typeof teams;
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const standings = league ? calculateLeagueStandings(league.matches, stageTeams) : [];
  const advanceCount = league?.advanceCount ?? Math.min(8, teams.length);
  const advancingTeams = league ? getAdvancingTeams(standings, stageTeams, advanceCount) : [];
  const slotSummary = summarizePlayoffSlots(advancingTeams);
  const rounds = league
    ? Array.from(new Set(league.matches.map((match) => match.round))).sort((a, b) => a - b)
    : [];

  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 2xl:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">League Stage</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink">리그 스테이지</h1>
          <p className="mt-1 text-sm text-slate-400">
            싱글 라운드 로빈 결과를 직접 입력하고 상위 N팀을 본선으로 보냅니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            min={1}
            max={teams.length}
            value={advanceCount}
            onChange={(event) => (league ? setLeagueAdvanceCount(Number(event.target.value)) : undefined)}
            className="input w-32"
            aria-label="진출 팀 수"
          />
          <button className="button-primary" disabled={teams.length < 2} onClick={() => createLeagueStage(teams, Math.min(8, teams.length))}>
            <Play className="h-4 w-4" aria-hidden="true" />
            리그 생성
          </button>
          <button className="button-muted" disabled={advancingTeams.length < 2} onClick={() => createTournament(advancingTeams, "League Playoffs")}>
            <Swords className="h-4 w-4" aria-hidden="true" />
            본선 생성
          </button>
          <Link href="/maker" className="button-muted">
            본선 보기
          </Link>
        </div>
      </div>

      {league ? (
        <div className="space-y-6">
          <section className="arena-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black uppercase tracking-wide text-ink">순위표</h2>
                <p className="text-sm text-slate-400">
                  진출권 상위 {advanceCount}팀 / 본선 {slotSummary.bracketSize}강 / 부전승 {slotSummary.byeCount}
                </p>
              </div>
            </div>
            <LeagueStandingsTable standings={standings} teamsById={teamsById} advanceCount={advanceCount} />
          </section>

          <section className="arena-card p-4">
            <h2 className="mb-4 font-black uppercase tracking-wide text-ink">경기 목록</h2>
            <div className="space-y-5">
              {rounds.map((round) => (
                <div key={round} className="space-y-3">
                  <div className="rounded-md border border-line bg-arena px-3 py-2 text-sm font-black uppercase tracking-wide text-cyan">
                    Round {round}
                  </div>
                  {league.matches
                    .filter((match) => match.round === round)
                    .map((match) => (
                      <StageMatchRow key={match.id} match={match} teamsById={teamsById} onSave={(matchId, scoreA, scoreB) => updateLeagueResult(matchId, scoreA, scoreB)} />
                    ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section className="arena-card border-dashed p-8 text-center">
          <h2 className="text-xl font-black uppercase tracking-wide text-ink">아직 리그가 없습니다.</h2>
          <p className="mt-2 text-sm text-slate-400">
            팀을 등록한 뒤 리그 생성을 누르면 싱글 라운드 로빈 일정이 만들어집니다.
          </p>
        </section>
      )}
    </main>
  );
}
