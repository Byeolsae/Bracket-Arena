"use client";

import Link from "next/link";
import { Play, Plus, Swords } from "lucide-react";
import clsx from "clsx";
import {
  getRankedSwissRecords,
  getSwissAdvancingTeams,
  getSwissPowerProfile
} from "@/lib/core/swiss";
import { summarizePlayoffSlots } from "@/lib/core/slotMapping";
import { StageMatchRow } from "@/components/stages/StageMatchRow";
import { SwissRecordsTable } from "@/components/stages/SwissRecordsTable";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { useStageStore } from "@/store/stageStore";
import { useTeamStore } from "@/store/teamStore";
import { useTournamentStore } from "@/store/tournamentStore";
import type { SwissAdvanceMode, SwissMatch, SwissStage, Team } from "@/lib/core/models";

export default function SwissPage() {
  const teams = useTeamStore((state) => state.teams);
  const swiss = useStageStore((state) => state.swiss);
  const createSwissStage = useStageStore((state) => state.createSwissStage);
  const updateSwissResult = useStageStore((state) => state.updateSwissResult);
  const generateSwissRound = useStageStore((state) => state.generateSwissRound);
  const createTournament = useTournamentStore((state) => state.createTournament);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const records = swiss ? getRankedSwissRecords(swiss) : [];
  const advancingTeams = swiss ? getSwissAdvancingTeams(swiss, teams) : [];
  const advancingTeamIds = advancingTeams.map((team) => team.id);
  const slotSummary = summarizePlayoffSlots(advancingTeams);
  const profile = swiss ? getSwissPowerProfile(swiss.teamIds.length, swiss.config) : undefined;
  const rounds = swiss
    ? Array.from(new Set(swiss.matches.map((match) => match.round))).sort((a, b) => a - b)
    : [];

  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 2xl:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Swiss Stage</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-wide text-ink">
            Swiss Bracket
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            같은 전적끼리 우선 매칭하고 결과는 직접 입력합니다. 2의 거듭제곱 팀 수를 맞추면
            16팀 Swiss 구조를 32팀, 64팀으로 자연스럽게 확장할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="button-primary"
            disabled={teams.length < 2}
            onClick={() => createSwissStage(teams, readSwissConfig())}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Swiss 생성
          </button>
          <button
            className="button-muted"
            disabled={!swiss || swiss.isComplete}
            onClick={generateSwissRound}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            다음 라운드 생성
          </button>
          <button
            className="button-muted"
            disabled={advancingTeams.length < 2}
            onClick={() => createTournament(advancingTeams, "Swiss Playoffs")}
          >
            <Swords className="h-4 w-4" aria-hidden="true" />
            본선 생성
          </button>
          <Link href="/maker" className="button-muted">
            본선 보기
          </Link>
        </div>
      </div>

      <SwissConfigPanel />

      {swiss ? (
        <div className="mt-6 space-y-6">
          {profile ? (
            <section className="arena-card grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
              <div>
                <h2 className="font-black uppercase tracking-wide text-ink">Swiss Scale Profile</h2>
                <p className="mt-1 text-sm text-slate-400">{profile.message}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Teams" value={profile.teamCount.toString()} accent={profile.isPowerOfTwo ? "cyan" : "gold"} />
                <Metric label="Rounds" value={`${profile.configuredRounds}/${profile.recommendedRounds}`} accent="gold" />
                <Metric label="Options" value={profile.extendedRoundOptions.join(" / ")} accent="lime" />
              </div>
            </section>
          ) : null}

          <section className="arena-card overflow-hidden p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Broadcast Board</p>
                <h2 className="text-2xl font-black uppercase tracking-wide text-ink">
                  Swiss Bracket Flow
                </h2>
              </div>
              <div className="rounded-md border border-line bg-field px-3 py-2 text-sm font-black text-ink">
                Round {swiss.currentRound} / {swiss.config.maxRounds} · Playoff {slotSummary.bracketSize}강 · BYE {slotSummary.byeCount}
              </div>
            </div>
            <SwissBracketBoard swiss={swiss} teamsById={teamsById} records={records} />
          </section>

          <section className="arena-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black uppercase tracking-wide text-ink">Standings</h2>
                <p className="text-sm text-slate-400">진출권 팀은 강조되고, 탈락 팀은 흐리게 표시됩니다.</p>
              </div>
            </div>
            <SwissRecordsTable
              records={records}
              teamsById={teamsById}
              advancingTeamIds={advancingTeamIds}
            />
          </section>

          <section className="arena-card p-4">
            <h2 className="mb-4 font-black uppercase tracking-wide text-ink">수동 결과 입력</h2>
            <div className="space-y-5">
              {rounds.map((round) => (
                <div key={round} className="space-y-3">
                  <div className="rounded-md border border-line bg-arena px-3 py-2 text-sm font-black uppercase tracking-wide text-cyan">
                    Round {round}
                  </div>
                  {swiss.matches
                    .filter((match) => match.round === round)
                    .map((match) => (
                      <StageMatchRow
                        key={match.id}
                        match={match}
                        teamsById={teamsById}
                        requireWinner={!swiss.config.allowDraw}
                        allowDraw={swiss.config.allowDraw}
                        onSave={updateSwissResult}
                      />
                    ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section className="arena-card mt-6 border-dashed p-8 text-center">
          <h2 className="text-xl font-black uppercase tracking-wide text-ink">
            아직 Swiss Stage가 없습니다.
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            설정을 고른 뒤 Swiss 생성을 누르면 1라운드 매칭이 만들어집니다.
          </p>
        </section>
      )}
    </main>
  );
}

function SwissBracketBoard({
  swiss,
  teamsById,
  records
}: {
  swiss: SwissStage;
  teamsById: Map<string, Team>;
  records: ReturnType<typeof getRankedSwissRecords>;
}) {
  const roundBuckets = Array.from({ length: swiss.currentRound }, (_, index) => {
    const round = index + 1;
    const matches = swiss.matches.filter((match) => match.round === round);
    const buckets = new Map<string, SwissMatch[]>();

    matches.forEach((match) => {
      const key = getMatchRecordBeforeRound(swiss, match);
      buckets.set(key, [...(buckets.get(key) ?? []), match]);
    });

    return { round, buckets: Array.from(buckets.entries()) };
  });
  const qualified = records.filter((record) => record.status === "advanced");
  const eliminated = records.filter((record) => record.status === "eliminated");

  return (
    <div className="relative overflow-x-auto rounded-md border border-line bg-[radial-gradient(circle_at_20%_20%,rgba(47,230,255,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_35%),hsl(var(--arena))] p-4">
      <div className="flex min-w-max gap-5">
        {roundBuckets.map(({ round, buckets }) => (
          <div key={round} className="w-56 shrink-0">
            <div className="mb-3 rounded-sm border border-line bg-field px-3 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-ink">
              Round {round}
            </div>
            <div className="space-y-4">
              {buckets.map(([recordKey, matches]) => (
                <div key={`${round}-${recordKey}`} className="relative">
                  <div className={clsx("rounded-t-sm px-3 py-1 text-center text-xs font-black uppercase text-arena", bucketTone(recordKey))}>
                    {recordKey}
                  </div>
                  <div className="space-y-1 border border-t-0 border-line bg-panel/80 p-2">
                    {matches.map((match) => (
                      <SwissMiniMatch key={match.id} match={match} teamsById={teamsById} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <SwissOutcomeColumn title="Qualified" tone="bg-lime" records={qualified} teamsById={teamsById} />
        <SwissOutcomeColumn title="Eliminated" tone="bg-danger" records={eliminated} teamsById={teamsById} />
      </div>
    </div>
  );
}

function SwissMiniMatch({
  match,
  teamsById
}: {
  match: SwissMatch;
  teamsById: Map<string, Team>;
}) {
  const teamA = match.teamAId ? teamsById.get(match.teamAId) : undefined;
  const teamB = match.teamBId ? teamsById.get(match.teamBId) : undefined;

  if (match.isBye) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-lime/40 bg-lime/10 px-2 py-1">
        <TeamLogo team={teamA} size="sm" highlighted />
        <span className="min-w-0 flex-1 truncate text-xs font-black uppercase text-ink">
          {teamA?.shortName || teamA?.name || "미정"}
        </span>
        <span className="text-[10px] font-black text-lime">BYE</span>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-line bg-field">
      <SwissMiniTeam team={teamA} active={match.winnerId === teamA?.id} score={match.scoreA} />
      <div className="mx-2 border-t border-line" />
      <SwissMiniTeam team={teamB} active={match.winnerId === teamB?.id} score={match.scoreB} />
    </div>
  );
}

function SwissMiniTeam({ team, active, score }: { team?: Team; active?: boolean; score?: number }) {
  return (
    <div className={clsx("flex items-center gap-2 px-2 py-1", active && "bg-cyan/10")}>
      <TeamLogo team={team} size="sm" highlighted={active} useVictoryLogo={active} />
      <span className="min-w-0 flex-1 truncate text-xs font-black uppercase text-ink">
        {team?.shortName || team?.name || "미정"}
      </span>
      <span className={clsx("grid h-5 min-w-5 place-items-center rounded-sm text-xs font-black", active ? "bg-cyan text-arena" : "bg-arena text-slate-400")}>
        {score ?? "-"}
      </span>
    </div>
  );
}

function SwissOutcomeColumn({
  title,
  tone,
  records,
  teamsById
}: {
  title: string;
  tone: string;
  records: ReturnType<typeof getRankedSwissRecords>;
  teamsById: Map<string, Team>;
}) {
  return (
    <div className="w-56 shrink-0">
      <div className={clsx("mb-3 rounded-sm px-3 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-arena", tone)}>
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2 border border-line bg-panel/80 p-2">
        {records.map((record) => {
          const team = teamsById.get(record.teamId);
          return (
            <div key={record.teamId} className="flex items-center gap-2 rounded-sm border border-line bg-field p-1">
              <TeamLogo team={team} size="sm" highlighted={title === "Qualified"} />
              <span className="truncate text-xs font-black uppercase text-ink">
                {team?.shortName || team?.name || "미정"}
              </span>
            </div>
          );
        })}
        {!records.length ? <div className="col-span-2 py-6 text-center text-xs font-bold text-slate-500">대기 중</div> : null}
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: "cyan" | "gold" | "lime" }) {
  return (
    <div className="rounded-md border border-line bg-field px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className={clsx("font-black uppercase", accent === "cyan" && "text-cyan", accent === "gold" && "text-gold", accent === "lime" && "text-lime")}>
        {value}
      </div>
    </div>
  );
}

function bucketTone(recordKey: string) {
  const [wins, losses] = recordKey.split("-").map(Number);
  if (wins > losses) return "bg-lime";
  if (losses > wins) return "bg-danger";
  if (wins === 0 && losses === 0) return "bg-cyan";
  return "bg-gold";
}

function getMatchRecordBeforeRound(swiss: SwissStage, match: SwissMatch) {
  const teamId = match.teamAId || match.teamBId;
  if (!teamId) return "0-0";
  let wins = 0;
  let losses = 0;

  swiss.matches.forEach((candidate) => {
    if (candidate.round >= match.round || candidate.status !== "complete") return;
    if (candidate.teamAId !== teamId && candidate.teamBId !== teamId) return;
    if (candidate.winnerId === teamId) wins += 1;
    else if (candidate.winnerId) losses += 1;
  });

  return `${wins}-${losses}`;
}

function SwissConfigPanel() {
  return (
    <section className="arena-card grid gap-3 p-4 md:grid-cols-4">
      <ConfigNumber id="maxRounds" label="최대 라운드" value={5} />
      <ConfigSelect id="advanceMode" label="진출 방식" value="wins" />
      <ConfigNumber id="advanceWins" label="진출 승수" value={3} />
      <ConfigNumber id="eliminateLosses" label="탈락 패수" value={3} />
      <ConfigNumber id="advanceCount" label="상위 N팀" value={8} />
      <ConfigCheck id="allowDraw" label="무승부 허용" />
      <ConfigCheck id="avoidRematch" label="재매칭 회피" defaultChecked />
      <ConfigCheck id="allowBye" label="BYE 허용" defaultChecked />
      <ConfigCheck id="preventMultipleByes" label="중복 BYE 방지" defaultChecked />
      <ConfigCheck id="byeCountsAsWin" label="BYE 승리 처리" defaultChecked />
    </section>
  );
}

function ConfigNumber({ id, label, value }: { id: string; label: string; value: number }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input id={id} type="number" defaultValue={value} className="input" />
    </label>
  );
}

function ConfigSelect({
  id,
  label,
  value
}: {
  id: string;
  label: string;
  value: SwissAdvanceMode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-ink">{label}</span>
      <select id={id} defaultValue={value} className="input">
        <option value="wins">승수 기준</option>
        <option value="standings">순위 기준</option>
      </select>
    </label>
  );
}

function ConfigCheck({
  id,
  label,
  defaultChecked
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-line bg-field px-3 py-2 text-sm font-bold text-ink">
      <input id={id} type="checkbox" defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function readSwissConfig() {
  const value = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement;

  return {
    maxRounds: Number(value("maxRounds").value),
    advanceMode: value("advanceMode").value as SwissAdvanceMode,
    advanceWins: Number(value("advanceWins").value),
    eliminateLosses: Number(value("eliminateLosses").value),
    advanceCount: Number(value("advanceCount").value),
    allowDraw: (value("allowDraw") as HTMLInputElement).checked,
    avoidRematch: (value("avoidRematch") as HTMLInputElement).checked,
    allowBye: (value("allowBye") as HTMLInputElement).checked,
    preventMultipleByes: (value("preventMultipleByes") as HTMLInputElement).checked,
    byeCountsAsWin: (value("byeCountsAsWin") as HTMLInputElement).checked
  };
}
