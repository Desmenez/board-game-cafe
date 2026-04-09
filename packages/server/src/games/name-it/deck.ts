import type { NameItCard, NameItCardKind } from 'shared';
import {
  NAME_IT_BREED_COLLAR_IMAGE_IDS,
  NAME_IT_BREED_FACE_IMAGE_IDS,
  NAME_IT_BREEDS,
  type NameItBreedId,
} from 'shared';

let cid = 0;
function card(kind: NameItCardKind, imageId: string, breed?: NameItBreedId): NameItCard {
  return { id: `ni-${cid++}`, kind, imageId, breed };
}

/** สำรับ 69 ใบ — รหัสภาพตามที่ผู้ใช้กำหนด; การ์ดพิเศษแต่ละชนิด 3 ใบ */
export function buildNameItDeck(): NameItCard[] {
  const out: NameItCard[] = [];

  for (const b of NAME_IT_BREEDS) {
    const plain = NAME_IT_BREED_FACE_IMAGE_IDS[b];
    const collar = NAME_IT_BREED_COLLAR_IMAGE_IDS[b];
    for (let i = 0; i < 3; i++) out.push(card('dog', plain, b));
    for (let i = 0; i < 2; i++) out.push(card('dog_collar', collar, b));
  }

  for (let i = 0; i < 3; i++) out.push(card('special_cat', 'special-cat_prrhn9'));
  for (let i = 0; i < 3; i++) out.push(card('special_gluta', 'special-gluta_sgtwnv'));
  for (let i = 0; i < 3; i++) out.push(card('special_gollum', 'special-gollum_tb3jf3'));

  return out;
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
