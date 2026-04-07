// ============================================================
// Name It — จั่วการ์ดหมา ตั้งชื่อ แข่งตอบ
// ============================================================

export const NAME_IT_IMAGE_BASE =
  'https://res.cloudinary.com/dpkqjlk3g/image/upload/q_auto/f_auto/v1775560713';

export type NameItBreedId =
  | 'french-bulldog'
  | 'golden-retriever'
  | 'labrador-retriever'
  | 'siberian-husky'
  | 'shiba-inu'
  | 'rottweiler'
  | 'dachshund'
  | 'chihuahua'
  | 'pomeranian'
  | 'pug'
  | 'beagle'
  | 'corgi';

export const NAME_IT_BREEDS: NameItBreedId[] = [
  'french-bulldog',
  'golden-retriever',
  'labrador-retriever',
  'siberian-husky',
  'shiba-inu',
  'rottweiler',
  'dachshund',
  'chihuahua',
  'pomeranian',
  'pug',
  'beagle',
  'corgi',
];

export const NAME_IT_BREED_LABELS: Record<NameItBreedId, string> = {
  'french-bulldog': 'French Bulldog',
  'golden-retriever': 'Golden Retriever',
  'labrador-retriever': 'Labrador',
  'siberian-husky': 'Siberian Husky',
  'shiba-inu': 'Shiba Inu',
  rottweiler: 'Rottweiler',
  dachshund: 'Dachshund',
  chihuahua: 'Chihuahua',
  pomeranian: 'Pomeranian',
  pug: 'Pug',
  beagle: 'Beagle',
  corgi: 'Corgi',
};

export type NameItCardKind =
  | 'dog'
  | 'dog_collar'
  | 'special_cat'
  | 'special_gluta'
  | 'special_gollum';

export interface NameItCard {
  id: string;
  kind: NameItCardKind;
  breed?: NameItBreedId;
  /** ชื่อไฟล์ base ก่อน .jpg */
  imageId: string;
}

export interface NameItBreedState {
  ownerId: string | null;
  /** ชื่อที่เจ้าของตั้ง (ไม่เกิน 4 คำ) */
  dogName: string | null;
}

export type NameItSubPhase =
  | 'race_breed'
  | 'owner_naming'
  | 'race_dog_name'
  | 'race_owner_display_name'
  | 'race_cat'
  | 'race_gluta';

/** สิ่งที่รอบก่อนทำ — ใช้เมื่อจั่ว Gollum ให้เล่นซ้ำ */
export type NameItLastPlay =
  | { kind: 'guess_dog_name'; breed: NameItBreedId }
  | { kind: 'guess_owner_name'; breed: NameItBreedId }
  | { kind: 'race_cat'; catPos: { x: number; y: number } }
  | { kind: 'race_gluta' };

export interface NameItActiveRound {
  card: NameItCard;
  subPhase: NameItSubPhase;
  /** เวลาสิ้นสุดการแข่งขัน (คลิก/พิมพ์เร็ว) ms */
  deadlineMs: number;
  /** เมื่อเจ้าของต้องตั้งชื่อหลังได้สายพันธุ์ */
  nameDeadlineMs?: number;
  /** ผู้ชนะการเลือกสายพันธุ์ — รอตั้งชื่อ */
  pendingOwnerId?: string;
  breedButtonOrder: NameItBreedId[];
  /** ตำแหน่งแมว 0–1 เหมือนกันทุก client */
  catPos?: { x: number; y: number };
  /** เมื่อการ์ดเป็น Gollum แต่คำตอบอ้างอิงสายพันธุ์นี้ */
  answerBreed?: NameItBreedId;
  /** บันทึกว่า Gollum รอบนี้เล่นซ้ำแบบไหน (สำหรับบันทึก lastPlay) */
  gollumReplay?: NameItLastPlay;
  glutaBreeds?: NameItBreedId[];
  /** gluta: ใครกดครบทุกสายพันธุ์ที่เป็นเจ้าของแล้ว */
  glutaCompletedAt?: Record<string, number>;
  glutaWrongUntil?: Record<string, number>;
  /** gluta: สายพันธุ์ที่กดแล้วต่อผู้เล่น (แสดงความคืบหน้า) */
  glutaProgress?: Record<string, NameItBreedId[]>;
  catWinnerId?: string;
  firstGuessWinnerId?: string;
}

export interface NameItPlayerRow {
  id: string;
  name: string;
  score: number;
}

export interface NameItPlayerView {
  phase: 'playing' | 'game_over';
  imageBase: string;
  playerOrder: string[];
  drawerId: string;
  deckRemaining: number;
  /** ผู้มีสิทธิ์จั่วเปิด/ปิด — ทุกคนเห็นรายชื่อสุนัขเดียวกัน */
  breedDirectoryOpen: boolean;
  players: NameItPlayerRow[];
  breeds: Record<NameItBreedId, NameItBreedState>;
  activeRound: NameItActiveRound | null;
  lastEvent?: string;
  result?: { winners: string[]; reason: string; scores: Record<string, number> };
}

export type NameItAction =
  | { type: 'draw' }
  | { type: 'pick_breed'; breed: NameItBreedId }
  | { type: 'submit_dog_name'; name: string }
  | { type: 'guess_text'; text: string }
  | { type: 'tap_cat' }
  | { type: 'gluta_pick'; breed: NameItBreedId }
  /** เฉพาะผู้มีสิทธิ์จั่ว — สลับแผงรายชื่อสุนัขให้ทุกคน */
  | { type: 'toggle_breed_directory' };
