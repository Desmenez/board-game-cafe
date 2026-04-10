// ============================================================
// Name It — จั่วการ์ดหมา ตั้งชื่อ แข่งตอบ
// ============================================================
// URL ปก / หลังการ์ด / imageBase — ฝั่ง client ดูที่ `packages/client/src/imageMap.ts` (nameIt)

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

/** ชื่อสายพันธุ์ภาษาไทย (บรรทัดรองในปุ่มเลือกสายพันธุ์) */
export const NAME_IT_BREED_LABELS_TH: Record<NameItBreedId, string> = {
  'french-bulldog': 'บูลด็อกฝรั่งเศส',
  'golden-retriever': 'โกลเด้น รีทรีฟเวอร์',
  'labrador-retriever': 'ลาบราดอร์ รีทรีฟเวอร์',
  'siberian-husky': 'ไซบีเรียน ฮัสกี้',
  'shiba-inu': 'ชิบะ อินุ',
  rottweiler: 'ร็อตไวเลอร์',
  dachshund: 'ดัชชุนด์',
  chihuahua: 'ชิวาวา',
  pomeranian: 'ปอมเมอเรเนียน',
  pug: 'ปั๊ก',
  beagle: 'บีเกิล',
  corgi: 'คอร์กี',
};

/** รหัสภาพการ์ดหน้าหมา (dog) — ใช้ใน UI และสำรับ */
export const NAME_IT_BREED_FACE_IMAGE_IDS: Record<NameItBreedId, string> = {
  'french-bulldog': 'french-bulldog_ahmaov',
  'golden-retriever': 'golden-retriever_odcc9d',
  'labrador-retriever': 'labrador-retriever_wrb1gw',
  'siberian-husky': 'siberian-husky_duzlnt',
  'shiba-inu': 'shiba-inu_fhfpah',
  rottweiler: 'rottweiler_eczcw5',
  dachshund: 'dachshund_ylqqdi',
  chihuahua: 'chihuahua_quzbbh',
  pomeranian: 'pomeranian_k81eui',
  pug: 'pug_zgxpoa',
  beagle: 'beagle_gturfu',
  corgi: 'corgi_amoxf5',
};

/** รหัสภาพการ์ดคอร์สุนัข (dog_collar) */
export const NAME_IT_BREED_COLLAR_IMAGE_IDS: Record<NameItBreedId, string> = {
  'french-bulldog': 'french-bulldog-collar_vqmlst',
  'golden-retriever': 'golden-retriever-collar_yask80',
  'labrador-retriever': 'labrador-retriever-collar_cetbnq',
  'siberian-husky': 'siberian-husky-collar_bput6z',
  'shiba-inu': 'shiba-inu-collar_ljil8u',
  rottweiler: 'rottweiler-collar_h4ka22',
  dachshund: 'dachshund-collar_mh9wjn',
  chihuahua: 'chihuahua-collar_lkguml',
  pomeranian: 'pomeranian-collar_u0xr3c',
  pug: 'pug-collar_gyafmn',
  beagle: 'beagle-collar_pcxtrd',
  corgi: 'corgi-collar_akycor',
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
  /** เวลาสิ้นสุดการแข่งขัน (คลิก/พิมพ์เร็ว) ms — null = ไม่จำกัด (เช่น race_breed ครั้งแรกของสายพันธุ์) */
  deadlineMs: number | null;
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
