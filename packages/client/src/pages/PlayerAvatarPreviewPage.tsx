import { useState } from 'react';
import type { ReactNode } from 'react';
import { createDefaultPlayerAvatar } from 'shared';
import { AvatarEditor } from '../components/player-avatar';
import { createPlayerAvatarSeed } from '../utils/playerAvatar';

function StateCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-card border border-rule bg-paper-2 p-4 sm:p-6">
      <h2 className="font-label text-xs font-bold tracking-[0.05em] text-pear">{label}</h2>
      {children}
    </section>
  );
}

export function PlayerAvatarPreviewPage() {
  const [avatar, setAvatar] = useState(() => createDefaultPlayerAvatar(createPlayerAvatarSeed()));

  return (
    <main className="app-night-page min-h-svh bg-paper px-4 py-12 text-ink sm:px-6">
      <div className="mx-auto grid w-full max-w-4xl gap-8">
        <header>
          <span className="font-label text-xs font-bold tracking-[0.05em] text-pear">
            Component preview
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em]">
            Player avatar
          </h1>
          <p className="mt-2 max-w-[58ch] text-ink-2">
            Midnight component scope — preview Micah parts, background, mirror, reroll และสถานะฟอร์ม
          </p>
        </header>

        <StateCard label="01 · Default">
          <AvatarEditor value={avatar} onChange={setAvatar} previewName="มะลิ" />
        </StateCard>

        <StateCard label="02 · Hover">
          <p className="text-sm text-ink-2">
            วางเมาส์บนตัวเลือกลายเส้น — พื้นผิวเปลี่ยนโดยไม่ขยับ layout
          </p>
          <AvatarEditor value={avatar} onChange={setAvatar} previewName="มะลิ" demoState="hover" />
        </StateCard>

        <StateCard label="03 · Focus">
          <p className="text-sm text-ink-2">กด Tab — focus ring แสดงทันทีและไม่ animate</p>
          <AvatarEditor value={avatar} onChange={setAvatar} previewName="มะลิ" demoState="focus" />
        </StateCard>

        <StateCard label="04 · Active / pressed">
          <AvatarEditor value={avatar} onChange={setAvatar} previewName="มะลิ" demoState="active" />
        </StateCard>

        <StateCard label="05 · Disabled">
          <AvatarEditor value={avatar} onChange={setAvatar} previewName="มะลิ" disabled />
        </StateCard>

        <StateCard label="06 · Loading">
          <AvatarEditor value={avatar} onChange={setAvatar} previewName="มะลิ" busy />
        </StateCard>

        <StateCard label="07 · Error">
          <AvatarEditor
            value={avatar}
            onChange={setAvatar}
            previewName="มะลิ"
            error="รูปแบบ avatar ไม่ถูกต้อง กรุณาสุ่มใหม่แล้วลองอีกครั้ง"
          />
        </StateCard>

        <StateCard label="08 · Success">
          <AvatarEditor value={avatar} onChange={setAvatar} previewName="มะลิ" success />
        </StateCard>
      </div>
    </main>
  );
}
