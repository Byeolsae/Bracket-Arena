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
