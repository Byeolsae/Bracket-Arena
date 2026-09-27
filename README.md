# Bracket Arena MVP

Next.js 기반 토너먼트 브래킷 메이커와 시뮬레이터 MVP입니다.

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zustand
- Prisma
- SQLite

## 설치

```powershell
cd "C:\Users\chany\OneDrive\문서\New project"
$env:Path = "C:\Users\chany\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;$env:Path"
.\node_modules\.bin\pnpm.cmd install
```

이 환경에서는 번들 Node를 사용하므로 `node`가 PATH에 없으면 위처럼 PATH를 먼저 설정하세요.

## 개발 서버 실행

```powershell
$env:Path = "C:\Users\chany\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;$env:Path"
.\node_modules\.bin\next.cmd dev -p 3000
```

브라우저에서 `http://localhost:3000`을 엽니다.

## Prisma / SQLite

`.env.example`:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
```

Prisma Client 생성:

```powershell
.\node_modules\.bin\prisma.cmd generate
```

스키마 확인:

```powershell
.\node_modules\.bin\prisma.cmd validate
```

현재는 SQLite와 Json 필드를 사용해 복합 토너먼트 구조를 저장할 수 있게 설계했습니다. 나중에 PostgreSQL로 옮길 때도 `Tournament`, `SavedTournament`, `TeamPreset`, `TeamSetPreset` 구조는 유지할 수 있습니다.

## Supabase 팀 클라우드 저장

팀 관리 화면의 클라우드 저장은 Supabase Auth와 REST API를 사용합니다. Supabase 프로젝트를 만든 뒤 `.env` 또는 Vercel 환경변수에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 넣으면 켜집니다.

Supabase SQL Editor에서 아래 테이블과 RLS 정책을 한 번 생성하세요.

```sql
create table if not exists public.team_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.team_libraries enable row level security;

create policy "Users can read their own team library"
on public.team_libraries
for select
using (auth.uid() = user_id);

create policy "Users can insert their own team library"
on public.team_libraries
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own team library"
on public.team_libraries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.saved_tournament_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.saved_tournament_libraries enable row level security;

create policy "Users can read their own saved tournament library"
on public.saved_tournament_libraries
for select
using (auth.uid() = user_id);

create policy "Users can insert their own saved tournament library"
on public.saved_tournament_libraries
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own saved tournament library"
on public.saved_tournament_libraries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.scoreboard_boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Scoreboard',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.scoreboard_boards enable row level security;

create policy "Anyone can read scoreboard boards"
on public.scoreboard_boards
for select
using (true);

create policy "Users can insert their own scoreboard boards"
on public.scoreboard_boards
for insert
with check (auth.uid() = owner_id);

create policy "Users can update their own scoreboard boards"
on public.scoreboard_boards
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete their own scoreboard boards"
on public.scoreboard_boards
for delete
using (auth.uid() = owner_id);

alter publication supabase_realtime add table public.scoreboard_boards;
```

OBS 스코어보드 출력은 `scoreboard_boards`의 Supabase Realtime 업데이트를 구독합니다. 위 `alter publication`이 이미 실행되어 있다면 같은 쿼리는 중복 오류가 날 수 있으며, 그 경우는 무시해도 됩니다.

## 주요 기능

- 팀 등록/수정/삭제
- 기본/라이트/다크 로고 관리
- 로고 fallback 및 이니셜 플레이스홀더
- 단일 팀 프리셋과 팀 세트 프리셋
- JSON 가져오기/내보내기
- 싱글 엘리미네이션 수동 브래킷
- 리그 Stage와 리그 → 본선 연결
- 스위스 Stage
- 더블 엘리미네이션 기본형
- 스텝래더 기본형
- Rating 기반 시뮬레이터
- Phase/Stage 구조 빌더

## MVP 범위

브래킷 메이커는 자동으로 결과를 만들지 않습니다. 사용자가 직접 점수와 승자를 입력합니다.

시뮬레이터는 별도 자동 Match Resolver를 사용하며, 메이커의 실제 결과를 저장하거나 덮어쓰지 않습니다.

## 폴더 구조

```text
src/app               화면 라우트
src/components        UI 컴포넌트
src/lib/core          순수 토너먼트/시뮬레이션 로직
src/lib/db            Prisma Client
src/store             클라이언트 상태 저장
prisma                Prisma schema
tests                 core 테스트
scripts               테스트 러너
```

## Core 로직

`src/lib/core` 아래 함수들은 React에 의존하지 않습니다.

- `singleElimination.ts`: 싱글 엘리미네이션 생성/결과 반영
- `league.ts`, `ranking.ts`: 리그 일정/순위 계산
- `swiss.ts`: 스위스 매칭/기록 계산
- `doubleElimination.ts`: 더블 엘리미네이션 기본 브래킷
- `stepladder.ts`: 스텝래더 기본 브래킷
- `simulation.ts`: Elo 승률과 반복 시뮬레이션
- `team.ts`, `presets.ts`, `storage.ts`: 팀 표시/프리셋/JSON 저장 유틸

## 테스트

### 에이펙스 레전드 · ALGS

- 추첨 및 참가팀 선택에서 `본선만` → `에이펙스 레전드 · ALGS`를 선택합니다. 중복 없는 20팀이 필요합니다.
- 생성 직후 진행 방식은 `매치 포인트 결승 · 50점` 또는 `6경기 합산전`으로 선택합니다. 결과 입력 이후에는 변경할 수 없습니다.
- 순위 배점: 1~5위 12/9/7/5/4, 6~7위 3, 8~10위 2, 11~15위 1, 16~20위 0. 킬당 1점입니다.
- 매치 포인트는 완료된 경기에서 50점 이상을 얻은 뒤, 이후 경기에서 1위를 해야 우승합니다. 우승팀을 제외한 팀들은 합산 점수로 정렬합니다. 모든 팀의 순위가 입력된 연속 경기만 우승 확정에 사용합니다.
- 처음 6경기가 생성되며 우승 미확정 시 완료 후 다음 경기를 추가할 수 있습니다. 우승 경기 이후 기록은 최종 집계에서 제외됩니다.
- 동점은 높은 개별 경기 점수, 좋은 개별 순위, 높은 개별 킬 수를 각각 정렬하여 비교합니다. 완전 동률은 생성 시 추첨한 순서를 저장해 사용합니다.
- 기존 배그 방식과 저장 데이터는 그대로 유지됩니다. ALGS 설정·추가 경기·기록·동률 추첨 순서는 기존 대회 저장에 포함됩니다.
- 범위: 20팀 단일 시리즈와 플레이오프형 결승. 30팀 프로리그 시즌, 40팀 플레이오프 진출 단계, 지역 결승/PLQ/LCQ의 우승 후 최소 6경기 진행 예외는 포함하지 않습니다.
- 근거: [ALGS Year 6 공식 규정](https://algs.ea.com/year-6-rules.pdf), Appendix C5, C6.1, C7.1 (2026-09-27 확인).

```powershell
npm run test
```

테스트는 TypeScript core 파일을 임시 디렉터리에 컴파일한 뒤 Node 내장 테스트 러너로 실행합니다.

## 배포 준비 체크

```powershell
.\node_modules\.bin\prisma.cmd generate
.\node_modules\.bin\prisma.cmd validate
npm run test
.\node_modules\.bin\next.cmd build
```

## 향후 추가 예정

- 정확한 팀 수별 더블 엘리미네이션 패자조 매핑
- 브래킷 리셋 옵션
- 서버 저장 API
- 이미지 파일 스토리지
- PostgreSQL 배포 설정
- 그룹 Stage 고도화
