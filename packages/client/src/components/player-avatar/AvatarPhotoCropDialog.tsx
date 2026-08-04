import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { PROFILE_AVATAR_MAX_BYTES } from 'shared';
import { Button, Dialog, DialogDescription, DialogFooter, DialogTitle, Slider } from '../ui';
import { getCroppedAvatarJpeg, revokeObjectUrl } from './cropAvatarImage';

export interface AvatarPhotoCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
  busy?: boolean;
}

export function AvatarPhotoCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onConfirm,
  busy = false,
}: AvatarPhotoCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [encoding, setEncoding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || busy || encoding) return;
    setEncoding(true);
    setError(null);
    try {
      const result = await getCroppedAvatarJpeg(imageSrc, croppedAreaPixels);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await onConfirm(result.blob);
    } catch (err) {
      console.error('AvatarPhotoCropDialog', err);
      setError('ครอปรูปไม่สำเร็จ');
    } finally {
      setEncoding(false);
    }
  };

  const working = busy || encoding;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (working) return;
        onOpenChange(next);
      }}
      dismissible={!working}
      aria-labelledby="avatar-crop-title"
      aria-describedby="avatar-crop-desc"
      // Portal escapes .app-night-page — without night chrome, :root purple tokens leak in.
      className="max-w-md w-[min(100%,28rem)] room-night-dialog"
      overlayClassName="room-night-dialog-overlay"
    >
      <DialogTitle id="avatar-crop-title">ครอปรูปโปรไฟล์</DialogTitle>
      <DialogDescription id="avatar-crop-desc">
        ลากและซูมให้ใบหน้าอยู่กลางกรอบจัตุรัส — ไฟล์สุดท้ายไม่เกิน{' '}
        {Math.floor(PROFILE_AVATAR_MAX_BYTES / 1024)}KB
      </DialogDescription>

      <div className="relative mt-4 h-72 overflow-hidden rounded-input bg-paper-4">
        {imageSrc ? (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
            classes={{
              containerClassName: 'rounded-input',
            }}
          />
        ) : null}
      </div>

      <div className="mt-4">
        <Slider
          label="ซูม"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          disabled={working || !imageSrc}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
      </div>

      {error ? <p className="mt-3 mb-0 text-sm text-error">{error}</p> : null}

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={working}
          onClick={() => {
            revokeObjectUrl(imageSrc);
            onOpenChange(false);
          }}
        >
          ยกเลิก
        </Button>
        <Button
          type="button"
          disabled={working || !croppedAreaPixels}
          onClick={() => void handleConfirm()}
        >
          {working ? 'กำลังบันทึก…' : 'ใช้รูปนี้'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
