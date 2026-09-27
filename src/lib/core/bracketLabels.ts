const roundLabels: Record<string, string> = {
  final: "결승",
  "final boss": "결승",
  semifinal: "준결승",
  quarterfinal: "8강",
  "grand final": "최종 결승",
  "grand final reset": "최종 결승 재경기",
  "3rd place": "3·4위전",
  "third place": "3·4위전",
  "winners match": "승자전",
  "elimination match": "패자전",
  "decider match": "최종 진출전"
};

export function getBracketRoundLabel(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (roundLabels[normalized]) return roundLabels[normalized];
  const stage = /^(upper|middle|lower) (final|semifinal|quarterfinal|round \d+)$/.exec(normalized);
  if (stage) {
    const label = { upper: "상위조", middle: "중위조", lower: "하위조" }[stage[1]];
    return `${label} ${getBracketRoundLabel(stage[2])}`;
  }
  const numbered = /^(round of|round|step|winners bracket|losers bracket|opening match) (\d+)$/.exec(normalized);
  if (numbered) {
    const number = numbered[2];
    switch (numbered[1]) {
      case "round of": return `${number}강`;
      case "round": return `${number}라운드`;
      case "step": return `${number}단계`;
      case "winners bracket": return `승자조 ${number}라운드`;
      case "losers bracket": return `패자조 ${number}라운드`;
      case "opening match": return `첫 경기 ${number}`;
    }
  }
  const lossRound = /^(\d+)-loss round (\d+)$/.exec(normalized);
  if (lossRound) return `${lossRound[1]}패조 ${lossRound[2]}라운드`;
  return name;
}
