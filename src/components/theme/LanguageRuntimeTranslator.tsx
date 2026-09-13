"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/uiStore";

const exactTranslations: Record<string, string> = {
  "브래킷": "Bracket",
  "팀 관리": "Team Manager",
  "티어리스트": "Tier List",
  "추첨 및 참가팀 선택": "Draw & Team Selection",
  "대진표 만들기": "Create Bracket",
  "팀 관리하기": "Manage Teams",
  "티어 정리하기": "Organize Tiers",
  "참가팀 준비하기": "Prepare Teams",
  "팀을 만들고, 원하는 대회 구조를 고른 뒤, 브래킷과 티어리스트를 빠르게 정리합니다.": "Create teams, choose a tournament structure, then organize brackets and tier lists quickly.",
  "참가팀을 고르고 예선/본선 방식으로 대진표를 만든 뒤 점수를 직접 입력합니다.": "Select teams, build qualifier and playoff brackets, then enter scores manually.",
  "팀 로고, 약칭, 전용 색상, 폴더 정리를 바탕화면처럼 관리합니다.": "Manage team logos, short names, colors, and folders like a desktop.",
  "만든 팀을 S-F 등급에 드래그해서 배치하고, 등급 이름과 색상을 커스텀합니다.": "Drag your teams into S-F tiers and customize tier names and colors.",
  "참가팀, 대회 설정, 포트, 시드/조 추첨을 준비하고 브래킷으로 가져옵니다.": "Prepare teams, tournament settings, pots, seed/group draws, then import them into the bracket.",
  "대회 설정": "Tournament Setup",
  "대회 이름": "Tournament Name",
  "새 대회": "New Tournament",
  "예선 + 본선": "Qualifier + Playoffs",
  "본선": "Playoffs",
  "본선만": "Playoffs Only",
  "예선": "Qualifier",
  "예선 방식": "Qualifier Format",
  "본선 방식": "Playoff Format",
  "예선 생성": "Create Qualifier",
  "본선 생성": "Create Playoffs",
  "대진표 생성": "Create Bracket",
  "진행 방식": "Mode",
  "참가팀": "Teams",
  "예상 본선 진출": "Projected Playoff Teams",
  "설정 요약": "Setup Summary",
  "참가팀 선택과 대회 설정은 추첨 및 참가팀 선택 화면에서 관리합니다.": "Team selection and tournament setup are managed on the Draw & Team Selection page.",
  "추첨 및 참가팀 선택에서 팀을 선택한 뒤 브래킷으로 가져오세요.": "Select teams in Draw & Team Selection, then import them into the bracket.",
  "Stage 옵션": "Stage Options",
  "진출팀 수": "Advancing Teams",
  "리그 방식": "League Format",
  "싱글 라운드 로빈": "Single Round Robin",
  "더블 라운드 로빈": "Double Round Robin",
  "스위스 설정": "Swiss Settings",
  "그룹 설정": "Group Settings",
  "배틀로얄 설정": "Battle Royale Settings",
  "조 개수": "Group Count",
  "조별 진출팀": "Advancers per Group",
  "라운드 수": "Rounds",
  "라운드 참가팀": "Teams per Round",
  "전체": "Select All",
  "해제": "Clear",
  "시드 랜덤": "Random Seeds",
  "시드 배분": "Distribute Seeds",
  "그룹 랜덤": "Random Groups",
  "조 편성": "Group Assignment",
  "여기에 드롭": "Drop here",
  "선택": "Select",
  "비어 있는 폴더입니다.": "This folder is empty.",
  "PDF 출력": "Export PDF",
  "팀과 방식을 선택한 뒤 생성 버튼을 누르면 여기에 Stage가 표시됩니다.": "Choose teams and a format, then create a stage to display it here.",
  "최소 2팀을 선택해야 합니다.": "Select at least 2 teams.",
  "본선 진출팀이 2팀 이상 확정된 뒤 본선을 생성할 수 있습니다.": "Create playoffs after at least 2 advancing teams are confirmed.",
  "싱글 엘리미네이션": "Single Elimination",
  "더블 엘리미네이션": "Double Elimination",
  "트리플 엘리미네이션": "Triple Elimination",
  "스텝래더": "Stepladder",
  "리그": "League",
  "그룹 리그": "Group League",
  "그룹 더블 엘리미네이션": "Group Double Elimination",
  "그룹 트리플 엘리미네이션": "Group Triple Elimination",
  "스위스": "Swiss",
  "배틀로얄": "Battle Royale",
  "한 번 지면 탈락하는 기본 녹아웃 브래킷": "Classic knockout bracket where one loss eliminates a team",
  "상위조 / 하위조 / 그랜드 파이널": "Upper bracket / lower bracket / grand final",
  "본선 8팀 고정, 0패 / 1패 / 2패 그룹 구조": "Fixed 8-team playoff with 0-loss / 1-loss / 2-loss groups",
  "낮은 시드부터 높은 시드에게 도전": "Lower seeds challenge higher seeds in order",
  "라운드 로빈 순위표": "Round-robin standings",
  "조별 라운드 로빈": "Group round robin",
  "조별 4팀 더블 엘리, 상위 2팀 진출": "4-team GSL-style groups, top 2 advance",
  "조별 8팀 상위/하위/라스트 찬스 방식": "8-team groups with upper/middle/lower paths",
  "같은 전적끼리 매칭": "Pair teams with similar records",
  "라운드별 순위/킬 누적 점수": "Accumulated placement/kill points by round",
  "자유": "Open",
  "조별 자유": "Open Groups",
  "한 조당 0-4팀": "0-4 teams per group",
  "한 조당 0-8팀": "0-8 teams per group",
  "8팀 고정": "Fixed 8 teams",
  "비활성": "Disabled",
  "티어 설정": "Tier Settings",
  "등급 추가": "Add Tier",
  "초기화": "Reset",
  "설정할 등급이 없습니다.": "No tier to configure.",
  "등급 삭제": "Delete Tier",
  "여기에 팀을 드래그": "Drag teams here",
  "미배치 팀": "Unassigned Teams",
  "등급 밖으로 꺼내려면 이 영역에 드래그하면 됩니다.": "Drag teams here to remove them from a tier.",
  "아직 팀이 없습니다. 팀 관리에서 먼저 추가하세요.": "No teams yet. Add teams in Team Manager first.",
  "모든 팀이 등급에 배치되었습니다.": "All teams are assigned to tiers.",
  "등급 이름": "Tier Name",
  "티어 색상": "Tier Color",
  "티어 글씨 색상": "Tier Text Color",
  "미리보기": "Preview",
  "수정": "Edit",
  "복제": "Duplicate",
  "팀 삭제": "Delete Team",
  "테마 전환": "Toggle Theme",
  "언어 선택": "Language",
  "새 폴더": "New Folder",
  "이름 변경": "Rename",
  "시드": "Seeding",
  "시드 순위": "Seed Ranking",
  "다음 Stage 배정 기준": "Used for next stage seeding",
  "결과": "Result",
  "최종 순위": "Final Ranking",
  "결과 입력 후 자동 정리": "Updated from entered results",
  "본선 시드": "Main stage seed",
  "와일드카드 본선 배정 기준": "Wildcard main stage seed",
  "순위표": "Standings",
  "경기 목록": "Matches",
  "수동 결과 입력": "Manual Result Entry",
  "아직 생성된 매치가 없습니다.": "No matches have been generated yet.",
  "아직 탈락한 팀이 없습니다.": "No teams have been eliminated yet.",
  "아직 확정된 진출팀이 없습니다.": "No advancing teams confirmed yet.",
  "미정": "TBD",
  "대기 중": "Waiting",
  "팀 확정 대기": "Waiting for teams",
  "무승부 자동 반영": "Draws are applied automatically",
  "동점은 승자 미확정": "Ties leave the winner unresolved",
  "점수 입력 시 자동 반영": "Scores apply automatically",
  "현재 라운드 자동": "Auto Current Round",
  "현재 진행 가능한 라운드의 빈 매치만 랜덤 입력": "Randomly fill only empty matches in the current playable round",
  "현재 스텝 자동": "Auto Current Step",
  "현재 진행 가능한 스텝에 랜덤 점수를 입력합니다": "Enter random scores for the current playable step",
  "챔피언": "Champion",
  "러너업": "Runner Up",
  "3등": "Third Place",
  "1위 결정": "1st Place",
  "2위 결정": "2nd Place",
  "3위 결정": "3rd Place",
  "4위 결정": "4th Place",
  "패자조": "Losers Bracket",
  "탈락전": "Elimination Match",
  "표준식 2패조": "Standard two-loss bracket",
  "상위조에서 한 번 지면 패자조로 내려가고, 패자조에서 다시 지면 탈락합니다.": "Lose once in the upper bracket to drop to the lower bracket; lose again there to be eliminated.",
  "Upper는 1위, Middle은 2위, Lower는 3위를 결정합니다.": "Upper decides 1st, Middle decides 2nd, and Lower decides 3rd.",
  "라운드 결과 저장": "Save Round Result",
  "팀": "Team",
  "순위": "Rank",
  "상태": "Status",
  "경기": "Played",
  "승": "W",
  "무": "D",
  "패": "L",
  "득점": "For",
  "실점": "Against",
  "득실": "Diff",
  "승점": "Points",
  "순위점수": "Placement Pts",
  "킬점수": "Kill Pts",
  "보너스": "Bonus",
  "페널티": "Penalty",
  "총점": "Total",
  "최대 라운드": "Max Rounds",
  "진출 방식": "Advance Mode",
  "진출 승수": "Wins to Advance",
  "탈락 패수": "Losses to Eliminate",
  "상위 N팀": "Top N Teams",
  "무승부 허용": "Allow Draws",
  "재매칭 회피": "Avoid Rematches",
  "BYE 허용": "Allow BYE",
  "중복 BYE 방지": "Prevent Multiple BYEs",
  "BYE 승리 처리": "BYE Counts as Win",
  "승수 기준": "By Wins",
  "순위 기준": "By Standings",
  "슬롯 매핑": "Slot Mapping",
  "순위 순서대로": "Standing Order",
  "시드 순서대로": "Seed Order",
  "랜덤 배정": "Random Assignment",
  "수동 배정": "Manual Assignment",
  "같은 조 회피": "Avoid Same Group",
  "같은 지역 회피": "Avoid Same Region",
  "추첨": "Group Draw",
  "시드 추첨": "Seed Draw",
  "포트 설정": "Pot Settings",
  "대회 설정, 참가팀 설정, 조별 설정, 스테이지 옵션은 브래킷에서 추첨으로 넘어옵니다.": "Tournament, team, group, and stage settings are imported from the bracket setup.",
  "공개": "Reveal",
  "브래킷으로 가져오기": "Import to Bracket",
  "수동 결과 적용": "Apply Manual Result",
  "중복 시드는 자동으로 서로 교체됩니다.": "Duplicate seeds are swapped automatically.",
  "팀 카드를 원하는 조 칸으로 드래그해서 배정하세요.": "Drag team cards into the desired group slots.",
  "먼저 참가팀을 선택하세요.": "Select teams first.",
  "시드 추첨을 시작하면 결과가 표시됩니다.": "Seed draw results will appear after the draw starts.",
  "아직 배정 전": "Not assigned yet",
  "클릭해서 추첨 시작": "Click to Start Draw",
  "추첨 진행 중": "Drawing",
  "팀을 먼저 선택하세요": "Select teams first",
  "준비 완료": "Ready",
  "추첨 시작": "Start Draw",
  "조 선택": "Select Group"
};

const regexTranslations: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^(\d+)팀$/, (match) => `${match[1]} teams`],
  [/^(\d+)\/(\d+)팀$/, (match) => `${match[1]}/${match[2]} teams`],
  [/^(\d+)팀 참가 · 기준 브래킷 (\d+)강 · 부전승 (\d+)$/, (match) => `${match[1]} selected · ${match[2]}-slot bracket · ${match[3]} byes`],
  [/^진출권 상위 (\d+)팀 \/ 본선 (\d+)강 \/ 부전승 (\d+)$/, (match) => `Top ${match[1]} advance / ${match[2]}-slot playoff / ${match[3]} byes`],
  [/^예상 본선 진출팀은 (\d+)팀입니다\. 이 팀 수로 생성할 수 없는 본선 방식은 자동으로 비활성화됩니다\.$/, (match) => `Projected playoff teams: ${match[1]}. Playoff formats that cannot use this team count are disabled automatically.`],
  [/^현재 참가팀 기준 조는 최대 (\d+)개, 조별 진출은 최대 (\d+)팀까지 가능합니다\.$/, (match) => `With the current teams, up to ${match[1]} groups and ${match[2]} advancers per group are available.`],
  [/^(.+)은 조별 (\d+)팀 고정, 조별 (\d+)팀 진출입니다\. 현재 선택 기준 (\d+)개 조가 생성되고, 부족한 슬롯은 BYE로 처리됩니다\.$/, (match) => `${translateText(match[1])} is fixed at ${match[2]} teams per group with ${match[3]} advancers per group. ${match[4]} groups will be created, and missing slots become BYEs.`],
  [/^(\d+)번 시드$/, (match) => `Seed ${match[1]}`],
  [/^(\d+)시드$/, (match) => `Seed ${match[1]}`],
  [/^와일드카드 (\d+)시드$/, (match) => `Wildcard Seed ${match[1]}`],
  [/^([A-Z])그룹$/, (match) => `Group ${match[1]}`],
  [/^([A-Z])조$/, (match) => `Group ${match[1]}`],
  [/^([A-Z])그룹 (\d+)시드$/, (match) => `Group ${match[1]} Seed ${match[2]}`],
  [/^([A-Z])조 #(\d+)$/, (match) => `Group ${match[1]} #${match[2]}`],
  [/^([A-Z])그룹 본선 배정 기준$/, (match) => `Group ${match[1]} main stage seed`],
  [/^(\d+)위$/, (match) => `${ordinal(Number(match[1]))} Place`],
  [/^(\d+)위 결정$/, (match) => `${ordinal(Number(match[1]))} Place`],
  [/^진출팀 (\d+)팀 미만$/, (match) => `Fewer than ${match[1]} advancing teams`],
  [/^진출팀 (\d+)팀, 최대 (\d+)팀$/, (match) => `${match[1]} advancing teams, max ${match[2]}`],
  [/^진출팀 (\d+)팀, (\d+)팀 고정$/, (match) => `${match[1]} advancing teams, fixed ${match[2]}`],
  [/^(.+)은 최대 (\d+)팀까지만 생성할 수 있습니다\.$/, (match) => `${translateText(match[1])} supports up to ${match[2]} teams.`],
  [/^(.+)은 (\d+)팀 고정입니다\.$/, (match) => `${translateText(match[1])} is fixed at ${match[2]} teams.`],
  [/^(.+)은 조별 최대 (\d+)팀까지만 생성할 수 있습니다\. (.+)가 (\d+)팀입니다\.$/, (match) => `${translateText(match[1])} supports up to ${match[2]} teams per group. ${translateText(match[3])} has ${match[4]} teams.`],
  [/^(.+) · (.+)$/, (match) => `${translateText(match[1])} · ${match[2]}`],
  [/^(.+) 폴더를 삭제할까요\?$/, (match) => `Delete the "${match[1]}" folder?`]
];

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedMarker = "data-runtime-translated";

export function LanguageRuntimeTranslator() {
  const language = useUiStore((state) => state.language);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    translateDocument(language);

    const observer = new MutationObserver(() => translateDocument(language));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["title", "aria-label", "placeholder"]
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}

function translateDocument(language: "ko" | "en") {
  const root = document.body;
  translateTextNodes(root, language);
  translateAttributes(root, language);
}

function translateTextNodes(root: HTMLElement, language: "ko" | "en") {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const baseText = originalText.get(node) ?? node.textContent ?? "";
    if (!originalText.has(node)) originalText.set(node, baseText);
    const nextText = language === "en" ? translatePreservingWhitespace(baseText) : baseText;
    if (node.textContent !== nextText) node.textContent = nextText;
  }
}

function translateAttributes(root: HTMLElement, language: "ko" | "en") {
  const elements = root.querySelectorAll<HTMLElement>("[title], [aria-label], [placeholder]");

  for (const element of elements) {
    for (const attribute of ["title", "aria-label", "placeholder"]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const stored = originalAttributes.get(element) ?? new Map<string, string>();
      if (!originalAttributes.has(element)) originalAttributes.set(element, stored);
      if (!stored.has(attribute)) stored.set(attribute, value);
      const baseValue = stored.get(attribute) ?? value;
      const nextValue = language === "en" ? translateText(baseValue) : baseValue;
      if (value !== nextValue) element.setAttribute(attribute, nextValue);
    }
  }

  document.documentElement.toggleAttribute(translatedMarker, language === "en");
}

function translatePreservingWhitespace(value: string) {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.trim();
  return core ? `${leading}${translateText(core)}${trailing}` : value;
}

function translateText(value: string): string {
  const direct = exactTranslations[value];
  if (direct) return direct;

  for (const [pattern, replacer] of regexTranslations) {
    const match = value.match(pattern);
    if (match) return replacer(match);
  }

  return value
    .replace(/([A-Z])그룹/g, "Group $1")
    .replace(/([A-Z])조/g, "Group $1")
    .replace(/(\d+)팀/g, "$1 teams")
    .replace(/(\d+)시드/g, "Seed $1")
    .replace(/(\d+)위/g, "$1th Place");
}

function ordinal(value: number) {
  const suffix = value % 10 === 1 && value % 100 !== 11 ? "st" : value % 10 === 2 && value % 100 !== 12 ? "nd" : value % 10 === 3 && value % 100 !== 13 ? "rd" : "th";
  return `${value}${suffix}`;
}
