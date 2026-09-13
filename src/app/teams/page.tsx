"use client";

import { DragEvent, MouseEvent, useMemo, useRef, useState } from "react";
import { Edit3, Folder, FolderPlus, Plus, Trash2, X } from "lucide-react";
import type { Team, TeamFolder } from "@/lib/core/models";
import { TeamForm } from "@/components/teams/TeamForm";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { useTeamStore } from "@/store/teamStore";

type TeamFormMode = "create" | "edit" | null;
type DragItem = { type: "team" | "folder"; id: string; itemId: string };
type DesktopItem =
  | { type: "team"; id: string; itemId: string; team: Team }
  | { type: "folder"; id: string; itemId: string; folder: TeamFolder };
type InsertTarget = { containerId: string; beforeItemId?: string } | null;
type SelectionBox = { active: boolean; startX: number; startY: number; currentX: number; currentY: number } | null;

const outsideFolderId = "folder-default";
const itemSizeClass = "h-40 w-[124px]";

const text = {
  kicker: "Team Desktop",
  title: "\uD300 \uBC14\uD0D5\uD654\uBA74",
  desc:
    "\uD3F4\uB354\uC640 \uD300\uC744 \uBC14\uD0D5\uD654\uBA74 \uC544\uC774\uCF58\uCC98\uB7FC \uAD00\uB9AC\uD569\uB2C8\uB2E4. \uC544\uC774\uCF58 \uC0AC\uC774\uC5D0 \uB193\uC73C\uBA74 \uADF8 \uC790\uB9AC\uB85C \uBC00\uB824\uB098\uACE0, \uD3F4\uB354 \uC544\uC774\uCF58 \uC704\uC5D0 \uB193\uC73C\uBA74 \uD3F4\uB354 \uC548\uC73C\uB85C \uB4E4\uC5B4\uAC11\uB2C8\uB2E4.",
  newTeam: "\uC0C8 \uD300",
  newFolder: "\uC0C8 \uD3F4\uB354",
  close: "\uB2EB\uAE30",
  desktop: "\uBC14\uD0D5\uD654\uBA74",
  createFolder: "\uC0C8 \uD3F4\uB354",
  emptyDesktop: "\uBC14\uD0D5\uD654\uBA74\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uC0C8 \uD300\uC774\uB098 \uD3F4\uB354\uB97C \uB9CC\uB4E4\uC5B4\uBCF4\uC138\uC694.",
  dropOut: "\uC5EC\uAE30\uC5D0 \uB193\uC73C\uBA74 \uBC14\uD0D5\uD654\uBA74\uC73C\uB85C \uAEBC\uB0B4\uAE30",
  emptyFolder: "\uC774 \uD3F4\uB354\uB294 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uC544\uC774\uCF58\uC744 \uC774 \uCC3D \uC548\uC73C\uB85C \uB4DC\uB86D\uD558\uC138\uC694.",
  editTeam: "\uD300 \uC218\uC815",
  addTeam: "\uC0C8 \uD300 \uCD94\uAC00",
  save: "\uC800\uC7A5",
  rename: "\uC774\uB984 \uBCC0\uACBD",
  remove: "\uC0AD\uC81C"
};

export default function TeamsPage() {
  const {
    teams,
    folders,
    addTeam,
    updateTeam,
    deleteTeam,
    addFolder,
    updateFolder,
    deleteFolder,
    moveTeamToFolder,
    moveFolderToFolder
  } = useTeamStore();
  const [editingTeam, setEditingTeam] = useState<Team | undefined>();
  const [formMode, setFormMode] = useState<TeamFormMode>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [openFolderId, setOpenFolderId] = useState<string>(outsideFolderId);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [insertTarget, setInsertTarget] = useState<InsertTarget>(null);
  const [dropIntoFolderId, setDropIntoFolderId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox>(null);
  const desktopRef = useRef<HTMLElement | null>(null);

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const foldersById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const currentFolder = foldersById.get(openFolderId) ?? foldersById.get(outsideFolderId);
  const currentItems = useMemo(
    () => resolveItems(currentFolder, teamsById, foldersById),
    [currentFolder, teamsById, foldersById]
  );
  const openPath = useMemo(() => buildPath(openFolderId, foldersById), [openFolderId, foldersById]);
  const isRoot = openFolderId === outsideFolderId;

  const createFolder = () => {
    const folderId = addFolder(text.newFolder, openFolderId);
    setEditingFolderId(folderId);
    setEditingFolderName(text.newFolder);
  };

  const openCreate = () => {
    setEditingTeam(undefined);
    setFormMode("create");
  };

  const openEdit = (team: Team) => {
    setEditingTeam({ ...team });
    setFormMode("edit");
  };

  const closeForm = () => {
    setEditingTeam(undefined);
    setFormMode(null);
  };

  const saveTeamForm = (teamInput: Omit<Team, "id" | "defaultSeed"> & { id?: string }) => {
    if (formMode === "edit" && editingTeam?.id) {
      const updatedTeam = { ...teamInput, id: editingTeam.id };
      updateTeam(editingTeam.id, updatedTeam);
      setEditingTeam(updatedTeam);
    } else {
      addTeam({ ...teamInput, id: undefined }, openFolderId);
    }
    closeForm();
  };

  const startFolderEdit = (folder: TeamFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const submitFolderEdit = (name = editingFolderName) => {
    if (!editingFolderId) return;
    updateFolder(editingFolderId, name);
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const handleDeleteTeam = (teamId: string) => {
    const team = teamsById.get(teamId);
    if (!team) return;
    const teamLabel = team.shortName && team.name ? `${team.shortName} (${team.name})` : team.shortName || team.name || "이 팀";
    const confirmed = window.confirm(
      `"${teamLabel}" 팀을 삭제할까요?\n\n삭제하면 팀 목록과 폴더에서 제거되며, 이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;
    deleteTeam(teamId);
    setSelectedItemIds((current) => {
      if (!current.has(`team:${teamId}`)) return current;
      const next = new Set(current);
      next.delete(`team:${teamId}`);
      return next;
    });
  };

  const getDraggedItem = (event?: DragEvent<HTMLElement>): DragItem | null => {
    if (dragItem) return dragItem;
    const itemId = event?.dataTransfer.getData("text/plain");
    if (!itemId) return null;
    if (itemId.startsWith("team:")) return { type: "team", id: itemId.slice("team:".length), itemId };
    if (itemId.startsWith("folder:")) return { type: "folder", id: itemId.slice("folder:".length), itemId };
    return null;
  };

  const moveItem = (targetFolderId: string, beforeItemId?: string, event?: DragEvent<HTMLElement>) => {
    const moving = getDraggedItem(event);
    if (!moving) return;
    const movingItems =
      selectedItemIds.has(moving.itemId) && selectedItemIds.size > 1
        ? currentItems.filter((item) => selectedItemIds.has(item.itemId))
        : [moving];

    for (const item of movingItems) {
      if (item.type === "team") {
        moveTeamToFolder(item.id, targetFolderId, beforeItemId);
      } else {
        moveFolderToFolder(item.id, targetFolderId, beforeItemId);
      }
    }
    clearDragUi();
  };

  const clearDragUi = () => {
    setDragItem(null);
    setInsertTarget(null);
    setDropIntoFolderId(null);
  };

  const getSelectionPoint = (event: MouseEvent<HTMLElement>) => {
    const rect = desktopRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const updateSelectionFromBox = (box: NonNullable<SelectionBox>) => {
    const desktopRect = desktopRef.current?.getBoundingClientRect();
    if (!desktopRect) return;
    const left = Math.min(box.startX, box.currentX);
    const right = Math.max(box.startX, box.currentX);
    const top = Math.min(box.startY, box.currentY);
    const bottom = Math.max(box.startY, box.currentY);
    const next = new Set<string>();

    desktopRef.current?.querySelectorAll<HTMLElement>("[data-desktop-item-id]").forEach((element) => {
      const rect = element.getBoundingClientRect();
      const itemLeft = rect.left - desktopRect.left;
      const itemRight = rect.right - desktopRect.left;
      const itemTop = rect.top - desktopRect.top;
      const itemBottom = rect.bottom - desktopRect.top;
      const intersects = itemRight >= left && itemLeft <= right && itemBottom >= top && itemTop <= bottom;
      if (intersects) {
        const itemId = element.dataset.desktopItemId;
        if (itemId) next.add(itemId);
      }
    });

    setSelectedItemIds(next);
  };

  const startBoxSelection = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-desktop-item='true'], button, input, a")) return;
    const point = getSelectionPoint(event);
    const box = { active: true, startX: point.x, startY: point.y, currentX: point.x, currentY: point.y };
    setSelectionBox(box);
    setSelectedItemIds(new Set());
  };

  const moveBoxSelection = (event: MouseEvent<HTMLElement>) => {
    if (!selectionBox?.active) return;
    const point = getSelectionPoint(event);
    const next = { ...selectionBox, currentX: point.x, currentY: point.y };
    setSelectionBox(next);
    updateSelectionFromBox(next);
  };

  const finishBoxSelection = () => {
    if (selectionBox?.active) {
      setSelectionBox(null);
    }
  };

  const selectItem = (itemId: string, event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, input")) return;
    event.stopPropagation();
    setSelectedItemIds((current) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        const next = new Set(current);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        return next;
      }
      if (current.has(itemId) && current.size > 1) {
        return current;
      }
      return new Set([itemId]);
    });
  };

  const handleDragStart = (item: DragItem) => {
    setDragItem(item);
    setSelectedItemIds((current) => (current.has(item.itemId) ? current : new Set([item.itemId])));
  };

  const handleWorkspaceDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if ((event.target as HTMLElement).closest("[data-desktop-item='true']")) return;
    moveItem(isRoot ? openFolderId : outsideFolderId, undefined, event);
  };

  return (
    <main className="w-full px-3 py-6 sm:px-4 2xl:px-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">{text.kicker}</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink">{text.title}</h1>
          <p className="mt-1 max-w-4xl text-sm text-muted">{text.desc}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {text.newTeam}
          </button>
          <button type="button" className="button-muted" onClick={createFolder}>
            <FolderPlus className="h-4 w-4" />
            {text.createFolder}
          </button>
        </div>
      </div>

      <section
        ref={desktopRef}
        className="relative min-h-[660px] overflow-hidden rounded border border-line bg-arena bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:34px_34px]"
        onMouseDown={startBoxSelection}
        onMouseMove={moveBoxSelection}
        onMouseUp={finishBoxSelection}
        onMouseLeave={finishBoxSelection}
        onDragOver={(event) => {
          event.preventDefault();
          if ((event.target as HTMLElement).closest("[data-desktop-item='true']")) return;
          if (isRoot) {
            setInsertTarget({ containerId: openFolderId });
            setDropIntoFolderId(null);
          } else {
            setInsertTarget(null);
            setDropIntoFolderId(outsideFolderId);
          }
        }}
        onDrop={handleWorkspaceDrop}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line/70 bg-field/75 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {openPath.map((folder, index) => (
              <button
                type="button"
                key={folder.id}
                className={`rounded border px-3 py-1.5 text-sm font-black uppercase tracking-wide transition ${
                  index === openPath.length - 1 ? "border-cyan bg-cyan/10 text-ink" : "border-line bg-panel text-muted hover:text-ink"
                }`}
                onClick={() => setOpenFolderId(folder.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropIntoFolderId(folder.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  moveItem(folder.id, undefined, event);
                }}
              >
                {folder.id === outsideFolderId ? text.desktop : folder.name}
              </button>
            ))}
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            {currentItems.length} items
          </p>
        </div>

        {!isRoot ? (
          <div
            className="m-4 rounded border border-dashed border-cyan bg-cyan/10 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-ink shadow-[0_0_18px_rgba(34,211,238,0.16)] transition hover:bg-cyan/15"
            onDragOver={(event) => {
              event.preventDefault();
              setDropIntoFolderId(outsideFolderId);
            }}
            onDrop={(event) => {
              event.preventDefault();
              moveItem(outsideFolderId, undefined, event);
            }}
          >
            {text.dropOut}
          </div>
        ) : null}

        <div className="p-5">
          <div className="grid auto-rows-[160px] grid-cols-[repeat(auto-fill,minmax(124px,1fr))] content-start gap-x-6 gap-y-7">
            {currentItems.map((item, index) => (
              <DesktopItemRenderer
                key={item.itemId}
                item={item}
                nextItemId={currentItems[index + 1]?.itemId}
                activeInsertBefore={insertTarget?.containerId === openFolderId && insertTarget.beforeItemId === item.itemId}
                dropIntoFolderId={dropIntoFolderId}
                dragItem={dragItem}
                editingFolderId={editingFolderId}
                editingFolderName={editingFolderName}
                setEditingFolderName={setEditingFolderName}
                onOpenFolder={(folderId) => setOpenFolderId(folderId)}
                onStartFolderEdit={startFolderEdit}
                onSubmitFolderEdit={submitFolderEdit}
                onCancelFolderEdit={() => setEditingFolderId(null)}
                onDeleteFolder={(folderId) => {
                  const folder = foldersById.get(folderId);
                  if (!folder || folderId === outsideFolderId) return;
                  const summary = getFolderDeleteSummary(folderId, foldersById);
                  const confirmed = window.confirm(
                    `"${folder.name}" 폴더를 삭제할까요?\n\n` +
                      `폴더 안의 팀 ${summary.teamCount}개와 하위 폴더 ${summary.folderCount}개가 함께 삭제됩니다.\n` +
                      "이 작업은 되돌릴 수 없습니다."
                  );
                  if (!confirmed) return;
                  if (openFolderId === folderId || isNestedFolder(openFolderId, folderId, foldersById)) {
                    setOpenFolderId(outsideFolderId);
                  }
                  deleteFolder(folderId);
                }}
                selected={selectedItemIds.has(item.itemId)}
                onSelect={(event) => selectItem(item.itemId, event)}
                onDragStart={handleDragStart}
                onDragEnd={clearDragUi}
                onInsertTarget={(beforeItemId) => {
                  setInsertTarget({ containerId: openFolderId, beforeItemId });
                  setDropIntoFolderId(null);
                }}
                onDropInsert={(beforeItemId, event) => moveItem(openFolderId, beforeItemId, event)}
                onDropIntoFolder={(folderId, event) => moveItem(folderId, undefined, event)}
                onHoverFolder={(folderId) => {
                  setDropIntoFolderId(folderId);
                  if (folderId) setInsertTarget(null);
                }}
                onEditTeam={openEdit}
                onDeleteTeam={handleDeleteTeam}
              />
            ))}
            {insertTarget?.containerId === openFolderId && !insertTarget.beforeItemId ? <DropSpacer /> : null}
          </div>
          {!currentItems.length ? (
            <div className="grid min-h-[420px] place-items-center text-center text-sm font-semibold text-muted">
              {isRoot ? text.emptyDesktop : text.emptyFolder}
            </div>
          ) : null}
        </div>
        {selectionBox?.active ? <SelectionMarquee box={selectionBox} /> : null}
      </section>

      {formMode ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
          <section className="mx-auto max-w-5xl arena-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">{formMode === "edit" ? "Edit Team" : "New Team"}</p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-wide text-ink">
                  {formMode === "edit" ? text.editTeam : text.addTeam}
                </h2>
              </div>
              <button type="button" className="icon-button h-10 w-10" onClick={closeForm} title={text.close}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <TeamForm
              key={formMode === "edit" ? editingTeam?.id ?? "edit-team" : "new-team"}
              team={editingTeam}
              onSubmit={saveTeamForm}
              onCancel={closeForm}
            />
          </section>
        </div>
      ) : null}
    </main>
  );
}

function DesktopItemRenderer({
  item,
  nextItemId,
  activeInsertBefore,
  selected,
  dropIntoFolderId,
  dragItem,
  editingFolderId,
  editingFolderName,
  setEditingFolderName,
  onOpenFolder,
  onStartFolderEdit,
  onSubmitFolderEdit,
  onCancelFolderEdit,
  onDeleteFolder,
  onDragStart,
  onDragEnd,
  onSelect,
  onInsertTarget,
  onDropInsert,
  onDropIntoFolder,
  onHoverFolder,
  onEditTeam,
  onDeleteTeam
}: {
  item: DesktopItem;
  nextItemId?: string;
  activeInsertBefore: boolean;
  selected: boolean;
  dropIntoFolderId: string | null;
  dragItem: DragItem | null;
  editingFolderId: string | null;
  editingFolderName: string;
  setEditingFolderName: (value: string) => void;
  onOpenFolder: (folderId: string) => void;
  onStartFolderEdit: (folder: TeamFolder) => void;
  onSubmitFolderEdit: () => void;
  onCancelFolderEdit: () => void;
  onDeleteFolder: (folderId: string) => void;
  onDragStart: (item: DragItem) => void;
  onDragEnd: () => void;
  onSelect: (event: MouseEvent<HTMLElement>) => void;
  onInsertTarget: (beforeItemId?: string) => void;
  onDropInsert: (beforeItemId: string | undefined, event: DragEvent<HTMLElement>) => void;
  onDropIntoFolder: (folderId: string, event: DragEvent<HTMLElement>) => void;
  onHoverFolder: (folderId: string | null) => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
}) {
  return (
    <>
      {activeInsertBefore ? <DropSpacer /> : null}
      {item.type === "folder" ? (
        <DesktopFolderIcon
          item={item}
          nextItemId={nextItemId}
          dragging={dragItem?.itemId === item.itemId}
          selected={selected}
          dropIntoActive={dropIntoFolderId === item.id}
          editing={editingFolderId === item.id}
          editingName={editingFolderName}
          setEditingName={setEditingFolderName}
          onOpen={() => onOpenFolder(item.id)}
          onStartEdit={() => onStartFolderEdit(item.folder)}
          onSubmitEdit={onSubmitFolderEdit}
          onCancelEdit={onCancelFolderEdit}
          onDelete={() => onDeleteFolder(item.id)}
          onDragStart={() => onDragStart({ type: "folder", id: item.id, itemId: item.itemId })}
          onDragEnd={onDragEnd}
          onSelect={onSelect}
          onInsertTarget={onInsertTarget}
          onDropInsert={onDropInsert}
          onDropIntoFolder={(event) => onDropIntoFolder(item.id, event)}
          onHoverFolder={() => onHoverFolder(item.id)}
        />
      ) : (
        <DesktopTeamIcon
          item={item}
          nextItemId={nextItemId}
          dragging={dragItem?.itemId === item.itemId}
          selected={selected}
          onDragStart={() => onDragStart({ type: "team", id: item.id, itemId: item.itemId })}
          onDragEnd={onDragEnd}
          onSelect={onSelect}
          onInsertTarget={onInsertTarget}
          onDropInsert={onDropInsert}
          onEdit={() => onEditTeam(item.team)}
          onDelete={() => onDeleteTeam(item.id)}
        />
      )}
    </>
  );
}

function DesktopFolderIcon({
  item,
  nextItemId,
  dragging,
  selected,
  dropIntoActive,
  editing,
  editingName,
  setEditingName,
  onOpen,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onSelect,
  onInsertTarget,
  onDropInsert,
  onDropIntoFolder,
  onHoverFolder
}: {
  item: Extract<DesktopItem, { type: "folder" }>;
  nextItemId?: string;
  dragging: boolean;
  selected: boolean;
  dropIntoActive: boolean;
  editing: boolean;
  editingName: string;
  setEditingName: (value: string) => void;
  onOpen: () => void;
  onStartEdit: () => void;
  onSubmitEdit: (name?: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSelect: (event: MouseEvent<HTMLElement>) => void;
  onInsertTarget: (beforeItemId?: string) => void;
  onDropInsert: (beforeItemId: string | undefined, event: DragEvent<HTMLElement>) => void;
  onDropIntoFolder: (event: DragEvent<HTMLElement>) => void;
  onHoverFolder: () => void;
}) {
  return (
    <div
      data-desktop-item="true"
      data-desktop-item-id={item.itemId}
      draggable={!editing}
      className={`${itemSizeClass} group flex flex-col items-center justify-start rounded p-2 text-center transition ${
        dragging
          ? "opacity-40"
          : dropIntoActive
            ? "bg-cyan/20 ring-2 ring-cyan"
            : selected
              ? "bg-cyan/15 ring-2 ring-cyan/80"
              : "hover:bg-field/80"
      }`}
      onMouseDown={onSelect}
      onDoubleClick={onOpen}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.itemId);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const inFolderZone = x > rect.width * 0.22 && x < rect.width * 0.78 && y < rect.height * 0.72;
        if (inFolderZone) {
          onHoverFolder();
          return;
        }
        onInsertTarget(x < rect.width / 2 ? item.itemId : nextItemId);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const inFolderZone = x > rect.width * 0.22 && x < rect.width * 0.78 && y < rect.height * 0.72;
        if (inFolderZone) {
          onDropIntoFolder(event);
        } else {
          onDropInsert(x < rect.width / 2 ? item.itemId : nextItemId, event);
        }
      }}
    >
      <button type="button" className="relative grid h-16 w-20 place-items-center text-yellow-300 drop-shadow" onClick={onOpen} title="Open folder">
        <Folder className="h-14 w-14 fill-yellow-300/20" />
        <span className="absolute bottom-2 rounded bg-black/50 px-1 text-[10px] font-black text-white">
          {(item.folder.itemIds ?? []).length}
        </span>
      </button>
      {editing ? (
        <input
          className="mt-2 w-28 rounded border border-cyan bg-panel px-1 py-0.5 text-center text-xs text-ink"
          value={editingName}
          onChange={(event) => setEditingName(event.target.value)}
          onBlur={(event) => onSubmitEdit(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmitEdit(event.currentTarget.value);
            if (event.key === "Escape") onCancelEdit();
          }}
          autoFocus
        />
      ) : (
        <button type="button" className="mt-2 line-clamp-3 min-h-[42px] w-28 break-words text-xs font-bold leading-tight text-ink drop-shadow" onClick={onOpen}>
          {item.folder.name}
        </button>
      )}
      <div className="mt-auto flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          className="rounded border border-line bg-panel/90 p-1 text-muted hover:text-ink"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onStartEdit();
          }}
          title={text.rename}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded border border-line bg-panel/90 p-1 text-muted hover:border-danger hover:text-danger"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          title={text.remove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function DesktopTeamIcon({
  item,
  nextItemId,
  dragging,
  selected,
  onDragStart,
  onDragEnd,
  onSelect,
  onInsertTarget,
  onDropInsert,
  onEdit,
  onDelete
}: {
  item: Extract<DesktopItem, { type: "team" }>;
  nextItemId?: string;
  dragging: boolean;
  selected: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSelect: (event: MouseEvent<HTMLElement>) => void;
  onInsertTarget: (beforeItemId?: string) => void;
  onDropInsert: (beforeItemId: string | undefined, event: DragEvent<HTMLElement>) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      data-desktop-item="true"
      data-desktop-item-id={item.itemId}
      draggable
      className={`${itemSizeClass} group flex cursor-grab flex-col items-center justify-start rounded p-2 text-center transition active:cursor-grabbing ${
        dragging ? "opacity-40" : selected ? "bg-cyan/15 ring-2 ring-cyan/80" : "hover:bg-field/80"
      }`}
      onMouseDown={onSelect}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.itemId);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        onInsertTarget(event.clientX < rect.left + rect.width / 2 ? item.itemId : nextItemId);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        onDropInsert(event.clientX < rect.left + rect.width / 2 ? item.itemId : nextItemId, event);
      }}
      onDoubleClick={onEdit}
    >
      <TeamLogo team={item.team} size="lg" />
      <p className="mt-2 line-clamp-3 min-h-[42px] w-28 break-words text-xs font-black uppercase leading-tight text-ink drop-shadow">
        {item.team.shortName || item.team.name}
      </p>
      <div className="mt-auto flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          className="rounded border border-line bg-panel/90 p-1 text-muted hover:text-ink"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          title="Edit"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded border border-line bg-panel/90 p-1 text-muted hover:border-danger hover:text-danger"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function DropSpacer() {
  return (
    <div className={`${itemSizeClass} rounded border border-dashed border-cyan bg-cyan/10 shadow-[0_0_18px_rgba(34,211,238,0.25)]`} />
  );
}

function SelectionMarquee({ box }: { box: NonNullable<SelectionBox> }) {
  const left = Math.min(box.startX, box.currentX);
  const top = Math.min(box.startY, box.currentY);
  const width = Math.abs(box.currentX - box.startX);
  const height = Math.abs(box.currentY - box.startY);

  return (
    <div
      className="pointer-events-none absolute z-20 border border-cyan bg-cyan/15 shadow-[0_0_20px_rgba(34,211,238,0.22)]"
      style={{ left, top, width, height }}
    />
  );
}

function resolveItems(
  folder: TeamFolder | undefined,
  teamsById: Map<string, Team>,
  foldersById: Map<string, TeamFolder>
): DesktopItem[] {
  if (!folder) return [];
  return (folder.itemIds ?? [])
    .map((itemId) => {
      if (itemId.startsWith("folder:")) {
        const id = itemId.slice("folder:".length);
        const child = foldersById.get(id);
        return child ? ({ type: "folder", id, itemId, folder: child } as DesktopItem) : null;
      }
      if (itemId.startsWith("team:")) {
        const id = itemId.slice("team:".length);
        const team = teamsById.get(id);
        return team ? ({ type: "team", id, itemId, team } as DesktopItem) : null;
      }
      return null;
    })
    .filter(Boolean) as DesktopItem[];
}

function buildPath(folderId: string, foldersById: Map<string, TeamFolder>) {
  const path: TeamFolder[] = [];
  let current = foldersById.get(folderId) ?? foldersById.get(outsideFolderId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? foldersById.get(current.parentId) : undefined;
  }
  return path;
}

function getFolderDeleteSummary(folderId: string, foldersById: Map<string, TeamFolder>) {
  const visitedFolderIds = new Set<string>();
  const teamIds = new Set<string>();

  const visit = (id: string) => {
    if (visitedFolderIds.has(id)) return;
    const folder = foldersById.get(id);
    if (!folder) return;

    visitedFolderIds.add(id);
    for (const teamId of folder.teamIds ?? []) {
      teamIds.add(teamId);
    }
    for (const itemId of folder.itemIds ?? []) {
      if (itemId.startsWith("team:")) teamIds.add(itemId.slice("team:".length));
      if (itemId.startsWith("folder:")) visit(itemId.slice("folder:".length));
    }
    for (const child of foldersById.values()) {
      if (child.parentId === id) visit(child.id);
    }
  };

  visit(folderId);
  return {
    folderCount: Math.max(0, visitedFolderIds.size - 1),
    teamCount: teamIds.size
  };
}

function isNestedFolder(folderId: string, possibleAncestorId: string, foldersById: Map<string, TeamFolder>) {
  let current = foldersById.get(folderId);
  while (current?.parentId) {
    if (current.parentId === possibleAncestorId) return true;
    current = foldersById.get(current.parentId);
  }
  return false;
}
