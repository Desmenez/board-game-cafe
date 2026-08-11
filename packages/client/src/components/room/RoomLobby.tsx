import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlayerAvatarConfig, PlayerAvatarDisplay, Room } from 'shared';
import {
  DEFAULT_NAMEPLATE_ID,
  NO_CHIP_ID,
  NO_ICON_ID,
  NO_TITLE_ID,
  getPlayerDisplayNameValidationError,
  normalizeChipId,
  normalizeIconId,
  normalizeNameplateId,
  normalizePlayerAvatarDisplay,
  normalizePlayerDisplayName,
  normalizeTitleId,
  getRoomPlayerCountError,
  getGameRewardTrack,
  getSkyTeamLobbyValidationErrors,
  parseSkyTeamLobbyOptions,
} from 'shared';
import {
  Check,
  Copy,
  Crown,
  Gift,
  LogOut,
  Pencil,
  Rocket,
  Shuffle,
  Trophy,
  UserPlus,
  WifiOff,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getLobbyOptionsComponent } from '../game-lobby-options';
import { LobbyGamePicker } from '../LobbyGamePicker';
import { GameRewardTrackDialog } from '../GameRewardTrackDialog';
import { InviteFriendsDialog } from '../InviteFriendsDialog';
import { PlayerProfileModal } from '../PlayerProfileModal';
import {
  PlayerPublicProfileDialog,
  type PlayerPublicProfileIdentity,
  type ProfileAnchorRect,
} from '../profile/PlayerPublicProfileDialog';
import {
  CosmeticSeat,
  PlayerAvatar,
  PlayerAvatarIconBadge,
} from '../player-avatar';
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Input,
} from '../ui';
import {
  normalizeRoomCode,
  setStoredPlayerName,
} from '../../utils/playerToken';
import { writeGlobalPlayerNameToStorage } from '../../utils/playerDisplayName';
import {
  setStoredPlayerAvatar,
  writeGlobalPlayerAvatarToStorage,
} from '../../utils/playerAvatar';
import { updateOwnProfile, type ProfileRow } from '../../auth/profileApi';
import { cn } from '../../utils/cn';

type RoomConnectionStatus = 'idle' | 'disconnected' | 'resuming' | 'ready' | 'failed';

interface RoomLobbyProps {
  room: Room;
  code: string;
  myId: string;
  isHost: boolean;
  connected: boolean;
  roomConnectionStatus: RoomConnectionStatus;
  user: { id: string } | null;
  profile: ProfileRow | null;
  playerName: string;
  playerAvatar: PlayerAvatarConfig;
  onPlayerNameChange: (name: string) => void;
  onPlayerAvatarChange: (avatar: PlayerAvatarConfig) => void;
  onLobbyOptionsChange: (opts: unknown) => void;
  onStartGame: (options: unknown) => void;
  onUpdateRoomGame: (gameId: string) => Promise<{ success: boolean; error?: string }>;
  onUpdatePlayerName: (name: string) => Promise<{ success: boolean; error?: string }>;
  onUpdatePlayerAvatar: (
    avatar: PlayerAvatarConfig,
    avatarUrl?: string | null,
    avatarDisplay?: PlayerAvatarDisplay,
    equippedNameplateId?: string | null,
    equippedTitleId?: string | null,
    equippedIconId?: string | null,
    equippedChipId?: string | null,
  ) => Promise<{ success: boolean; error?: string }>;
  onKickPlayer: (playerId: string) => Promise<{ success: boolean; error?: string }>;
  onLeaveRoom: () => void;
  onRefreshProfile: () => Promise<void>;
}

export function RoomLobby({
  room,
  code,
  myId,
  isHost,
  connected,
  roomConnectionStatus,
  user,
  profile,
  playerName,
  playerAvatar,
  onPlayerNameChange,
  onPlayerAvatarChange,
  onLobbyOptionsChange,
  onStartGame,
  onUpdateRoomGame,
  onUpdatePlayerName,
  onUpdatePlayerAvatar,
  onKickPlayer,
  onLeaveRoom,
  onRefreshProfile,
}: RoomLobbyProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [startOptions, setStartOptions] = useState<unknown>(undefined);
  const [kickAlertMessage, setKickAlertMessage] = useState<string | null>(null);
  const [kickConfirm, setKickConfirm] = useState<{ id: string; name: string } | null>(null);
  const [myNameDraft, setMyNameDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState<PlayerAvatarConfig>(playerAvatar);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState<string | null>(null);
  const [avatarDisplayDraft, setAvatarDisplayDraft] = useState<PlayerAvatarDisplay>('character');
  const [nameplateDraft, setNameplateDraft] = useState(DEFAULT_NAMEPLATE_ID);
  const [titleDraft, setTitleDraft] = useState(NO_TITLE_ID);
  const [iconDraft, setIconDraft] = useState(NO_ICON_ID);
  const [chipDraft, setChipDraft] = useState(NO_CHIP_ID);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileModalError, setProfileModalError] = useState<string | null>(null);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [changingGame, setChangingGame] = useState(false);
  const [inviteFriendsOpen, setInviteFriendsOpen] = useState(false);
  const [rewardTrackOpen, setRewardTrackOpen] = useState(false);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  const [viewingAnchor, setViewingAnchor] = useState<ProfileAnchorRect | null>(null);

  useEffect(() => {
    if (room.status !== 'waiting') return;
    const seat = room.players.find((p) => p.id === myId);
    if (!seat) return;
    onPlayerAvatarChange(seat.avatar);
    setAvatarDraft((draft) => (profileModalOpen ? draft : seat.avatar));
    setAvatarUrlDraft((draft) =>
      profileModalOpen ? draft : (seat.avatarUrl ?? profile?.avatar_url ?? null),
    );
    setAvatarDisplayDraft((draft) =>
      profileModalOpen
        ? draft
        : normalizePlayerAvatarDisplay(seat.avatarDisplay ?? profile?.avatar_display),
    );
    setMyNameDraft((draft) => {
      if (profileModalOpen) return draft;
      const committed = seat.name;
      if (!draft.trim()) return committed;
      if (draft.trim() !== committed.trim()) return draft;
      return committed;
    });
  }, [
    room,
    myId,
    profileModalOpen,
    profile?.avatar_url,
    profile?.avatar_display,
    onPlayerAvatarChange,
  ]);

  const mySeat = room.players.find((p) => p.id === myId);
  const myCommittedName = mySeat?.name ?? '';
  const canEditProfileInLobby = room.status === 'waiting';

  const playerCountError = getRoomPlayerCountError(
    room.players.length,
    room.gameMeta.minPlayers,
    room.gameMeta.maxPlayers,
  );
  const hasOfflinePlayers = room.players.some((p) => !p.connected);
  const skyTeamOpts =
    room.gameId === 'sky-team' ? parseSkyTeamLobbyOptions(room.lobbyOptions) : null;
  const skyTeamLobbyErrors =
    skyTeamOpts != null
      ? getSkyTeamLobbyValidationErrors(
          skyTeamOpts,
          room.players.map((p) => p.id),
        )
      : [];
  const canStart =
    isHost &&
    connected &&
    roomConnectionStatus === 'ready' &&
    playerCountError === null &&
    !hasOfflinePlayers &&
    skyTeamLobbyErrors.length === 0;
  const LobbyOptionsComponent = getLobbyOptionsComponent(room.gameId);
  const coverUrl = room.gameMeta.thumbnail?.trim() || '';
  const rewardTrack = getGameRewardTrack(room.gameId);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('คัดลอกไม่สำเร็จ');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('คัดลอกไม่สำเร็จ');
    }
  };

  const openLobbyProfileModal = () => {
    setProfileModalError(null);
    setMyNameDraft(mySeat?.name ?? playerName);
    setAvatarDraft(mySeat?.avatar ?? playerAvatar);
    setAvatarUrlDraft(mySeat?.avatarUrl ?? profile?.avatar_url ?? null);
    setAvatarDisplayDraft(
      normalizePlayerAvatarDisplay(mySeat?.avatarDisplay ?? profile?.avatar_display),
    );
    setNameplateDraft(
      normalizeNameplateId(mySeat?.equippedNameplateId ?? profile?.equipped_nameplate_id),
    );
    setTitleDraft(normalizeTitleId(mySeat?.equippedTitleId ?? profile?.equipped_title_id));
    setIconDraft(normalizeIconId(mySeat?.equippedIconId ?? profile?.equipped_icon_id));
    setChipDraft(normalizeChipId(mySeat?.equippedChipId ?? profile?.equipped_chip_id));
    setProfileModalOpen(true);
  };

  const persistLobbyProfile = async () => {
    const normalized = normalizePlayerDisplayName(myNameDraft);
    if (!normalized) {
      setProfileModalError(
        getPlayerDisplayNameValidationError(myNameDraft) ?? 'กรุณาใส่ชื่อที่ถูกต้อง',
      );
      return;
    }
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileModalError(null);

    try {
      const nameChanged = normalized !== myCommittedName.trim();
      const avatarChanged = JSON.stringify(avatarDraft) !== JSON.stringify(mySeat?.avatar ?? null);
      const avatarUrlChanged = (avatarUrlDraft ?? null) !== (mySeat?.avatarUrl ?? null);
      const avatarDisplayChanged =
        avatarDisplayDraft !== normalizePlayerAvatarDisplay(mySeat?.avatarDisplay);
      const draftNameplate = normalizeNameplateId(nameplateDraft);
      const draftTitle = normalizeTitleId(titleDraft);
      const draftIcon = normalizeIconId(iconDraft);
      const draftChip = normalizeChipId(chipDraft);
      const nameplateChangedOnSeat =
        draftNameplate !== normalizeNameplateId(mySeat?.equippedNameplateId);
      const titleChangedOnSeat = draftTitle !== normalizeTitleId(mySeat?.equippedTitleId);
      const iconChangedOnSeat = draftIcon !== normalizeIconId(mySeat?.equippedIconId);
      const chipChangedOnSeat = draftChip !== normalizeChipId(mySeat?.equippedChipId);
      const cosmeticsChangedOnSeat =
        nameplateChangedOnSeat || titleChangedOnSeat || iconChangedOnSeat || chipChangedOnSeat;
      const nameplateChangedOnProfile =
        draftNameplate !== normalizeNameplateId(profile?.equipped_nameplate_id);
      const titleChangedOnProfile = draftTitle !== normalizeTitleId(profile?.equipped_title_id);
      const iconChangedOnProfile = draftIcon !== normalizeIconId(profile?.equipped_icon_id);
      const chipChangedOnProfile = draftChip !== normalizeChipId(profile?.equipped_chip_id);

      if (nameChanged) {
        const res = await onUpdatePlayerName(normalized);
        if (!res.success) {
          setProfileModalError(res.error ?? 'เปลี่ยนชื่อไม่สำเร็จ');
          return;
        }
        onPlayerNameChange(normalized);
        writeGlobalPlayerNameToStorage(normalized);
        setStoredPlayerName(normalizeRoomCode(code), normalized);
      }

      if (avatarChanged || avatarUrlChanged || avatarDisplayChanged || cosmeticsChangedOnSeat) {
        const res = await onUpdatePlayerAvatar(
          avatarDraft,
          avatarUrlChanged || avatarDisplayChanged
            ? avatarDisplayDraft === 'photo'
              ? avatarUrlDraft
              : null
            : undefined,
          avatarDisplayChanged ? avatarDisplayDraft : undefined,
          cosmeticsChangedOnSeat ? draftNameplate : undefined,
          cosmeticsChangedOnSeat ? draftTitle : undefined,
          cosmeticsChangedOnSeat ? draftIcon : undefined,
          cosmeticsChangedOnSeat ? draftChip : undefined,
        );
        if (!res.success) {
          setProfileModalError(res.error ?? 'เปลี่ยน avatar ไม่สำเร็จ');
          return;
        }
        onPlayerAvatarChange(avatarDraft);
        writeGlobalPlayerAvatarToStorage(avatarDraft);
        setStoredPlayerAvatar(normalizeRoomCode(code), avatarDraft);
      }

      if (
        user &&
        (nameChanged ||
          avatarChanged ||
          avatarUrlChanged ||
          avatarDisplayChanged ||
          nameplateChangedOnProfile ||
          titleChangedOnProfile ||
          iconChangedOnProfile ||
          chipChangedOnProfile)
      ) {
        void updateOwnProfile(user.id, {
          ...(nameChanged ? { display_name: normalized } : {}),
          ...(avatarChanged ? { avatar_config: avatarDraft } : {}),
          ...(avatarUrlChanged ? { avatar_url: avatarUrlDraft } : {}),
          ...(avatarDisplayChanged ? { avatar_display: avatarDisplayDraft } : {}),
          ...(nameplateChangedOnProfile ? { equipped_nameplate_id: draftNameplate } : {}),
          ...(titleChangedOnProfile ? { equipped_title_id: draftTitle } : {}),
          ...(iconChangedOnProfile ? { equipped_icon_id: draftIcon } : {}),
          ...(chipChangedOnProfile ? { equipped_chip_id: draftChip } : {}),
        }).then(async (result) => {
          if (!result.ok) {
            console.error('sync profile to account', result.error);
            toast.error('บันทึกขึ้นบัญชีไม่สำเร็จ — โปรไฟล์ในห้องเปลี่ยนแล้ว');
            return;
          }
          await onRefreshProfile();
        });
      }

      setProfileModalOpen(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangeGame = async (gameId: string) => {
    if (changingGame || gameId === room.gameId) return;
    setChangingGame(true);
    const res = await onUpdateRoomGame(gameId);
    setChangingGame(false);
    if (res.success) {
      setStartOptions(undefined);
      setGamePickerOpen(false);
      return;
    }
    setKickAlertMessage(res.error ?? 'เปลี่ยนเกมไม่สำเร็จ');
  };

  const confirmKickPlayer = async () => {
    const target = kickConfirm;
    if (!target) return;
    setKickConfirm(null);
    setKickAlertMessage(null);
    const res = await onKickPlayer(target.id);
    if (!res.success) {
      setKickAlertMessage(res.error ?? 'เตะไม่สำเร็จ');
    }
  };

  const handleLobbyOptionsChange = (opts: unknown) => {
    setStartOptions(opts);
    onLobbyOptionsChange(opts);
  };

  const viewingPlayer = room.players.find((p) => p.id === viewingPlayerId) ?? null;
  const viewingIsMe = viewingPlayer?.id === myId;
  const identity: PlayerPublicProfileIdentity | null = viewingPlayer
    ? {
        playerId: viewingPlayer.id,
        userId: viewingPlayer.userId ?? (viewingIsMe && user ? user.id : null),
        name: viewingPlayer.name,
        avatar: viewingPlayer.avatar,
        avatarUrl: viewingPlayer.avatarUrl,
        avatarDisplay: viewingPlayer.avatarDisplay,
        nameplateId: viewingPlayer.equippedNameplateId,
        titleId: viewingPlayer.equippedTitleId,
        iconId: viewingPlayer.equippedIconId,
        chipId: viewingPlayer.equippedChipId,
        handle: viewingIsMe && profile ? profile.handle : null,
      }
    : null;

  return (
    <div
      className={`page app-night-page room-page--hallmark lb-page${coverUrl ? ' lb-page--has-cover' : ''}`}
    >
      {coverUrl ? (
        <div className="lb-page__backdrop" aria-hidden>
          <img className="lb-page__cover" src={coverUrl} alt="" decoding="async" />
          <div className="lb-page__scrim" />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto w-full max-w-shell px-4 py-10 pb-32 sm:px-6 lg:px-16 lg:py-16 lg:pb-32">
        <header className="room-lobby-hero mb-10 flex flex-col items-stretch gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
              ล็อบบี้เกม
            </span>
            <h1 className="mt-3 mb-2 max-w-[18ch] wrap-anywhere font-display text-[clamp(1.953rem,4vw,2.441rem)] leading-[1.08] font-extrabold tracking-[-0.045em] text-ink">
              {room.gameMeta.name}
            </h1>
            <p className="m-0 max-w-[58ch] leading-7 text-ink-2">
              {room.players.length}/{room.gameMeta.maxPlayers} คนบนโต๊ะ
              {room.players.length < room.gameMeta.minPlayers
                ? ` · ต้องการอย่างน้อย ${room.gameMeta.minPlayers} คน`
                : ' · พร้อมจัดโต๊ะ'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col-reverse items-stretch gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-row gap-3">
              <Button
                type="button"
                variant="secondary"
                className="w-full lg:w-auto"
                onClick={() => navigate(`/games/${room.gameId}/leaderboard`)}
              >
                <Trophy size={16} aria-hidden />
                ดูสถิติ
              </Button>
              {rewardTrack.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full lg:w-auto"
                  onClick={() => setRewardTrackOpen(true)}
                >
                  <Gift size={16} aria-hidden />
                  ของรางวัล
                </Button>
              ) : null}
              {isHost && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full lg:w-auto"
                  onClick={() => setGamePickerOpen(true)}
                  disabled={changingGame}
                >
                  <Shuffle size={16} aria-hidden />
                  เปลี่ยนเกม
                </Button>
              )}
            </div>
            <button
              type="button"
              className="inline-flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-pill border border-pear bg-pear px-4 py-2 font-label text-xl font-bold tracking-[0.12em] text-accent-ink transition duration-150 ease-out motion-safe:hover:-translate-y-px motion-safe:active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-focus-inverse) lg:w-auto"
              onClick={() => void copyCode()}
              title="คลิกเพื่อคัดลอกรหัสห้อง"
              aria-label={`คัดลอกรหัสห้อง ${room.code}`}
            >
              <span>{room.code}</span>
              {copied ? (
                <Check size={17} strokeWidth={2.25} aria-hidden />
              ) : (
                <Copy size={17} strokeWidth={2.25} aria-hidden />
              )}
            </button>
          </div>
        </header>

        {kickAlertMessage && (
          <Alert variant="destructive" className="mb-4" onDismiss={() => setKickAlertMessage(null)}>
            {kickAlertMessage}
          </Alert>
        )}

        <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(19rem,5fr)]">
          <main className="grid min-w-0 gap-6">
            <section
              className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
              aria-labelledby="room-share-heading"
            >
              <div className="mb-6">
                <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                  ส่งคำเชิญ
                </span>
                <h2
                  className="mt-2 mb-0 font-display text-lg md:text-2xl font-extrabold tracking-[-0.035em] text-ink"
                  id="room-share-heading"
                >
                  ชวนเพื่อนมาที่โต๊ะ
                </h2>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row items-center w-full">
                <Input
                  className="w-full"
                  value={window.location.href}
                  readOnly
                  aria-label="ลิงก์เชิญเข้าห้อง"
                />
                <div className="flex flex-row gap-3 w-full lg:w-auto">
                  <Button
                    variant="secondary"
                    type="button"
                    className="w-1/2 lg:w-auto"
                    onClick={() => void copyLink()}
                  >
                    {copied ? (
                      <>
                        <Check size={18} strokeWidth={2.25} aria-hidden />
                        คัดลอกแล้ว
                      </>
                    ) : (
                      <>
                        <Copy size={18} strokeWidth={2.25} aria-hidden />
                        คัดลอก
                      </>
                    )}
                  </Button>
                  {isHost && user && room.status === 'waiting' ? (
                    <div className="w-1/2 lg:w-auto">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full lg:w-auto"
                        onClick={() => setInviteFriendsOpen(true)}
                      >
                        <UserPlus size={18} aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section
              className="min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
              aria-labelledby="room-players-heading"
            >
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                    ที่นั่งบนโต๊ะ
                  </span>
                  <h2
                    className="mt-2 mb-0 font-display text-lg md:text-2xl font-extrabold tracking-[-0.035em] text-ink"
                    id="room-players-heading"
                  >
                    ผู้เล่น
                  </h2>
                </div>
                <strong className="font-label text-lg md:text-xl text-pear">
                  {room.players.length}/{room.gameMeta.maxPlayers}
                </strong>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
                {room.players.map((player) => {
                  const isMe = player.id === myId;
                  const isOffline = !player.connected;
                  return (
                    <CosmeticSeat
                      key={player.id}
                      playerId={player.id}
                      name={player.name}
                      avatar={player.avatar}
                      avatarUrl={player.avatarUrl}
                      avatarDisplay={player.avatarDisplay}
                      nameplateId={player.equippedNameplateId}
                      titleId={player.equippedTitleId}
                      iconId={player.equippedIconId}
                      chipId={player.equippedChipId}
                      avatarSize={44}
                      showYouLabel={isMe}
                      className={cn(
                        'cursor-pointer items-start whitespace-normal text-left transition hover:border-pear/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                        isOffline &&
                          'border-2 border-[#a78bfa] shadow-[inset_0_0_0_1px_rgba(167,139,250,0.25)]',
                      )}
                      role="button"
                      tabIndex={0}
                      aria-label={`ดูโปรไฟล์ ${player.name}`}
                      onClick={(e) => {
                        setViewingPlayerId(player.id);
                        setViewingAnchor(e.currentTarget.getBoundingClientRect());
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewingPlayerId(player.id);
                          setViewingAnchor(e.currentTarget.getBoundingClientRect());
                        }
                      }}
                      avatarSlot={
                        isMe && canEditProfileInLobby ? (
                          <button
                            type="button"
                            className="relative grid size-12 shrink-0 place-items-center rounded-input outline-2 outline-transparent outline-offset-2 focus-visible:outline-focus active:translate-y-px motion-reduce:transform-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLobbyProfileModal();
                            }}
                            aria-label="แก้โปรไฟล์ของคุณ"
                          >
                            <span className="relative">
                              <PlayerAvatar
                                playerId={player.id}
                                name={player.name}
                                avatar={player.avatar}
                                avatarUrl={player.avatarUrl}
                                avatarDisplay={player.avatarDisplay}
                                size={44}
                                decorative
                                className="size-11"
                              />
                              <PlayerAvatarIconBadge
                                iconId={player.equippedIconId}
                                avatarSize={44}
                              />
                            </span>
                          </button>
                        ) : (
                          <span className="relative shrink-0">
                            <PlayerAvatar
                              playerId={player.id}
                              name={player.name}
                              avatar={player.avatar}
                              avatarUrl={player.avatarUrl}
                              avatarDisplay={player.avatarDisplay}
                              size={44}
                              decorative
                              className={cn('size-11', isOffline && 'opacity-55')}
                            />
                            <PlayerAvatarIconBadge iconId={player.equippedIconId} avatarSize={44} />
                          </span>
                        )
                      }
                      secondary={
                        isOffline ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#a78bfa]">
                            <WifiOff size={14} strokeWidth={2.5} aria-hidden />
                            ออฟไลน์
                          </span>
                        ) : null
                      }
                      trailing={
                        player.id === room.hostId ? (
                          <Badge
                            variant="warning"
                            size="sm"
                            className="ml-auto shrink-0 border-rule! bg-paper-2! text-pear!"
                          >
                            <Crown size={13} aria-hidden />
                            Host
                          </Badge>
                        ) : null
                      }
                      overlay={
                        isHost && player.id !== room.hostId && room.status === 'waiting' ? (
                          <button
                            type="button"
                            className="absolute -top-2 -right-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-error bg-paper-2 p-0 text-error transition duration-150 hover:bg-paper-4 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            title={`เตะ ${player.name} ออกจากห้อง`}
                            aria-label={`เตะ ${player.name} ออกจากห้อง`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setKickConfirm({ id: player.id, name: player.name });
                            }}
                          >
                            <X size={14} strokeWidth={2.75} aria-hidden />
                          </button>
                        ) : null
                      }
                    />
                  );
                })}
              </div>

              {hasOfflinePlayers && (
                <p className="mt-4 mb-0 flex items-center gap-2 text-sm font-semibold text-[#a78bfa]">
                  <WifiOff size={16} strokeWidth={2.5} aria-hidden />
                  มีผู้เล่นออฟไลน์ — รอให้กลับมาหรือเตะออกก่อนเริ่มเกม
                </p>
              )}

              {playerCountError && (
                <div className="waiting-indicator mt-6 text-ink-2">
                  <p>{playerCountError}</p>
                  {room.players.length < room.gameMeta.minPlayers && (
                    <div className="waiting-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>
              )}
            </section>
          </main>

          <aside className="grid min-w-0 gap-6 lg:sticky lg:top-10">
            <section
              className="room-options-panel min-w-0 rounded-card border border-rule bg-paper-2 p-4 sm:p-6"
              aria-label="ตัวเลือกเกม"
            >
              <div className="mb-6">
                <span className="block font-label text-xs font-bold tracking-[0.05em] text-pear">
                  ตั้งค่าโต๊ะ
                </span>
                <h2 className="mt-2 mb-0 font-display text-lg md:text-2xl font-extrabold tracking-[-0.035em] text-ink">
                  ตัวเลือกก่อนเริ่ม
                </h2>
              </div>
              <LobbyOptionsComponent
                key={`${room.gameId}:${room.code}`}
                isHost={isHost}
                myId={myId}
                playerCount={room.players.length}
                players={room.players.map((p) => ({ id: p.id, name: p.name }))}
                lobbyOptions={room.lobbyOptions}
                onChange={handleLobbyOptionsChange}
              />
            </section>

            <div className="grid gap-3 rounded-card border border-rule bg-paper-2 p-4 sticky bottom-0">
              {isHost && skyTeamLobbyErrors.length > 0 && (
                <p className="m-0 text-sm text-danger">{skyTeamLobbyErrors[0]}</p>
              )}
              {isHost && (
                <Button
                  size="lg"
                  onClick={() => {
                    onStartGame(room.lobbyOptions ?? startOptions);
                  }}
                  disabled={!canStart}
                  title={
                    hasOfflinePlayers
                      ? 'มีผู้เล่นออฟไลน์ — รอให้กลับมาหรือเตะออกก่อนเริ่มเกม'
                      : (playerCountError ?? skyTeamLobbyErrors[0] ?? undefined)
                  }
                  block
                >
                  <Rocket size={18} strokeWidth={2.25} aria-hidden /> เริ่มเกม
                </Button>
              )}
              <Button
                variant="danger"
                type="button"
                block
                onClick={() => (isHost ? setLeaveModalOpen(true) : onLeaveRoom())}
              >
                <LogOut size={18} strokeWidth={2.25} aria-hidden />
                ออกจากห้อง
              </Button>
            </div>
          </aside>
        </div>

        <LobbyGamePicker
          open={gamePickerOpen}
          onOpenChange={setGamePickerOpen}
          currentGameId={room.gameId}
          playerCount={room.players.length}
          changing={changingGame}
          onSelect={(gameId) => void handleChangeGame(gameId)}
        />

        <PlayerPublicProfileDialog
          open={viewingPlayer != null}
          onOpenChange={(next) => {
            if (!next) {
              setViewingPlayerId(null);
              setViewingAnchor(null);
            }
          }}
          anchorRect={viewingAnchor}
          identity={identity}
          status={viewingPlayer ? (viewingPlayer.connected ? 'online' : 'offline') : null}
          footer={
            viewingPlayer ? (
              <>
                {viewingIsMe && canEditProfileInLobby ? (
                  <Button
                    type="button"
                    block
                    onClick={() => {
                      setViewingPlayerId(null);
                      setViewingAnchor(null);
                      openLobbyProfileModal();
                    }}
                  >
                    <Pencil size={16} aria-hidden />
                    แก้ไขโปรไฟล์
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  block
                  onClick={() => {
                    setViewingPlayerId(null);
                    setViewingAnchor(null);
                  }}
                >
                  ปิด
                </Button>
              </>
            ) : null
          }
        />

        <PlayerProfileModal
          open={profileModalOpen}
          mode="edit"
          playerName={myNameDraft}
          playerAvatar={avatarDraft}
          onChangeName={(name) => {
            setMyNameDraft(name);
            setProfileModalError(null);
          }}
          onChangeAvatar={(avatar) => {
            setAvatarDraft(avatar);
            setProfileModalError(null);
          }}
          onSubmit={() => void persistLobbyProfile()}
          onDismiss={() => {
            if (!profileSaving) setProfileModalOpen(false);
          }}
          externalError={profileModalError}
          submitDisabled={profileSaving}
          photoUpload={
            user
              ? {
                  userId: user.id,
                  avatarUrl: avatarUrlDraft,
                  avatarDisplay: avatarDisplayDraft,
                  onAvatarUrlChange: (url) => {
                    setAvatarUrlDraft(url);
                    void onRefreshProfile();
                  },
                  onAvatarDisplayChange: setAvatarDisplayDraft,
                }
              : null
          }
          cosmetics={
            user
              ? {
                  nameplateId: nameplateDraft,
                  titleId: titleDraft,
                  iconId: iconDraft,
                  chipId: chipDraft,
                  onNameplateChange: setNameplateDraft,
                  onTitleChange: setTitleDraft,
                  onIconChange: setIconDraft,
                  onChipChange: setChipDraft,
                }
              : null
          }
        />

        <Dialog
          open={kickConfirm !== null}
          onOpenChange={(open) => {
            if (!open) setKickConfirm(null);
          }}
          className="max-w-lg room-night-dialog"
          overlayClassName="room-night-dialog-overlay"
          aria-labelledby="kick-dialog-title"
          aria-describedby="kick-dialog-desc"
        >
          {kickConfirm && (
            <>
              <DialogTitle id="kick-dialog-title">เตะออกจากห้อง?</DialogTitle>
              <DialogDescription id="kick-dialog-desc">
                เตะ &quot;{kickConfirm.name}&quot; ออกจากห้อง — ผู้เล่นจะถูกตัดการเชื่อมต่อทันที
              </DialogDescription>
              <DialogFooter>
                <div className="flex gap-3 w-full">
                  <Button
                    type="button"
                    variant="danger"
                    block
                    onClick={() => void confirmKickPlayer()}
                  >
                    เตะออก
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    block
                    onClick={() => setKickConfirm(null)}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </Dialog>

        {leaveModalOpen && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-modal-title"
          >
            <div className="modal max-w-lg">
              <h2 id="leave-modal-title">ออกจากห้อง?</h2>
              <p>
                {room.players.length <= 1
                  ? 'คุณเป็นหัวห้องและเป็นผู้เล่นคนเดียว การออกจะลบห้องนี้ — ลิงก์เดิมจะใช้เข้าห้องไม่ได้อีก'
                  : 'คุณเป็นหัวห้อง การออกจะโยกสิทธิ์หัวห้องให้ผู้เล่นคนอื่น ห้องจะยังอยู่'}
              </p>
              <div className="mt-6 flex flex-col gap-3 lg:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  block
                  onClick={() => setLeaveModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button type="button" variant="danger" block onClick={onLeaveRoom}>
                  ออกจากห้อง
                </Button>
              </div>
            </div>
          </div>
        )}

        {user ? (
          <InviteFriendsDialog
            open={inviteFriendsOpen}
            onClose={() => setInviteFriendsOpen(false)}
            myUserId={user.id}
            roomCode={room.code}
            gameId={room.gameId}
          />
        ) : null}

        {rewardTrack.length > 0 ? (
          <GameRewardTrackDialog
            open={rewardTrackOpen}
            onClose={() => setRewardTrackOpen(false)}
            gameId={room.gameId}
            gameName={room.gameMeta.name}
          />
        ) : null}
      </div>
    </div>
  );
}
