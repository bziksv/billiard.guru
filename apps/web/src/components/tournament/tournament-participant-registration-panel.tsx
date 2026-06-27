"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CitySelect } from "@/components/admin/city-select";
import { TournamentParticipantLimitNotice } from "@/components/tournament/tournament-participant-limit-notice";
import { PhoneInput } from "@/components/ui/phone-input";
import { SearchableMultiSelect, SearchableSelect } from "@/components/ui/searchable-select";
import {
  doubleParticipantRulesForPair,
  getDefaultBracketParticipantRules,
} from "@/lib/bracket-participant-rules";
import {
  countActiveTournamentSlots,
  slotsRemaining,
} from "@/lib/tournament-participant-limit";
import type { AdminTournament } from "@/lib/tournament-admin";
import { canOrganizerRegisterParticipants } from "@/lib/tournament-registration";
import { isPairFormat } from "@/lib/pair-tournament";
import {
  formatTournamentPlayerSelectLabel,
  playerExceedsTournamentRatingMax,
} from "@/lib/tournament-rating-display";
import { cn } from "@/lib/cn";

export type TournamentRegistrationPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  rating: number;
};

export function TournamentParticipantRegistrationPanel({
  tournament,
  players,
  clubPlayerRatings,
  onPlayerCreated,
  onUpdated,
  className,
  collapsible = false,
}: {
  tournament: AdminTournament;
  players: TournamentRegistrationPlayer[];
  clubPlayerRatings: Record<string, number>;
  /** После создания игрока через inline-форму — обновить список в родителе. */
  onPlayerCreated?: (player: TournamentRegistrationPlayer) => void;
  onUpdated: () => void | Promise<void>;
  className?: string;
  /** Кнопка «Добавить игрока» → форма на месте, без отдельной вкладки. */
  collapsible?: boolean;
}) {
  const bracketFormed = tournament.matches.length > 0;
  const canRegister = canOrganizerRegisterParticipants(tournament.status, bracketFormed);
  const isPair = isPairFormat(tournament.format);
  const defaultCityId = tournament.club.city?.id ?? "";
  const defaultCountryName =
    tournament.club.city?.country?.nameRu ?? "Россия";

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState("");
  const [teamName, setTeamName] = useState("");
  const [expanded, setExpanded] = useState(!collapsible);
  const [newPlayerOpen, setNewPlayerOpen] = useState(false);
  const [newLastName, setNewLastName] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newCityId, setNewCityId] = useState(defaultCityId);
  const [newCountryName, setNewCountryName] = useState(defaultCountryName);
  const [newPhone, setNewPhone] = useState("");
  const [newPhoneValid, setNewPhoneValid] = useState(false);
  const [newRating, setNewRating] = useState("0");
  const [newPlayerError, setNewPlayerError] = useState<string | null>(null);
  const [newPlayerLoading, setNewPlayerLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const addLabel = isPair ? "Добавить пару" : "Добавить игрока";

  useEffect(() => {
    if (defaultCityId) setNewCityId(defaultCityId);
  }, [defaultCityId]);

  const baseParticipantRules =
    tournament.participantRules ?? getDefaultBracketParticipantRules(tournament.format);
  const participantRules = tournament.isPair
    ? doubleParticipantRulesForPair(baseParticipantRules)
    : baseParticipantRules;
  const activeParticipantCount = countActiveTournamentSlots(tournament);
  const slotsLeft = slotsRemaining(participantRules, activeParticipantCount);

  const registeredPlayerIds = useMemo(() => {
    if (isPair) {
      const ids = new Set<string>();
      for (const team of tournament.teams) {
        if (team.status === "CANCELLED") continue;
        ids.add(team.player1.id);
        if (team.player2) ids.add(team.player2.id);
      }
      return ids;
    }
    return new Set(
      tournament.registrations
        .filter((r) => !["CANCELLED", "REJECTED"].includes(r.status))
        .map((r) => r.player.id),
    );
  }, [tournament, isPair]);

  const playerOptions = useMemo(
    () =>
      players.map((p) => ({
        value: p.id,
        label: formatTournamentPlayerSelectLabel(
          p,
          clubPlayerRatings[p.id],
          tournament.ratingSource ?? "CLUB",
        ),
      })),
    [players, clubPlayerRatings, tournament.ratingSource],
  );

  const availablePlayerOptions = useMemo(() => {
    const ratingMax = tournament.ratingMax ?? null;
    return playerOptions.filter((opt) => {
      if (registeredPlayerIds.has(opt.value)) return false;
      if (ratingMax == null) return true;
      const player = players.find((p) => p.id === opt.value);
      if (!player) return true;
      return !playerExceedsTournamentRatingMax(
        player.rating,
        ratingMax,
        clubPlayerRatings[player.id],
        tournament.ratingSource ?? "CLUB",
      );
    });
  }, [
    playerOptions,
    registeredPlayerIds,
    tournament.ratingMax,
    tournament.ratingSource,
    players,
    clubPlayerRatings,
  ]);

  useEffect(() => {
    if (!selectedPlayerId) return;
    if (!availablePlayerOptions.some((o) => o.value === selectedPlayerId)) {
      setSelectedPlayerId("");
    }
  }, [availablePlayerOptions, selectedPlayerId]);

  useEffect(() => {
    setSelectedPlayerIds((prev) =>
      prev.filter((id) => availablePlayerOptions.some((o) => o.value === id)),
    );
  }, [availablePlayerOptions]);

  function setSelectedPlayerIdsLimited(ids: string[]) {
    const max = Math.max(0, slotsLeft);
    setSelectedPlayerIds(max > 0 ? ids.slice(0, max) : []);
  }

  useEffect(() => {
    if (!selectedPlayer2Id) return;
    if (
      selectedPlayer2Id === selectedPlayerId ||
      !availablePlayerOptions.some((o) => o.value === selectedPlayer2Id)
    ) {
      setSelectedPlayer2Id("");
    }
  }, [availablePlayerOptions, selectedPlayer2Id, selectedPlayerId]);

  if (!canRegister) return null;

  async function registerExistingPlayer(
    playerId: string,
    opts?: { refresh?: boolean },
  ): Promise<boolean> {
    const res = await fetch("/api/tournaments/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentId: tournament.id,
        playerId,
        clubId: tournament.clubId,
        source: "CLUB",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRegError(data.error ?? "Не удалось добавить игрока");
      return false;
    }
    if (opts?.refresh !== false) {
      setSelectedPlayerId("");
      setSelectedPlayerIds([]);
      setRegMessage("Игрок добавлен в заявки — отметьте взнос и подтвердите");
      await onUpdated();
    }
    return true;
  }

  async function registerExistingPlayers(playerIds: string[]): Promise<number> {
    let added = 0;
    for (let i = 0; i < playerIds.length; i += 1) {
      const ok = await registerExistingPlayer(playerIds[i]!, { refresh: false });
      if (!ok) {
        setSelectedPlayerIds(playerIds.slice(i));
        break;
      }
      added += 1;
    }
    if (added > 0) {
      if (added === playerIds.length) setSelectedPlayerIds([]);
      await onUpdated();
    }
    return added;
  }

  async function addParticipant() {
    setRegError(null);
    setRegMessage(null);

    if (isPair) {
      if (!selectedPlayerId || !selectedPlayer2Id) {
        setRegError("Выберите двух игроков");
        return;
      }
      setRegLoading(true);
      try {
        const res = await fetch("/api/tournaments/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId: tournament.id,
            player1Id: selectedPlayerId,
            player2Id: selectedPlayer2Id,
            name: teamName || undefined,
            clubId: tournament.clubId,
            source: "CLUB",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setRegError(data.error ?? "Не удалось добавить пару");
          return;
        }
        setSelectedPlayerId("");
        setSelectedPlayer2Id("");
        setTeamName("");
        setRegMessage("Пара добавлена в заявки — отметьте взнос и подтвердите");
        await onUpdated();
      } finally {
        setRegLoading(false);
      }
      return;
    }

    if (!selectedPlayerId) {
      setRegError("Выберите игрока");
      return;
    }

    setRegLoading(true);
    try {
      await registerExistingPlayer(selectedPlayerId);
    } finally {
      setRegLoading(false);
    }
  }

  async function addParticipantsBulk() {
    setRegError(null);
    setRegMessage(null);

    if (selectedPlayerIds.length === 0) {
      setRegError("Выберите одного или нескольких игроков");
      return;
    }

    setRegLoading(true);
    try {
      const total = selectedPlayerIds.length;
      const added = await registerExistingPlayers(selectedPlayerIds);
      if (added === 0) return;
      if (added === total) {
        setRegError(null);
        setRegMessage(
          added === 1
            ? "Игрок добавлен в заявки — отметьте взнос и подтвердите"
            : `Добавлено заявок: ${added} — отметьте взнос и подтвердите`,
        );
      } else {
        setRegMessage(`Добавлено ${added} из ${total}`);
      }
    } finally {
      setRegLoading(false);
    }
  }

  async function createAndAddPlayer(e: FormEvent) {
    e.preventDefault();
    setNewPlayerError(null);
    setRegError(null);
    setRegMessage(null);

    if (!newPhoneValid) {
      setNewPlayerError("Введите корректный номер телефона");
      return;
    }
    if (!newCityId) {
      setNewPlayerError("Выберите город");
      return;
    }
    if (slotsLeft <= 0) {
      setNewPlayerError("Лимит сетки заполнен");
      return;
    }

    setNewPlayerLoading(true);
    try {
      const form = new FormData();
      form.set("lastName", newLastName.trim());
      form.set("firstName", newFirstName.trim());
      form.set("cityId", newCityId);
      form.set("phone", newPhone);
      form.set("rating", newRating || "0");

      const res = await fetch("/api/players", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setNewPlayerError(data.error ?? "Не удалось создать игрока");
        return;
      }

      const created: TournamentRegistrationPlayer = {
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        rating: data.rating,
      };
      onPlayerCreated?.(created);

      setNewLastName("");
      setNewFirstName("");
      setNewPhone("");
      setNewPhoneValid(false);
      setNewRating("0");
      setNewPlayerOpen(false);

      if (isPair) {
        setSelectedPlayerId(created.id);
        setRegMessage("Игрок создан — выберите партнёра");
        return;
      }

      await registerExistingPlayer(created.id);
    } finally {
      setNewPlayerLoading(false);
    }
  }

  const bulkAddLabel =
    !isPair && selectedPlayerIds.length > 1
      ? `Добавить (${selectedPlayerIds.length})`
      : addLabel;

  const statusHint =
    tournament.status === "PENDING_CLUB_APPROVAL" || tournament.status === "DRAFT"
      ? "Можно набирать участников до публикации турнира."
      : null;

  if (collapsible && !expanded) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="admin-btn admin-btn--primary px-4 py-2 text-sm"
        >
          {addLabel}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        className,
        collapsible && "rounded-lg border border-zinc-800 bg-zinc-900/50 p-4",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-sm font-semibold text-zinc-200 hover:text-emerald-400"
          >
            {addLabel}
            <span className="ml-1 text-zinc-500" aria-hidden>
              ▲
            </span>
          </button>
        ) : (
          <h3 className="text-sm font-semibold text-zinc-200">Регистрация участников</h3>
        )}
        <button
          type="button"
          onClick={() => {
            setNewPlayerOpen((open) => !open);
            setNewPlayerError(null);
          }}
          className="text-xs text-emerald-400 hover:underline"
        >
          {newPlayerOpen ? "Скрыть форму" : "+ Новый игрок"}
        </button>
      </div>

      {newPlayerOpen && (
        <form
          onSubmit={(e) => void createAndAddPlayer(e)}
          className="mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
        >
          <p className="text-xs text-zinc-500">
            Новый игрок создаётся и попадает в заявки — отметьте взнос и подтвердите в списке
            ниже.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              placeholder="Фамилия"
              required
              minLength={2}
              className="admin-input w-full px-3 py-2 text-sm"
            />
            <input
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              placeholder="Имя"
              required
              minLength={2}
              className="admin-input w-full px-3 py-2 text-sm"
            />
          </div>
          {defaultCityId ? (
            <p className="text-xs text-zinc-500">
              Город: {tournament.club.city?.nameRu ?? "—"}
            </p>
          ) : (
            <CitySelect
              value={newCityId}
              onChange={setNewCityId}
              onCountryChange={(c) => setNewCountryName(c?.nameRu ?? "Россия")}
              required
            />
          )}
          <PhoneInput
            countryName={newCountryName}
            value={newPhone}
            onChange={(e164, valid) => {
              setNewPhone(e164);
              setNewPhoneValid(valid);
            }}
            required
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="admin-label mb-1 block text-xs">Начальный рейтинг</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={newRating}
                onChange={(e) => setNewRating(e.target.value)}
                className="admin-input w-full px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={
                newPlayerLoading ||
                regLoading ||
                slotsLeft <= 0 ||
                !newPhoneValid ||
                !newCityId
              }
              className="admin-btn admin-btn--primary shrink-0 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {newPlayerLoading || regLoading ? "…" : "Создать и добавить"}
            </button>
          </div>
          {newPlayerError && <p className="text-sm text-red-400">{newPlayerError}</p>}
        </form>
      )}

      {statusHint && <p className="mb-3 text-xs text-zinc-500">{statusHint}</p>}
      {participantRules && (
        <TournamentParticipantLimitNotice
          rules={participantRules}
          activeCount={activeParticipantCount}
          className="mb-4"
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-3">
          {!isPair ? (
            <SearchableMultiSelect
              options={availablePlayerOptions}
              values={selectedPlayerIds}
              onChange={setSelectedPlayerIdsLimited}
              placeholder={
                slotsLeft <= 0 ? "Лимит сетки заполнен" : "Выберите игроков"
              }
              searchPlaceholder="Поиск игрока…"
              disabled={slotsLeft <= 0}
              dropdownClassName="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
              maxSelectable={slotsLeft > 0 ? slotsLeft : undefined}
            />
          ) : (
            <>
              <SearchableSelect
                options={availablePlayerOptions}
                value={selectedPlayerId}
                onChange={setSelectedPlayerId}
                placeholder={slotsLeft <= 0 ? "Лимит сетки заполнен" : "Игрок 1"}
                searchPlaceholder="Поиск игрока…"
                disabled={slotsLeft <= 0}
              />
              <SearchableSelect
                options={availablePlayerOptions.filter((o) => o.value !== selectedPlayerId)}
                value={selectedPlayer2Id}
                onChange={setSelectedPlayer2Id}
                placeholder="Игрок 2 (партнёр)"
                searchPlaceholder="Поиск игрока…"
                disabled={slotsLeft <= 0}
              />
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Название команды (необязательно)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
              />
            </>
          )}
          {!isPair && slotsLeft > 0 && (
            <p className="text-xs text-zinc-500">
              Отметьте нескольких игроков в списке — добавятся одной кнопкой. Свободно мест:{" "}
              {slotsLeft}.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void (isPair ? addParticipant() : addParticipantsBulk())}
          disabled={
            regLoading ||
            newPlayerLoading ||
            slotsLeft <= 0 ||
            (isPair
              ? !selectedPlayerId || !selectedPlayer2Id
              : selectedPlayerIds.length === 0)
          }
          className="admin-btn admin-btn--primary shrink-0 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {regLoading ? "Добавляем…" : bulkAddLabel}
        </button>
      </div>
      {regError && <p className="mt-2 text-sm text-red-400">{regError}</p>}
      {regMessage && <p className="mt-2 text-sm text-emerald-400">{regMessage}</p>}
    </div>
  );
}
