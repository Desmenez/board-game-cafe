/* Hallmark · component: avatar editor · genre: atmospheric · theme: Midnight
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (40–41) · pre-emit critique: P5 H5 E4 S5 R5 V4
 */
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  Check,
  FlipHorizontal2,
  ImagePlus,
  LoaderCircle,
  Shuffle,
  TriangleAlert,
  Trash2,
} from 'lucide-react';
import {
  PLAYER_AVATAR_ACCENT_COLORS,
  PLAYER_AVATAR_BACKGROUNDS,
  PLAYER_AVATAR_BASE_COLORS,
  PLAYER_AVATAR_CLOTHES,
  PLAYER_AVATAR_EARS,
  PLAYER_AVATAR_EARRINGS,
  PLAYER_AVATAR_EYEBROWS,
  PLAYER_AVATAR_EYES,
  PLAYER_AVATAR_EYE_SHADOW_COLORS,
  PLAYER_AVATAR_FACIAL_HAIR,
  PLAYER_AVATAR_GLASSES,
  PLAYER_AVATAR_HAIR,
  PLAYER_AVATAR_NOSE,
  createDefaultPlayerAvatar,
  normalizePlayerAvatarDisplay,
} from 'shared';
import type { PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import { clearOwnAvatar, uploadOwnAvatar } from '../../auth/avatarStorageApi';
import { updateOwnProfile } from '../../auth/profileApi';
import { cn } from '../../utils/cn';
import { createPlayerAvatarSeed } from '../../utils/playerAvatar';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '../ui';
import { AvatarPhotoCropDialog } from './AvatarPhotoCropDialog';
import { revokeObjectUrl } from './cropAvatarImage';
import { PlayerAvatar } from './PlayerAvatar';

const EDITOR_TABS = [
  { id: 'skin', label: 'สีผิว' },
  { id: 'hair', label: 'ทรงผม' },
  { id: 'eyes', label: 'ตา' },
  { id: 'nose', label: 'จมูก' },
  { id: 'ears', label: 'หู' },
  { id: 'glasses', label: 'แว่น' },
  { id: 'facialHair', label: 'หนวด' },
  { id: 'clothes', label: 'เสื้อ' },
  { id: 'background', label: 'พื้น' },
] as const;
const BACKGROUND_LABELS: Record<(typeof PLAYER_AVATAR_BACKGROUNDS)[number], string> = {
  amber: 'แสงโต๊ะ',
  sky: 'ฟ้ายามค่ำ',
  sage: 'สวนหลังร้าน',
  rose: 'แก้วโซดา',
};

const HAIR_LABELS: Record<(typeof PLAYER_AVATAR_HAIR)[number], string> = {
  none: 'ล้าน',
  dannyPhantom: 'Danny',
  dougFunny: 'Doug',
  fonze: 'Fonze',
  full: 'ยาว',
  mrClean: 'Clean',
  mrT: 'Mr T',
  pixie: 'Pixie',
  turban: 'Turban',
};

const EYES_LABELS: Record<(typeof PLAYER_AVATAR_EYES)[number], string> = {
  eyes: 'ปกติ',
  eyesShadow: 'เงา',
  round: 'กลม',
  smiling: 'ยิ้ม',
  smilingShadow: 'ยิ้ม+เงา',
};

const EYEBROW_LABELS: Record<(typeof PLAYER_AVATAR_EYEBROWS)[number], string> = {
  down: 'ลง',
  eyelashesDown: 'ขนตาลง',
  eyelashesUp: 'ขนตาขึ้น',
  up: 'ขึ้น',
};

const NOSE_LABELS: Record<(typeof PLAYER_AVATAR_NOSE)[number], string> = {
  curve: 'โค้ง',
  pointed: 'แหลม',
  tound: 'มน',
};

const EARS_LABELS: Record<(typeof PLAYER_AVATAR_EARS)[number], string> = {
  attached: 'ชิด',
  detached: 'แยก',
};

const EARRINGS_LABELS: Record<(typeof PLAYER_AVATAR_EARRINGS)[number], string> = {
  none: 'ไม่มี',
  hoop: 'ห่วง',
  stud: 'เม็ด',
};

const GLASSES_LABELS: Record<(typeof PLAYER_AVATAR_GLASSES)[number], string> = {
  none: 'ไม่มี',
  round: 'กลม',
  square: 'เหลี่ยม',
};

const FACIAL_HAIR_LABELS: Record<(typeof PLAYER_AVATAR_FACIAL_HAIR)[number], string> = {
  none: 'ไม่มี',
  beard: 'เครา',
  scruff: 'หนวด',
};

const CLOTHES_LABELS: Record<(typeof PLAYER_AVATAR_CLOTHES)[number], string> = {
  collared: 'คอปก',
  crew: 'คอกลม',
  open: 'เปิดอก',
};

export interface AvatarEditorProps {
  value: PlayerAvatarConfig;
  onChange: (avatar: PlayerAvatarConfig) => void;
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
  success?: boolean;
  className?: string;
  previewName?: string;
  /** Development preview only: render a pseudo-state without pointer interaction. */
  demoState?: 'default' | 'hover' | 'focus' | 'active';
  /**
   * When set (signed-in profile), enable photo upload mode.
   * Guests / lobby editors omit this and only get Micah controls.
   */
  photoUpload?: {
    userId: string;
    avatarUrl: string | null;
    avatarDisplay: PlayerAvatarDisplay;
    onAvatarUrlChange: (url: string | null) => void;
    onAvatarDisplayChange: (display: PlayerAvatarDisplay) => void;
  } | null;
}

function OptionChip({
  selected,
  disabled,
  demoState,
  onClick,
  children,
  className,
  title,
}: {
  selected: boolean;
  disabled: boolean;
  demoState: AvatarEditorProps['demoState'];
  onClick: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={cn(
        'relative flex min-h-11 min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-input border bg-paper-3 px-2.5 text-xs font-bold text-ink outline-2 outline-transparent outline-offset-2 transition-[background-color,border-color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)] focus-visible:outline-focus active:translate-y-px motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-pear bg-paper-4' : 'border-rule',
        !disabled && 'hover:bg-paper-4',
        demoState === 'hover' && 'bg-paper-4',
        demoState === 'focus' && 'outline-focus',
        demoState === 'active' && 'translate-y-px',
        className,
      )}
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {selected ? (
        <Check size={12} className="absolute top-1 right-1 text-pear" aria-hidden />
      ) : null}
    </button>
  );
}

function ColorSwatch({
  color,
  selected,
  disabled,
  demoState,
  onClick,
  label,
}: {
  color: string;
  selected: boolean;
  disabled: boolean;
  demoState: AvatarEditorProps['demoState'];
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        'relative size-9 shrink-0 rounded-pill border-2 outline-2 outline-transparent outline-offset-2 transition-[border-color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)] focus-visible:outline-focus active:translate-y-px motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-pear' : 'border-rule',
        demoState === 'focus' && 'outline-focus',
        demoState === 'active' && 'translate-y-px',
      )}
      style={{ backgroundColor: `#${color}` }}
      onClick={onClick}
      disabled={disabled}
    >
      {selected ? (
        <Check
          size={14}
          className={cn(
            'absolute inset-0 m-auto',
            color === 'ffffff' || color === 'ffedef' || color === 'ffeba4' || color === 'd2eff3'
              ? 'text-ink'
              : 'text-white',
          )}
          aria-hidden
        />
      ) : null}
    </button>
  );
}

function FeatureRow({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2 font-label text-xs font-bold tracking-[0.04em] text-ink-2">
        {legend}
      </legend>
      <div className="flex max-w-full flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function VariantPreview({
  value,
  patch,
  label,
}: {
  value: PlayerAvatarConfig;
  patch: Partial<PlayerAvatarConfig>;
  label: string;
}) {
  return (
    <PlayerAvatar
      playerId={`opt-${label}-${value.seed}`}
      name={label}
      avatar={{ ...value, ...patch }}
      size={28}
      decorative
      className="size-7"
    />
  );
}

export function AvatarEditor({
  value,
  onChange,
  disabled = false,
  busy = false,
  error,
  success = false,
  className,
  previewName = 'คุณ',
  demoState = 'default',
  photoUpload = null,
}: AvatarEditorProps) {
  const update = (patch: Partial<PlayerAvatarConfig>) => onChange({ ...value, ...patch });
  const controlsDisabled = disabled || busy;
  const needsEyeShadow = value.eyes === 'eyesShadow' || value.eyes === 'smilingShadow';
  const hasPhoto = Boolean(photoUpload?.avatarUrl);
  const mode: PlayerAvatarDisplay = photoUpload
    ? normalizePlayerAvatarDisplay(photoUpload.avatarDisplay)
    : 'character';
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorDisabled = controlsDisabled || photoBusy;

  const setDisplayMode = (display: PlayerAvatarDisplay) => {
    if (!photoUpload) return;
    photoUpload.onAvatarDisplayChange(display);
    if (display === 'character' || display === 'photo') {
      void updateOwnProfile(photoUpload.userId, { avatar_display: display }).then((result) => {
        if (!result.ok) setPhotoError(result.error);
      });
    }
  };

  const stateMessage = error
    ? error
    : photoError
      ? photoError
      : busy || photoBusy
        ? 'กำลังบันทึก avatar…'
        : success
          ? 'Avatar ล่าสุดแสดงผลแล้ว'
          : mode === 'photo'
            ? hasPhoto
              ? 'ใช้รูปที่อัปโหลด — สลับไปตัวละครระบบได้ทุกเมื่อ'
              : 'โหมดอัปโหลด — กดเลือกรูปด้านซ้าย'
            : 'ยิ้มกว้างติดไว้แล้ว — ปรับทรงผม ตา เสื้อผ้า และสีได้ตามใจ';

  const openFilePicker = () => fileInputRef.current?.click();

  const onFileSelected = (file: File | undefined) => {
    if (!file || !photoUpload) return;
    setPhotoError(null);
    if (!file.type.startsWith('image/')) {
      setPhotoError('กรุณาเลือกรูปภาพ (JPEG / PNG / WebP)');
      return;
    }
    revokeObjectUrl(cropSrc);
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!photoUpload) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const result = await uploadOwnAvatar(photoUpload.userId, blob);
      if (!result.ok) {
        setPhotoError(result.error);
        return;
      }
      photoUpload.onAvatarUrlChange(result.url);
      photoUpload.onAvatarDisplayChange('photo');
      setCropOpen(false);
      revokeObjectUrl(cropSrc);
      setCropSrc(null);
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleClearPhoto = async () => {
    if (!photoUpload) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const result = await clearOwnAvatar(photoUpload.userId);
      if (!result.ok) {
        setPhotoError(result.error);
        return;
      }
      photoUpload.onAvatarUrlChange(null);
      photoUpload.onAvatarDisplayChange('character');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <section
      className={cn(
        'grid min-w-0 gap-5 text-left sm:grid-cols-[8rem_minmax(0,1fr)]',
        '[--accent:var(--color-pear)] [--accent-hover:var(--color-focus)] [--accent-glow:var(--color-bloom)]',
        '[--bg-glass:var(--color-paper-3)] [--bg-card-hover:var(--color-paper-4)]',
        '[--border-subtle:var(--color-rule)] [--text-primary:var(--color-ink)] [--text-secondary:var(--color-ink-2)]',
        className,
      )}
      aria-label="ปรับแต่ง avatar"
      aria-disabled={editorDisabled}
      aria-busy={busy || photoBusy}
      data-state={
        error || photoError
          ? 'error'
          : busy || photoBusy
            ? 'loading'
            : success
              ? 'success'
              : demoState
      }
    >
      <div className="flex flex-col items-center gap-3 sm:sticky sm:top-0 sm:self-start">
        <PlayerAvatar
          playerId={`preview-${value.seed}`}
          name={previewName}
          avatar={value}
          avatarUrl={photoUpload?.avatarUrl}
          avatarDisplay={mode}
          size={112}
          className="size-28 border-rule-2"
        />
        {photoUpload ? (
          <div className="flex w-full gap-1 rounded-input border border-rule bg-paper-3 p-1">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-input px-1 py-0.5 text-xs font-bold transition-colors',
                mode === 'character' ? 'bg-paper-4 text-ink' : 'text-ink-2 hover:text-ink',
              )}
              aria-pressed={mode === 'character'}
              disabled={editorDisabled}
              onClick={() => setDisplayMode('character')}
            >
              ตัวละคร
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-input px-1 py-0.5 text-xs font-bold transition-colors',
                mode === 'photo' ? 'bg-paper-4 text-ink' : 'text-ink-2 hover:text-ink',
              )}
              aria-pressed={mode === 'photo'}
              disabled={editorDisabled}
              onClick={() => setDisplayMode('photo')}
            >
              อัปโหลด
            </button>
          </div>
        ) : null}
        {mode === 'character' || !photoUpload ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full motion-reduce:transform-none"
              onClick={() => {
                const fresh = createDefaultPlayerAvatar(createPlayerAvatarSeed());
                onChange({
                  ...fresh,
                  background: value.background,
                  flip: value.flip,
                });
              }}
              disabled={editorDisabled}
            >
              <Shuffle size={16} aria-hidden />
              สุ่มหน้า
            </Button>
            <Button
              type="button"
              size="sm"
              variant={value.flip ? 'primary' : 'secondary'}
              className="w-full motion-reduce:transform-none"
              aria-pressed={value.flip}
              onClick={() => update({ flip: !value.flip })}
              disabled={editorDisabled}
            >
              <FlipHorizontal2 size={16} aria-hidden />
              {value.flip ? 'กลับด้านแล้ว' : 'กลับด้าน'}
            </Button>
          </>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                onFileSelected(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={editorDisabled}
              onClick={openFilePicker}
            >
              <ImagePlus size={16} aria-hidden />
              {hasPhoto ? 'เปลี่ยนรูป' : 'เลือกรูป'}
            </Button>
            {hasPhoto ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="w-full"
                disabled={editorDisabled}
                onClick={() => void handleClearPhoto()}
              >
                <Trash2 size={16} aria-hidden />
                ลบรูป
              </Button>
            ) : null}
          </>
        )}
      </div>

      <div className="grid min-w-0 gap-4">
        {mode === 'photo' && photoUpload ? (
          <div className="rounded-input border border-rule bg-paper-3 px-4 py-5 text-sm leading-6 text-ink-2">
            <p className="m-0 font-bold text-ink">รูปโปรไฟล์ของคุณ</p>
            <p className="mt-2 mb-0">
              ครอปเป็นจัตุรัสก่อนอัปโหลด ไฟล์ไม่เกิน 500KB — แสดงในห้องเกมและรายชื่อเพื่อน
            </p>
            {!hasPhoto ? (
              <p className="mt-3 mb-0">ยังไม่มีรูป — กด &quot;เลือกรูป&quot; ด้านซ้าย</p>
            ) : null}
          </div>
        ) : (
          <Tabs defaultValue="skin" className="min-w-0">
            <TabsList aria-label="หมวดปรับแต่ง avatar" className="ui-tabs-list--scroll">
              {EDITOR_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} disabled={editorDisabled}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="skin" className="grid min-w-0 gap-5">
              <FeatureRow legend="สีผิว">
                {PLAYER_AVATAR_BASE_COLORS.map((color) => (
                  <ColorSwatch
                    key={color}
                    color={color}
                    label={`สีผิว ${color}`}
                    selected={value.baseColor === color}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ baseColor: color })}
                  />
                ))}
              </FeatureRow>
            </TabsContent>

            <TabsContent value="hair" className="grid min-w-0 gap-5">
              <FeatureRow legend="ทรงผม">
                {PLAYER_AVATAR_HAIR.map((hair) => (
                  <OptionChip
                    key={hair}
                    selected={value.hair === hair}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ hair })}
                    title={HAIR_LABELS[hair]}
                    className="flex-col px-2 py-1.5"
                  >
                    <VariantPreview value={value} patch={{ hair }} label={hair} />
                    <span className="max-w-14 truncate">{HAIR_LABELS[hair]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
              {value.hair !== 'none' ? (
                <FeatureRow legend="สีผม">
                  {PLAYER_AVATAR_ACCENT_COLORS.map((color) => (
                    <ColorSwatch
                      key={color}
                      color={color}
                      label={`สีผม ${color}`}
                      selected={value.hairColor === color}
                      disabled={controlsDisabled}
                      demoState={demoState}
                      onClick={() => update({ hairColor: color })}
                    />
                  ))}
                </FeatureRow>
              ) : null}
            </TabsContent>

            <TabsContent value="eyes" className="grid min-w-0 gap-5">
              <FeatureRow legend="ตา">
                {PLAYER_AVATAR_EYES.map((eyes) => (
                  <OptionChip
                    key={eyes}
                    selected={value.eyes === eyes}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ eyes })}
                    className="flex-col px-2 py-1.5"
                  >
                    <VariantPreview value={value} patch={{ eyes }} label={eyes} />
                    <span>{EYES_LABELS[eyes]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
              {needsEyeShadow ? (
                <FeatureRow legend="สีเงาตา">
                  {PLAYER_AVATAR_EYE_SHADOW_COLORS.map((color) => (
                    <ColorSwatch
                      key={color}
                      color={color}
                      label={`สีเงาตา ${color}`}
                      selected={value.eyeShadowColor === color}
                      disabled={controlsDisabled}
                      demoState={demoState}
                      onClick={() => update({ eyeShadowColor: color })}
                    />
                  ))}
                </FeatureRow>
              ) : null}
              <FeatureRow legend="คิ้ว">
                {PLAYER_AVATAR_EYEBROWS.map((eyebrows) => (
                  <OptionChip
                    key={eyebrows}
                    selected={value.eyebrows === eyebrows}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ eyebrows })}
                    className="flex-col px-2 py-1.5"
                  >
                    <VariantPreview value={value} patch={{ eyebrows }} label={eyebrows} />
                    <span>{EYEBROW_LABELS[eyebrows]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
            </TabsContent>

            <TabsContent value="nose" className="grid min-w-0 gap-5">
              <FeatureRow legend="จมูก">
                {PLAYER_AVATAR_NOSE.map((nose) => (
                  <OptionChip
                    key={nose}
                    selected={value.nose === nose}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ nose })}
                    className="flex-col px-2 py-1.5"
                  >
                    <VariantPreview value={value} patch={{ nose }} label={nose} />
                    <span>{NOSE_LABELS[nose]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
            </TabsContent>

            <TabsContent value="ears" className="grid min-w-0 gap-5">
              <FeatureRow legend="หู">
                {PLAYER_AVATAR_EARS.map((ears) => (
                  <OptionChip
                    key={ears}
                    selected={value.ears === ears}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ ears })}
                    className="flex-col px-2 py-1.5"
                  >
                    <VariantPreview value={value} patch={{ ears }} label={ears} />
                    <span>{EARS_LABELS[ears]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
              <FeatureRow legend="ต่างหู">
                {PLAYER_AVATAR_EARRINGS.map((earrings) => (
                  <OptionChip
                    key={earrings}
                    selected={value.earrings === earrings}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ earrings })}
                    className="flex-col px-2 py-1.5"
                  >
                    <VariantPreview value={value} patch={{ earrings }} label={earrings} />
                    <span>{EARRINGS_LABELS[earrings]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
              {value.earrings !== 'none' ? (
                <FeatureRow legend="สีต่างหู">
                  {PLAYER_AVATAR_ACCENT_COLORS.map((color) => (
                    <ColorSwatch
                      key={color}
                      color={color}
                      label={`สีต่างหู ${color}`}
                      selected={value.earringColor === color}
                      disabled={controlsDisabled}
                      demoState={demoState}
                      onClick={() => update({ earringColor: color })}
                    />
                  ))}
                </FeatureRow>
              ) : null}
            </TabsContent>

            <TabsContent value="glasses" className="grid min-w-0 gap-5">
              <FeatureRow legend="แว่น">
                {PLAYER_AVATAR_GLASSES.map((glasses) => (
                  <OptionChip
                    key={glasses}
                    selected={value.glasses === glasses}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ glasses })}
                    className="flex-col px-2 py-1.5"
                  >
                    <VariantPreview value={value} patch={{ glasses }} label={glasses} />
                    <span>{GLASSES_LABELS[glasses]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
              {value.glasses !== 'none' ? (
                <FeatureRow legend="สีแว่น">
                  {PLAYER_AVATAR_ACCENT_COLORS.map((color) => (
                    <ColorSwatch
                      key={color}
                      color={color}
                      label={`สีแว่น ${color}`}
                      selected={value.glassesColor === color}
                      disabled={controlsDisabled}
                      demoState={demoState}
                      onClick={() => update({ glassesColor: color })}
                    />
                  ))}
                </FeatureRow>
              ) : null}
            </TabsContent>

            <TabsContent value="facialHair" className="grid min-w-0 gap-5">
              <FeatureRow legend="หนวดเครา">
                {PLAYER_AVATAR_FACIAL_HAIR.map((facialHair) => (
                  <OptionChip
                    key={facialHair}
                    selected={value.facialHair === facialHair}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ facialHair })}
                    className="flex-col px-2 py-1.5"
                  >
                    <VariantPreview value={value} patch={{ facialHair }} label={facialHair} />
                    <span>{FACIAL_HAIR_LABELS[facialHair]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
            </TabsContent>

            <TabsContent value="clothes" className="grid min-w-0 gap-5">
              <FeatureRow legend="เสื้อ">
                {PLAYER_AVATAR_CLOTHES.map((clothes) => (
                  <OptionChip
                    key={clothes}
                    selected={value.clothes === clothes}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ clothes })}
                    className="flex-col px-2 py-1.5"
                  >
                    <VariantPreview value={value} patch={{ clothes }} label={clothes} />
                    <span>{CLOTHES_LABELS[clothes]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
              <FeatureRow legend="สีเสื้อ">
                {PLAYER_AVATAR_ACCENT_COLORS.map((color) => (
                  <ColorSwatch
                    key={color}
                    color={color}
                    label={`สีเสื้อ ${color}`}
                    selected={value.shirtColor === color}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ shirtColor: color })}
                  />
                ))}
              </FeatureRow>
            </TabsContent>

            <TabsContent value="background" className="grid min-w-0 gap-5">
              <FeatureRow legend="สีพื้น">
                {PLAYER_AVATAR_BACKGROUNDS.map((background) => (
                  <OptionChip
                    key={background}
                    selected={value.background === background}
                    disabled={controlsDisabled}
                    demoState={demoState}
                    onClick={() => update({ background })}
                    className="min-w-[7.5rem] justify-start"
                  >
                    <VariantPreview value={value} patch={{ background }} label={background} />
                    <span className="truncate">{BACKGROUND_LABELS[background]}</span>
                  </OptionChip>
                ))}
              </FeatureRow>
            </TabsContent>
          </Tabs>
        )}

        <p
          className={cn(
            'flex min-h-[1lh] items-center gap-2 text-sm',
            error || photoError ? 'text-error' : success ? 'text-success' : 'text-ink-2',
          )}
          role={error || photoError ? 'alert' : undefined}
          aria-live="polite"
        >
          {error || photoError ? (
            <TriangleAlert size={15} className="shrink-0" aria-hidden />
          ) : busy || photoBusy ? (
            <LoaderCircle
              size={15}
              className="shrink-0 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          ) : success ? (
            <Check size={15} className="shrink-0" aria-hidden />
          ) : null}
          {stateMessage}
        </p>
      </div>

      <AvatarPhotoCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        busy={photoBusy}
        onOpenChange={(next) => {
          if (!next) {
            revokeObjectUrl(cropSrc);
            setCropSrc(null);
          }
          setCropOpen(next);
        }}
        onConfirm={handleCropConfirm}
      />
    </section>
  );
}
