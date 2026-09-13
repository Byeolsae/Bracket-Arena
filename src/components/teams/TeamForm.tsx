"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Eye, ImagePlus, Save, X } from "lucide-react";
import clsx from "clsx";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { removeStoredLogo, storeLogoDataUrl } from "@/lib/browser/logoStorage";
import {
  getTeamBracketAccentColor,
  getTeamReadableScoreTextColor,
  getTeamThemeTextColor,
  getTeamVictoryTextColor,
  getTeamWinnerAccentColor,
  getTeamWinnerColor
} from "@/lib/core/color";
import type { Team } from "@/lib/core/models";

type TeamFormProps = {
  team?: Team;
  onSubmit: (team: Omit<Team, "id" | "defaultSeed"> & { id?: string }) => void;
  onCancel?: () => void;
};

type LogoField = "logoDefault" | "logoLight" | "logoDark" | "logoVictory" | "logoVictoryLight" | "logoVictoryDark";
type LogoNameField =
  | "logoDefaultName"
  | "logoLightName"
  | "logoDarkName"
  | "logoVictoryName"
  | "logoVictoryLightName"
  | "logoVictoryDarkName";

type EyeDropperResult = { sRGBHex: string };
type EyeDropperConstructor = new () => { open: () => Promise<EyeDropperResult> };

const defaultPrimary = "#2fe6ff";
const transparentPreviewClass =
  "bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%),linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%)] bg-white bg-[length:16px_16px] bg-[position:0_0,8px_8px]";
const logoNameFieldByLogoField: Record<LogoField, LogoNameField> = {
  logoDefault: "logoDefaultName",
  logoLight: "logoLightName",
  logoDark: "logoDarkName",
  logoVictory: "logoVictoryName",
  logoVictoryLight: "logoVictoryLightName",
  logoVictoryDark: "logoVictoryDarkName"
};
const maxLogoSize = 256;
const maxLogoDataUrlLength = 110_000;

const ui = {
  defaultLogo: "\uAE30\uBCF8 \uB85C\uACE0",
  defaultLogoHint: "\uACF5\uD1B5 fallback",
  lightLogo: "\uB77C\uC774\uD2B8\uBAA8\uB4DC \uB85C\uACE0",
  lightLogoHint: "\uD770\uC0C9 \uBC30\uACBD\uC5D0\uC11C \uBBF8\uB9AC\uBCF4\uAE30",
  darkLogo: "\uB2E4\uD06C\uBAA8\uB4DC \uB85C\uACE0",
  darkLogoHint: "\uAC80\uC815 \uBC30\uACBD\uC5D0\uC11C \uBBF8\uB9AC\uBCF4\uAE30",
  victoryLogo: "\uC2B9\uB9AC\uC2DC \uB85C\uACE0",
  victoryLogoHint: "\uC2B9\uB9AC\uD300 \uAC15\uC870\uC5D0\uC11C \uD45C\uC2DC",
  victoryLightLogo: "\uC2B9\uB9AC \uB77C\uC774\uD2B8\uBAA8\uB4DC \uB85C\uACE0",
  victoryLightLogoHint: "\uB77C\uC774\uD2B8 \uC2B9\uB9AC \uBE0C\uB798\uD0B7\uC5D0\uC11C \uD45C\uC2DC",
  victoryDarkLogo: "\uC2B9\uB9AC \uB2E4\uD06C\uBAA8\uB4DC \uB85C\uACE0",
  victoryDarkLogoHint: "\uB2E4\uD06C \uC2B9\uB9AC \uBE0C\uB798\uD0B7\uC5D0\uC11C \uD45C\uC2DC",
  remove: "\uC81C\uAC70",
  chooseImage: "\uC774\uBBF8\uC9C0 \uC120\uD0DD",
  teamInfo: "Team Info",
  teamName: "\uD300 \uC774\uB984",
  shortName: "\uC57D\uCE6D",
  colors: "Colors",
  primaryColor: "\uC8FC \uC0C9\uC0C1",
  bracketAccentColor: "\uBE0C\uB798\uD0B7 \uD3EC\uC778\uD2B8 \uC0C9\uC0C1",
  bracketAccentHint: "\uBE0C\uB798\uD0B7 \uC67C\uCABD \uB450\uAEBC\uC6B4 \uC0C9 \uBD80\uBD84",
  victoryColor: "\uC2B9\uB9AC\uC2DC \uC0C9\uBCC0\uD654",
  victoryBackgroundColor: "\uC2B9\uB9AC\uC2DC \uBC30\uACBD \uC0C9\uC0C1",
  victoryAccentColor: "\uC2B9\uB9AC\uC2DC \uBE0C\uB798\uD0B7 \uD3EC\uC778\uD2B8 \uC0C9\uC0C1",
  enableVictoryColor: "\uC2B9\uB9AC \uC0C9\uBCC0\uD654 \uD65C\uC131\uD654",
  victoryLightModeColor: "\uC2B9\uB9AC \uB77C\uC774\uD2B8\uBAA8\uB4DC",
  victoryDarkModeColor: "\uC2B9\uB9AC \uB2E4\uD06C\uBAA8\uB4DC",
  enableVictoryLightColor: "\uC2B9\uB9AC \uB77C\uC774\uD2B8 \uC804\uC6A9",
  enableVictoryDarkColor: "\uC2B9\uB9AC \uB2E4\uD06C \uC804\uC6A9",
  victoryTextColor: "\uC2B9\uB9AC\uC2DC \uAE00\uC528 \uC0C9\uC0C1",
  lightModeColor: "\uB77C\uC774\uD2B8\uBAA8\uB4DC \uC0C9\uC0C1",
  darkModeColor: "\uB2E4\uD06C\uBAA8\uB4DC \uC0C9\uC0C1",
  textColor: "\uAE00\uC528 \uC0C9\uC0C1",
  textColorHint: "\uD300\uBA85\uACFC \uC57D\uCE6D\uC5D0 \uC801\uC6A9",
  textColorDefault: "\uAE30\uBCF8 \uAE00\uC528 \uC0C9\uC0C1",
  textColorLight: "\uB77C\uC774\uD2B8\uBAA8\uB4DC \uAE00\uC528",
  textColorDark: "\uB2E4\uD06C\uBAA8\uB4DC \uAE00\uC528",
  enableLightColor: "\uB77C\uC774\uD2B8 \uC804\uC6A9 \uC0C9\uC0C1 \uD65C\uC131\uD654",
  enableDarkColor: "\uB2E4\uD06C \uC804\uC6A9 \uC0C9\uC0C1 \uD65C\uC131\uD654",
  memo: "\uBA54\uBAA8",
  memoPlaceholder: "\uD300 \uAD00\uB828 \uBA54\uBAA8",
  saveEdit: "\uC218\uC815 \uC800\uC7A5",
  addTeam: "\uD300 \uCD94\uAC00",
  cancel: "\uCDE8\uC18C",
  eyedropper: "\uC2A4\uD3EC\uC774\uD2B8",
  eyedropperUnsupported: "\uC774 \uBE0C\uB77C\uC6B0\uC800\uB294 \uC2A4\uD3EC\uC774\uD2B8\uB97C \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
  invalidColor: "\uC608: #2fe6ff \uB610\uB294 2fe6ff",
  singleColor: "\uB2E8\uC77C \uC0C9\uC0C1"
};

const emptyForm = {
  name: "",
  shortName: "",
  logoDefault: "",
  logoLight: "",
  logoDark: "",
  logoVictory: "",
  logoVictoryLight: "",
  logoVictoryDark: "",
  logoDefaultName: "",
  logoLightName: "",
  logoDarkName: "",
  logoVictoryName: "",
  logoVictoryLightName: "",
  logoVictoryDarkName: "",
  primaryColor: defaultPrimary,
  bracketAccentColor: "",
  bracketAccentColorLight: "",
  bracketAccentColorDark: "",
  victoryColor: "",
  victoryColorLight: "",
  victoryColorDark: "",
  victoryAccentColor: "",
  victoryAccentColorLight: "",
  victoryAccentColorDark: "",
  victoryColorEnabled: false,
  victoryTextColor: "",
  victoryTextColorLight: "",
  victoryTextColorDark: "",
  primaryColorLight: "",
  primaryColorDark: "",
  textColor: "",
  textColorLight: "",
  textColorDark: "",
  note: ""
};

const logoFields: Array<{
  field: LogoField;
  title: string;
  hint: string;
  variant: "default" | "light" | "dark";
  previewClass: string;
}> = [
  {
    field: "logoDefault",
    title: ui.defaultLogo,
    hint: ui.defaultLogoHint,
    variant: "default",
    previewClass: transparentPreviewClass
  },
  {
    field: "logoLight",
    title: ui.lightLogo,
    hint: ui.lightLogoHint,
    variant: "light",
    previewClass: "bg-white"
  },
  {
    field: "logoDark",
    title: ui.darkLogo,
    hint: ui.darkLogoHint,
    variant: "dark",
    previewClass: "bg-black"
  },
  {
    field: "logoVictory",
    title: ui.victoryLogo,
    hint: ui.victoryLogoHint,
    variant: "default",
    previewClass: transparentPreviewClass
  },
  {
    field: "logoVictoryLight",
    title: ui.victoryLightLogo,
    hint: ui.victoryLightLogoHint,
    variant: "light",
    previewClass: "bg-white"
  },
  {
    field: "logoVictoryDark",
    title: ui.victoryDarkLogo,
    hint: ui.victoryDarkLogoHint,
    variant: "dark",
    previewClass: "bg-black"
  }
];

export function TeamForm({ team, onSubmit, onCancel }: TeamFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [lightColorEnabled, setLightColorEnabled] = useState(false);
  const [darkColorEnabled, setDarkColorEnabled] = useState(false);
  const [victoryColorEnabled, setVictoryColorEnabled] = useState(false);
  const [victoryLightColorEnabled, setVictoryLightColorEnabled] = useState(false);
  const [victoryDarkColorEnabled, setVictoryDarkColorEnabled] = useState(false);

  useEffect(() => {
    setLightColorEnabled(Boolean(optionalColor(team?.primaryColorLight) || optionalColor(team?.bracketAccentColorLight) || optionalColor(team?.textColorLight)));
    setDarkColorEnabled(Boolean(optionalColor(team?.primaryColorDark) || optionalColor(team?.bracketAccentColorDark) || optionalColor(team?.textColorDark)));
    setVictoryColorEnabled(
      Boolean(
        team?.victoryColorEnabled &&
          (optionalColor(team?.victoryColor) ||
            optionalColor(team?.victoryColorLight) ||
            optionalColor(team?.victoryColorDark) ||
            optionalColor(team?.victoryAccentColor) ||
            optionalColor(team?.victoryAccentColorLight) ||
            optionalColor(team?.victoryAccentColorDark) ||
            optionalColor(team?.victoryTextColor) ||
            optionalColor(team?.victoryTextColorLight) ||
            optionalColor(team?.victoryTextColorDark))
      )
    );
    setVictoryLightColorEnabled(
      Boolean(
        optionalColor(team?.victoryColorLight) ||
          optionalColor(team?.victoryAccentColorLight) ||
          optionalColor(team?.victoryTextColorLight)
      )
    );
    setVictoryDarkColorEnabled(
      Boolean(
        optionalColor(team?.victoryColorDark) ||
          optionalColor(team?.victoryAccentColorDark) ||
          optionalColor(team?.victoryTextColorDark)
      )
    );
    setForm(
      team
        ? {
            name: team.name,
            shortName: team.shortName ?? "",
            logoDefault: team.logoDefault ?? "",
            logoLight: team.logoLight ?? "",
            logoDark: team.logoDark ?? "",
            logoVictory: team.logoVictory ?? "",
            logoVictoryLight: team.logoVictoryLight ?? "",
            logoVictoryDark: team.logoVictoryDark ?? "",
            logoDefaultName: team.logoDefaultName ?? "",
            logoLightName: team.logoLightName ?? "",
            logoDarkName: team.logoDarkName ?? "",
            logoVictoryName: team.logoVictoryName ?? "",
            logoVictoryLightName: team.logoVictoryLightName ?? "",
            logoVictoryDarkName: team.logoVictoryDarkName ?? "",
            primaryColor: normalizeColor(team.primaryColor, defaultPrimary),
            bracketAccentColor: optionalColor(team.bracketAccentColor) ?? "",
            bracketAccentColorLight: optionalColor(team.bracketAccentColorLight) ?? "",
            bracketAccentColorDark: optionalColor(team.bracketAccentColorDark) ?? "",
            victoryColor: optionalColor(team.victoryColor) ?? "",
            victoryColorLight: optionalColor(team.victoryColorLight) ?? "",
            victoryColorDark: optionalColor(team.victoryColorDark) ?? "",
            victoryAccentColor: optionalColor(team.victoryAccentColor) ?? "",
            victoryAccentColorLight: optionalColor(team.victoryAccentColorLight) ?? "",
            victoryAccentColorDark: optionalColor(team.victoryAccentColorDark) ?? "",
            victoryColorEnabled: Boolean(team.victoryColorEnabled),
            victoryTextColor: optionalColor(team.victoryTextColor) ?? "",
            victoryTextColorLight: optionalColor(team.victoryTextColorLight) ?? "",
            victoryTextColorDark: optionalColor(team.victoryTextColorDark) ?? "",
            primaryColorLight: optionalColor(team.primaryColorLight) ?? "",
            primaryColorDark: optionalColor(team.primaryColorDark) ?? "",
            textColor: optionalColor(team.textColor) ?? "",
            textColorLight: optionalColor(team.textColorLight) ?? "",
            textColorDark: optionalColor(team.textColorDark) ?? "",
            note: team.note ?? ""
          }
        : emptyForm
    );
  }, [team]);

  const previewTeam = useMemo<Team>(
    () => ({
      id: team?.id ?? "preview",
      name: form.name || "New Team",
      shortName: form.shortName || undefined,
      logoDefault: form.logoDefault || undefined,
      logoLight: form.logoLight || undefined,
      logoDark: form.logoDark || undefined,
      logoVictory: form.logoVictory || undefined,
      logoVictoryLight: form.logoVictoryLight || undefined,
      logoVictoryDark: form.logoVictoryDark || undefined,
      logoDefaultName: form.logoDefaultName || undefined,
      logoLightName: form.logoLightName || undefined,
      logoDarkName: form.logoDarkName || undefined,
      logoVictoryName: form.logoVictoryName || undefined,
      logoVictoryLightName: form.logoVictoryLightName || undefined,
      logoVictoryDarkName: form.logoVictoryDarkName || undefined,
      primaryColor: normalizeColor(form.primaryColor, defaultPrimary),
      bracketAccentColor: optionalColor(form.bracketAccentColor),
      bracketAccentColorLight: lightColorEnabled ? optionalColor(form.bracketAccentColorLight) : undefined,
      bracketAccentColorDark: darkColorEnabled ? optionalColor(form.bracketAccentColorDark) : undefined,
      victoryColor: victoryColorEnabled ? optionalColor(form.victoryColor) : undefined,
      victoryColorLight: victoryColorEnabled && victoryLightColorEnabled ? optionalColor(form.victoryColorLight) : undefined,
      victoryColorDark: victoryColorEnabled && victoryDarkColorEnabled ? optionalColor(form.victoryColorDark) : undefined,
      victoryAccentColor: victoryColorEnabled ? optionalColor(form.victoryAccentColor) : undefined,
      victoryAccentColorLight: victoryColorEnabled && victoryLightColorEnabled ? optionalColor(form.victoryAccentColorLight) : undefined,
      victoryAccentColorDark: victoryColorEnabled && victoryDarkColorEnabled ? optionalColor(form.victoryAccentColorDark) : undefined,
      victoryColorEnabled,
      victoryTextColor: victoryColorEnabled ? optionalColor(form.victoryTextColor) : undefined,
      victoryTextColorLight: victoryColorEnabled && victoryLightColorEnabled ? optionalColor(form.victoryTextColorLight) : undefined,
      victoryTextColorDark: victoryColorEnabled && victoryDarkColorEnabled ? optionalColor(form.victoryTextColorDark) : undefined,
      primaryColorLight: lightColorEnabled ? optionalColor(form.primaryColorLight) : undefined,
      primaryColorDark: darkColorEnabled ? optionalColor(form.primaryColorDark) : undefined,
      textColor: optionalColor(form.textColor),
      textColorLight: lightColorEnabled ? optionalColor(form.textColorLight) : undefined,
      textColorDark: darkColorEnabled ? optionalColor(form.textColorDark) : undefined
    }),
    [darkColorEnabled, form, lightColorEnabled, team?.id, victoryColorEnabled, victoryDarkColorEnabled, victoryLightColorEnabled]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;

    onSubmit({
      id: team?.id,
      name: form.name.trim(),
      shortName: optional(form.shortName),
      logoDefault: optional(form.logoDefault),
      logoLight: optional(form.logoLight),
      logoDark: optional(form.logoDark),
      logoVictory: optional(form.logoVictory),
      logoVictoryLight: optional(form.logoVictoryLight),
      logoVictoryDark: optional(form.logoVictoryDark),
      logoDefaultName: optional(form.logoDefaultName),
      logoLightName: optional(form.logoLightName),
      logoDarkName: optional(form.logoDarkName),
      logoVictoryName: optional(form.logoVictoryName),
      logoVictoryLightName: optional(form.logoVictoryLightName),
      logoVictoryDarkName: optional(form.logoVictoryDarkName),
      primaryColor: optional(normalizeColor(form.primaryColor, defaultPrimary)),
      secondaryColor: undefined,
      bracketAccentColor: optionalColor(form.bracketAccentColor),
      bracketAccentColorLight: lightColorEnabled ? optionalColor(form.bracketAccentColorLight) : undefined,
      bracketAccentColorDark: darkColorEnabled ? optionalColor(form.bracketAccentColorDark) : undefined,
      victoryColor: victoryColorEnabled ? optionalColor(form.victoryColor) : undefined,
      victoryColorLight: victoryColorEnabled && victoryLightColorEnabled ? optionalColor(form.victoryColorLight) : undefined,
      victoryColorDark: victoryColorEnabled && victoryDarkColorEnabled ? optionalColor(form.victoryColorDark) : undefined,
      victoryAccentColor: victoryColorEnabled ? optionalColor(form.victoryAccentColor) : undefined,
      victoryAccentColorLight: victoryColorEnabled && victoryLightColorEnabled ? optionalColor(form.victoryAccentColorLight) : undefined,
      victoryAccentColorDark: victoryColorEnabled && victoryDarkColorEnabled ? optionalColor(form.victoryAccentColorDark) : undefined,
      victoryColorEnabled,
      victoryTextColor: victoryColorEnabled ? optionalColor(form.victoryTextColor) : undefined,
      victoryTextColorLight: victoryColorEnabled && victoryLightColorEnabled ? optionalColor(form.victoryTextColorLight) : undefined,
      victoryTextColorDark: victoryColorEnabled && victoryDarkColorEnabled ? optionalColor(form.victoryTextColorDark) : undefined,
      primaryColorLight: lightColorEnabled ? optionalColor(form.primaryColorLight) : undefined,
      secondaryColorLight: undefined,
      primaryColorDark: darkColorEnabled ? optionalColor(form.primaryColorDark) : undefined,
      secondaryColorDark: undefined,
      textColor: optionalColor(form.textColor),
      textColorLight: lightColorEnabled ? optionalColor(form.textColorLight) : undefined,
      textColorDark: darkColorEnabled ? optionalColor(form.textColorDark) : undefined,
      note: optional(form.note)
    });
  }

  async function handleLogoChange(field: LogoField, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const logoDataUrl = await compressLogoFile(file);
    const logoRef = await storeLogoDataUrl(logoDataUrl);
    setForm((current) => ({ ...current, [field]: logoRef, [logoNameFieldByLogoField[field]]: file.name }));
    event.target.value = "";
  }

  function clearLogo(field: LogoField) {
    void removeStoredLogo(form[field]);
    setForm({ ...form, [field]: "", [logoNameFieldByLogoField[field]]: "" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="grid content-start items-start gap-3 md:grid-cols-2 xl:grid-cols-1">
          {logoFields.map((item) => {
            const logoPreview = getLogoPreviewConfig(previewTeam, item.field);
            const showBracketPreview = item.field !== "logoDefault" && item.field !== "logoVictory";
            return (
              <div key={item.field} className="rounded-md border border-line bg-arena/55 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-ink">{item.title}</div>
                    <div className="text-xs font-semibold text-muted">{item.hint}</div>
                  </div>
                  {form[item.field] ? (
                    <button
                      type="button"
                      className="icon-button h-8 w-8"
                      onClick={() => clearLogo(item.field)}
                      title={`${item.title} ${ui.remove}`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <div
                  className={clsx("mb-4 flex flex-col items-center gap-3 rounded-md px-3 py-5", item.previewClass)}
                  style={isVictoryLogoField(item.field) ? { background: getVictoryPreviewBackground(logoPreview.team) } : undefined}
                >
                  <TeamLogo
                    team={logoPreview.team}
                    size="lg"
                    variant={item.variant}
                    highlighted={isVictoryLogoField(item.field)}
                    useVictoryLogo={isVictoryLogoField(item.field)}
                  />
                  {showBracketPreview ? (
                    <div className="w-full max-w-sm">
                      <LogoBracketPreview team={logoPreview.team} surface={logoPreview.surface} field={item.field} />
                    </div>
                  ) : null}
                </div>
                <label className="button-muted w-full cursor-pointer justify-center">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {ui.chooseImage}
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleLogoChange(item.field, event)} />
                </label>
                {form[logoNameFieldByLogoField[item.field]] ? (
                  <p className="mt-2 truncate text-center text-xs font-semibold text-muted" title={form[logoNameFieldByLogoField[item.field]]}>
                    {form[logoNameFieldByLogoField[item.field]]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-line bg-arena/55 p-4">
            <p className="section-kicker mb-3">{ui.teamInfo}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label={ui.teamName} value={form.name} onChange={(name) => setForm({ ...form, name })} />
              <TextField label={ui.shortName} value={form.shortName} maxLength={8} onChange={(shortName) => setForm({ ...form, shortName })} />
            </div>
          </div>

          <div className="rounded-md border border-line bg-arena/55 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="section-kicker">{ui.colors}</p>
              <span className="rounded border border-line bg-field px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                {ui.singleColor}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-line bg-field/65 p-3">
                <div className="mb-3">
                  <div className="text-sm font-black text-ink">{ui.bracketAccentColor}</div>
                  <div className="text-xs font-semibold text-muted">{ui.bracketAccentHint}</div>
                </div>
                <ColorField
                  label={ui.bracketAccentColor}
                  value={form.bracketAccentColor}
                  fallback={defaultPrimary}
                  optional
                  hideLabel
                  onChange={(bracketAccentColor) => setForm({ ...form, bracketAccentColor })}
                />
              </div>
              <div className="rounded-md border border-line bg-field/65 p-3">
                <div className="mb-3">
                  <div className="text-sm font-black text-ink">{ui.textColorDefault}</div>
                  <div className="text-xs font-semibold text-muted">{ui.textColorHint}</div>
                </div>
                <ColorField
                  label={ui.textColorDefault}
                  value={form.textColor}
                  fallback="#ffffff"
                  optional
                  hideLabel
                  onChange={(textColor) => setForm({ ...form, textColor })}
                />
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className={clsx("rounded-md border border-line bg-field/65 p-3", !victoryColorEnabled && "opacity-80")}>
                <div className="mb-3 flex min-h-7 items-center justify-between gap-2">
                  <span className="text-sm font-black text-ink">{ui.victoryColor}</span>
                  <label className="inline-flex items-center gap-2 rounded border border-line bg-panel px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                    <input
                      type="checkbox"
                      checked={victoryColorEnabled}
                      onChange={(event) => {
                        const enabled = event.target.checked;
                        setVictoryColorEnabled(enabled);
                        setForm((current) => ({
                          ...current,
                          victoryColorEnabled: enabled,
                          victoryColor: enabled
                            ? current.victoryColor || current.bracketAccentColor || defaultPrimary
                            : "",
                          victoryAccentColor: enabled
                            ? current.victoryAccentColor || current.bracketAccentColor || defaultPrimary
                            : "",
                          victoryTextColor: enabled ? current.victoryTextColor || current.textColor : "",
                          victoryColorLight: enabled ? current.victoryColorLight : "",
                          victoryColorDark: enabled ? current.victoryColorDark : "",
                          victoryAccentColorLight: enabled ? current.victoryAccentColorLight : "",
                          victoryAccentColorDark: enabled ? current.victoryAccentColorDark : "",
                          victoryTextColorLight: enabled ? current.victoryTextColorLight : "",
                          victoryTextColorDark: enabled ? current.victoryTextColorDark : ""
                        }));
                        if (!enabled) {
                          setVictoryLightColorEnabled(false);
                          setVictoryDarkColorEnabled(false);
                        }
                      }}
                      className="h-4 w-4 accent-cyan"
                    />
                    {ui.enableVictoryColor}
                  </label>
                </div>
                <ColorField
                  label={ui.victoryColor}
                  value={form.victoryColor}
                  fallback={form.bracketAccentColor || defaultPrimary}
                  optional
                  disabled={!victoryColorEnabled}
                  hideLabel
                  onChange={(victoryColor) => setForm({ ...form, victoryColor })}
                />
                <div className="mt-3">
                  <ColorField
                    label={ui.victoryAccentColor}
                    value={form.victoryAccentColor}
                    fallback={form.bracketAccentColor || defaultPrimary}
                    optional
                    disabled={!victoryColorEnabled}
                    onChange={(victoryAccentColor) => setForm({ ...form, victoryAccentColor })}
                  />
                </div>
                <div className="mt-3">
                  <ColorField
                    label={ui.victoryTextColor}
                    value={form.victoryTextColor}
                    fallback="#ffffff"
                    optional
                    disabled={!victoryColorEnabled}
                    onChange={(victoryTextColor) => setForm({ ...form, victoryTextColor })}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-3">
                <ThemeColorPanel
                  title={ui.lightModeColor}
                  enableLabel={ui.enableLightColor}
                  enabled={lightColorEnabled}
                  previewClass="bg-white"
                  primaryValue={form.bracketAccentColorLight}
                  primaryFallback={form.bracketAccentColor || defaultPrimary}
                  accentValue={form.bracketAccentColorLight}
                  accentFallback={form.bracketAccentColor || defaultPrimary}
                  textValue={form.textColorLight}
                  textFallback={form.textColor || "#111827"}
                  onToggle={(enabled) => {
                    setLightColorEnabled(enabled);
                    setForm((current) => ({
                      ...current,
                      primaryColorLight: "",
                      bracketAccentColorLight: enabled ? current.bracketAccentColorLight || current.bracketAccentColor || defaultPrimary : "",
                      textColorLight: enabled ? current.textColorLight || current.textColor : ""
                    }));
                  }}
                  onAccentChange={(bracketAccentColorLight) => setForm({ ...form, bracketAccentColorLight })}
                  onTextChange={(textColorLight) => setForm({ ...form, textColorLight })}
                />
                {victoryColorEnabled ? (
                  <ThemeColorPanel
                    title={ui.victoryLightModeColor}
                    enableLabel={ui.enableVictoryLightColor}
                    enabled={victoryLightColorEnabled}
                    previewClass="bg-white"
                    hidePreview
                    primaryValue={form.victoryColorLight}
                    primaryFallback={form.victoryColor || form.bracketAccentColor || defaultPrimary}
                    primaryLabel={ui.victoryBackgroundColor}
                    accentValue={form.victoryAccentColorLight}
                    accentFallback={form.victoryAccentColor || form.bracketAccentColor || defaultPrimary}
                    textValue={form.victoryTextColorLight}
                    textFallback={form.victoryTextColor || form.textColor || "#111827"}
                    onToggle={(enabled) => {
                      setVictoryLightColorEnabled(enabled);
                      setForm((current) => ({
                        ...current,
                        victoryColorLight: enabled ? current.victoryColorLight || current.victoryColor || current.bracketAccentColor || defaultPrimary : "",
                        victoryAccentColorLight: enabled
                          ? current.victoryAccentColorLight || current.victoryAccentColor || current.bracketAccentColor || defaultPrimary
                          : "",
                        victoryTextColorLight: enabled ? current.victoryTextColorLight || current.victoryTextColor || current.textColor : ""
                      }));
                    }}
                    onPrimaryChange={(victoryColorLight) => setForm({ ...form, victoryColorLight })}
                    onAccentChange={(victoryAccentColorLight) => setForm({ ...form, victoryAccentColorLight })}
                    onTextChange={(victoryTextColorLight) => setForm({ ...form, victoryTextColorLight })}
                  />
                ) : null}
              </div>
              <div className="space-y-3">
                <ThemeColorPanel
                  title={ui.darkModeColor}
                  enableLabel={ui.enableDarkColor}
                  enabled={darkColorEnabled}
                  previewClass="bg-black"
                  primaryValue={form.bracketAccentColorDark}
                  primaryFallback={form.bracketAccentColor || defaultPrimary}
                  accentValue={form.bracketAccentColorDark}
                  accentFallback={form.bracketAccentColor || defaultPrimary}
                  textValue={form.textColorDark}
                  textFallback={form.textColor || "#ffffff"}
                  onToggle={(enabled) => {
                    setDarkColorEnabled(enabled);
                    setForm((current) => ({
                      ...current,
                      primaryColorDark: "",
                      bracketAccentColorDark: enabled ? current.bracketAccentColorDark || current.bracketAccentColor || defaultPrimary : "",
                      textColorDark: enabled ? current.textColorDark || current.textColor : ""
                    }));
                  }}
                  onAccentChange={(bracketAccentColorDark) => setForm({ ...form, bracketAccentColorDark })}
                  onTextChange={(textColorDark) => setForm({ ...form, textColorDark })}
                />
                {victoryColorEnabled ? (
                  <ThemeColorPanel
                    title={ui.victoryDarkModeColor}
                    enableLabel={ui.enableVictoryDarkColor}
                    enabled={victoryDarkColorEnabled}
                    previewClass="bg-black"
                    hidePreview
                    primaryValue={form.victoryColorDark}
                    primaryFallback={form.victoryColor || form.bracketAccentColor || defaultPrimary}
                    primaryLabel={ui.victoryBackgroundColor}
                    accentValue={form.victoryAccentColorDark}
                    accentFallback={form.victoryAccentColor || form.bracketAccentColor || defaultPrimary}
                    textValue={form.victoryTextColorDark}
                    textFallback={form.victoryTextColor || form.textColor || "#ffffff"}
                    onToggle={(enabled) => {
                      setVictoryDarkColorEnabled(enabled);
                      setForm((current) => ({
                        ...current,
                        victoryColorDark: enabled ? current.victoryColorDark || current.victoryColor || current.bracketAccentColor || defaultPrimary : "",
                        victoryAccentColorDark: enabled
                          ? current.victoryAccentColorDark || current.victoryAccentColor || current.bracketAccentColor || defaultPrimary
                          : "",
                        victoryTextColorDark: enabled ? current.victoryTextColorDark || current.victoryTextColor || current.textColor : ""
                      }));
                    }}
                    onPrimaryChange={(victoryColorDark) => setForm({ ...form, victoryColorDark })}
                    onAccentChange={(victoryAccentColorDark) => setForm({ ...form, victoryAccentColorDark })}
                    onTextChange={(victoryTextColorDark) => setForm({ ...form, victoryTextColorDark })}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <label className="block space-y-1.5 rounded-md border border-line bg-arena/55 p-4">
            <span className="text-sm font-bold text-ink">{ui.memo}</span>
            <textarea
              className="input h-24 py-2"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              placeholder={ui.memoPlaceholder}
            />
          </label>

        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="button-primary" type="submit">
          <Save className="h-4 w-4" aria-hidden="true" />
          {team ? ui.saveEdit : ui.addTeam}
        </button>
        {onCancel ? (
          <button type="button" className="button-muted" onClick={onCancel}>
            {ui.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ThemeColorPanel({
  title,
  enableLabel,
  enabled,
  previewClass,
  hidePreview,
  primaryValue,
  primaryFallback,
  primaryLabel,
  accentValue,
  accentFallback,
  textValue,
  textFallback,
  onToggle,
  onPrimaryChange,
  onAccentChange,
  onTextChange
}: {
  title: string;
  enableLabel: string;
  enabled: boolean;
  previewClass: string;
  hidePreview?: boolean;
  primaryValue: string;
  primaryFallback: string;
  primaryLabel?: string;
  accentValue: string;
  accentFallback: string;
  textValue: string;
  textFallback: string;
  onToggle: (enabled: boolean) => void;
  onPrimaryChange?: (value: string) => void;
  onAccentChange: (value: string) => void;
  onTextChange: (value: string) => void;
}) {
  const primary = normalizeColor(primaryValue, primaryFallback);
  const accent = normalizeColor(accentValue, accentFallback);
  const text = normalizeColor(textValue, textFallback);

  return (
    <div className={clsx("rounded-md border border-line bg-field/65 p-3", !enabled && "opacity-70")}>
      <div className="mb-3 flex min-h-7 items-center justify-between gap-2">
        <span className="text-sm font-black text-ink">{title}</span>
        <label className="inline-flex items-center gap-2 rounded border border-line bg-panel px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
            className="h-4 w-4 accent-cyan"
          />
          {enableLabel}
        </label>
      </div>
      {hidePreview ? null : (
      <div className={clsx("mb-3 rounded border border-line p-2", previewClass)}>
          <div
            className="h-6 rounded border"
            style={{
              background: primary,
              borderColor: accent,
              boxShadow: `inset 5px 0 0 ${accent}`,
              color: text
            }}
          />
      </div>
      )}
      {primaryLabel && onPrimaryChange ? (
        <div>
          <ColorField
            label={primaryLabel}
            value={primaryValue}
            fallback={primaryFallback}
            optional
            disabled={!enabled}
            onChange={onPrimaryChange}
          />
        </div>
      ) : null}
      <div className={clsx(primaryLabel && "mt-3")}>
        <ColorField
          label={ui.bracketAccentColor}
          value={accentValue}
          fallback={accentFallback}
          optional
          disabled={!enabled}
          onChange={onAccentChange}
        />
      </div>
      <div className="mt-3">
        <ColorField
          label={ui.textColor}
          value={textValue}
          fallback={textFallback}
          optional
          disabled={!enabled}
          onChange={onTextChange}
        />
      </div>
    </div>
  );
}

/*
function ModeColorPreview({ team }: { team: Team }) {
  void VictoryColorPreview;

  return (
    <div className="mt-3 rounded-md border border-line bg-field/65 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black text-ink">Bracket color preview</div>
          <div className="text-xs font-semibold text-muted">Base, light, and dark normal/winner states</div>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <ModeStatePreviewPair team={team} surface="base" />
        <ModeStatePreviewPair team={getModePreviewTeam(team, "light")} surface="light" />
        <ModeStatePreviewPair team={getModePreviewTeam(team, "dark")} surface="dark" />
      </div>
    </div>
  );
}

function VictoryColorPreview({ team }: { team: Team }) {
  return (
    <div className="mt-3 rounded-md border border-line bg-field/65 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black text-ink">승리 색상 미리보기</div>
          <div className="text-xs font-semibold text-muted">배경, 포인트, 글씨 색상을 브래킷 기준으로 확인</div>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <VictorySampleCard team={team} surface="base" title="기본" />
        <VictorySampleCard team={getModePreviewTeam(team, "light")} surface="light" title="라이트" />
        <VictorySampleCard team={getModePreviewTeam(team, "dark")} surface="dark" title="다크" />
      </div>
    </div>
  );
}

void ModeColorPreview;
*/

function LogoBracketPreview({
  team,
  surface,
  field
}: {
  team: Team;
  surface: "base" | "light" | "dark";
  field: LogoField;
}) {
  if (field === "logoDefault" || field === "logoVictory") return null;

  if (isVictoryLogoField(field)) {
    return <VictorySampleCard team={team} surface={surface} compact />;
  }

  return <NormalSampleCard team={team} surface={surface} compact />;
}

function NormalSampleCard({
  team,
  surface,
  title,
  compact
}: {
  team: Team;
  surface: "base" | "light" | "dark";
  title?: string;
  compact?: boolean;
}) {
  const surfaceClass =
    surface === "light"
      ? "bg-white text-slate-950"
      : surface === "dark"
        ? "bg-black text-white"
        : "bg-arena text-ink";
  const innerClass =
    surface === "light"
      ? "border-slate-300 bg-white text-slate-950"
      : surface === "dark"
        ? "border-slate-700 bg-slate-950 text-white"
        : "border-line bg-panel/80 text-ink";
  const scoreClass =
    surface === "light"
      ? "border-slate-300 text-slate-950"
      : surface === "dark"
        ? "border-slate-700 text-white"
        : "border-line text-ink";
  const label = team.shortName || team.name || "TEAM";
  const point = getTeamBracketAccentColor(team) ?? defaultPrimary;
  const text = getTeamThemeTextColor(team);
  const textStyle = text ? { color: text } : undefined;

  return (
    <div className={clsx("rounded border border-line p-2", surfaceClass)}>
      {title ? <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] opacity-70">{title}</div> : null}
      <div
        className={clsx("grid overflow-hidden border", innerClass, compact ? "h-10 grid-cols-[1fr_36px]" : "h-12 grid-cols-[1fr_42px]")}
        style={{
          borderColor: point,
          boxShadow: `inset 5px 0 0 ${point}`
        }}
      >
        <div className="flex min-w-0 items-center gap-2 py-0 pl-3 pr-2">
          <TeamLogo team={team} size="sm" variant={surface === "base" ? "default" : surface} />
          <div className="min-w-0">
            <div className="truncate text-xs font-black uppercase tracking-wide" style={textStyle}>{label}</div>
            {!compact && team.shortName ? <div className="truncate text-[10px] font-bold opacity-75" style={textStyle}>{team.name}</div> : null}
          </div>
        </div>
        <div className={clsx("grid place-items-center border-l text-sm font-black", scoreClass)}>
          1
        </div>
      </div>
    </div>
  );
}

function VictorySampleCard({
  team,
  surface,
  title,
  compact
}: {
  team: Team;
  surface: "base" | "light" | "dark";
  title?: string;
  compact?: boolean;
}) {
  const primary = getTeamWinnerColor(team) ?? normalizeColor(team.primaryColor, defaultPrimary);
  const point = getTeamWinnerAccentColor(team) ?? primary;
  const scoreText = getTeamReadableScoreTextColor(team);
  const text = getTeamVictoryTextColor(team) ?? scoreText;
  const surfaceClass =
    surface === "light"
      ? "bg-white text-slate-950"
      : surface === "dark"
        ? "bg-black text-white"
        : "bg-arena text-ink";
  const label = team.shortName || team.name || "TEAM";

  return (
    <div className={clsx("rounded border border-line p-2", surfaceClass)}>
      {title ? <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] opacity-70">{title}</div> : null}
      <div
        className={clsx("grid overflow-hidden border", compact ? "h-10 grid-cols-[1fr_36px]" : "h-12 grid-cols-[1fr_42px]")}
        style={{
          borderColor: point,
          background: primary,
          boxShadow: `0 0 18px ${mix(primary, 42)}, inset 5px 0 0 ${point}`
        }}
      >
        <div className="flex min-w-0 items-center gap-2 px-2" style={{ color: text }}>
          <TeamLogo team={team} size="sm" highlighted useVictoryLogo variant={surface === "base" ? "default" : surface} />
          <div className="min-w-0">
            <div className="truncate text-xs font-black uppercase tracking-wide">{label}</div>
            {!compact && team.shortName ? <div className="truncate text-[10px] font-bold">{team.name}</div> : null}
          </div>
        </div>
        <div className="grid place-items-center text-sm font-black" style={{ background: primary, color: scoreText }}>
          3
        </div>
      </div>
    </div>
  );
}

function getModePreviewTeam(team: Team, mode: "light" | "dark"): Team {
  const pickPreviewColor = (...values: Array<string | undefined>) => values.find((value) => Boolean(value?.trim()));

  if (mode === "light") {
    return {
      ...team,
      primaryColor: pickPreviewColor(team.primaryColorLight, team.primaryColor),
      bracketAccentColor: pickPreviewColor(team.bracketAccentColorLight, team.bracketAccentColor),
      textColor: pickPreviewColor(team.textColorLight, team.textColor),
      victoryColor: pickPreviewColor(team.victoryColorLight, team.victoryColor),
      victoryAccentColor: pickPreviewColor(team.victoryAccentColorLight, team.victoryAccentColor),
      victoryTextColor: pickPreviewColor(team.victoryTextColorLight, team.victoryTextColor),
      primaryColorLight: undefined,
      primaryColorDark: undefined,
      bracketAccentColorLight: undefined,
      bracketAccentColorDark: undefined,
      textColorLight: undefined,
      textColorDark: undefined,
      victoryColorLight: undefined,
      victoryColorDark: undefined,
      victoryAccentColorLight: undefined,
      victoryAccentColorDark: undefined,
      victoryTextColorLight: undefined,
      victoryTextColorDark: undefined
    };
  }

  return {
    ...team,
    primaryColor: pickPreviewColor(team.primaryColorDark, team.primaryColor),
    bracketAccentColor: pickPreviewColor(team.bracketAccentColorDark, team.bracketAccentColor),
    textColor: pickPreviewColor(team.textColorDark, team.textColor),
    victoryColor: pickPreviewColor(team.victoryColorDark, team.victoryColor),
    victoryAccentColor: pickPreviewColor(team.victoryAccentColorDark, team.victoryAccentColor),
    victoryTextColor: pickPreviewColor(team.victoryTextColorDark, team.victoryTextColor),
    primaryColorLight: undefined,
    primaryColorDark: undefined,
    bracketAccentColorLight: undefined,
    bracketAccentColorDark: undefined,
    textColorLight: undefined,
    textColorDark: undefined,
    victoryColorLight: undefined,
    victoryColorDark: undefined,
    victoryAccentColorLight: undefined,
    victoryAccentColorDark: undefined,
    victoryTextColorLight: undefined,
    victoryTextColorDark: undefined
  };
}

function getLogoPreviewConfig(team: Team, field: LogoField): { team: Team; surface: "base" | "light" | "dark" } {
  if (field === "logoVictory") {
    return { team: getBaseVictoryPreviewTeam(team), surface: "base" };
  }
  if (field === "logoLight" || field === "logoVictoryLight") {
    return { team: getModePreviewTeam(team, "light"), surface: "light" };
  }
  if (field === "logoDark" || field === "logoVictoryDark") {
    return { team: getModePreviewTeam(team, "dark"), surface: "dark" };
  }
  return { team, surface: "base" };
}

function getBaseVictoryPreviewTeam(team: Team): Team {
  return {
    ...team,
    primaryColorLight: undefined,
    primaryColorDark: undefined,
    bracketAccentColorLight: undefined,
    bracketAccentColorDark: undefined,
    textColorLight: undefined,
    textColorDark: undefined,
    victoryColorLight: undefined,
    victoryColorDark: undefined,
    victoryAccentColorLight: undefined,
    victoryAccentColorDark: undefined,
    victoryTextColorLight: undefined,
    victoryTextColorDark: undefined
  };
}

function getVictoryPreviewBackground(team: Team) {
  return normalizeColor(getTeamWinnerColor(team) ?? getTeamBracketAccentColor(team), defaultPrimary);
}

function isVictoryLogoField(field: LogoField) {
  return field === "logoVictory" || field === "logoVictoryLight" || field === "logoVictoryDark";
}

function TextField({
  label,
  value,
  maxLength,
  onChange
}: {
  label: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} className="input" />
    </label>
  );
}

function ColorField({
  label,
  value,
  fallback,
  optional,
  disabled,
  hideLabel,
  onChange
}: {
  label: string;
  value: string;
  fallback: string;
  optional?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  onChange: (value: string) => void;
}) {
  const fallbackColor = normalizeColor(fallback, "#000000");
  const colorValue = optional && !value.trim() ? fallbackColor : normalizeColor(value, fallbackColor);
  const eyeDropperSupported = typeof window !== "undefined" && "EyeDropper" in window;
  const fallbackPickerRef = useRef<HTMLInputElement>(null);

  async function pickColor() {
    if (disabled) return;
    const EyeDropperClass = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (!EyeDropperClass) {
      fallbackPickerRef.current?.click();
      return;
    }

    try {
      const result = await new EyeDropperClass().open();
      onChange(normalizeColor(result.sRGBHex, colorValue));
    } catch {
      // User cancelled the eyedropper.
    }
  }

  return (
    <label className={clsx("space-y-1.5", disabled && "opacity-45")}>
      {hideLabel ? null : <span className="text-sm font-bold text-ink">{label}</span>}
      <div className="flex gap-2">
        <input
          type="color"
          value={colorValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-10 w-12 rounded-md border border-line bg-field"
        />
        <input
          ref={fallbackPickerRef}
          type="color"
          value={colorValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <input
          value={value}
          onChange={(event) => onChange(prefixHex(event.target.value))}
          onBlur={(event) => {
            if (optional && !event.target.value.trim()) {
              onChange("");
              return;
            }
            onChange(normalizeColor(event.target.value, colorValue));
          }}
          disabled={disabled}
          className="input"
          placeholder={ui.invalidColor}
        />
        <button
          type="button"
          className="icon-button h-10 w-10"
          onClick={pickColor}
          disabled={disabled}
          title={eyeDropperSupported ? ui.eyedropper : `${ui.eyedropperUnsupported}. 색상 선택창을 엽니다.`}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </label>
  );
}

function prefixHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "#";
  if (trimmed.startsWith("#")) return trimmed;
  return `#${trimmed}`;
}

function normalizeColor(value: string | undefined, fallback: string): string {
  const prefixed = prefixHex(value ?? "");
  if (/^#[0-9a-fA-F]{6}$/.test(prefixed)) return prefixed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(prefixed)) {
    const [, r, g, b] = prefixed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function optionalColor(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const normalized = normalizeColor(value, "");
  return normalized || undefined;
}

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

function mix(color: string, amount: number) {
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid file data")));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

async function compressLogoFile(file: File): Promise<string> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const webp = renderLogoToWebp(image, maxLogoSize, 0.82);
  if (webp.length <= maxLogoDataUrlLength) return webp;
  const compactWebp = renderLogoToWebp(image, 160, 0.76);
  if (compactWebp.length <= maxLogoDataUrlLength || compactWebp.length < source.length) return compactWebp;
  return source.length <= maxLogoDataUrlLength ? source : compactWebp;
}

function renderLogoToWebp(image: HTMLImageElement, maxSize: number, quality: number): string {
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return image.src;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/webp", quality);
}
