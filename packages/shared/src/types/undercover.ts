import type { GameResult } from './game.js';

// ============================================================
// Undercover — social deduction word game
// ============================================================

export type UndercoverRole = 'civilian' | 'undercover' | 'mr_white';

export type UndercoverPhase =
  | 'role_reveal'
  | 'clue_round'
  | 'discussion'
  | 'secret_vote'
  | 'tie_break_vote'
  | 'elimination'
  | 'mr_white_guess'
  | 'game_over';

export interface UndercoverCategory {
  id: string;
  label: string;
}

/** Fine-grained clusters — ids must match keys in server `UNDERCOVER_WORD_POOLS`. */
export const UNDERCOVER_CATEGORIES: readonly UndercoverCategory[] = [
  { id: 'amphibians', label: 'สัตว์สะเทินน้ำสะเทินบก' },
  { id: 'smallReptiles', label: 'สัตว์เลื้อยคลานขนาดเล็ก' },
  { id: 'turtles', label: 'เต่า' },
  { id: 'largeReptiles', label: 'สัตว์เลื้อยคลานขนาดใหญ่' },
  { id: 'smallBirds', label: 'นกขนาดเล็ก' },
  { id: 'birdsOfPrey', label: 'นกล่าเหยื่อ' },
  { id: 'waterBirds', label: 'นกน้ำและสัตว์ปีก' },
  { id: 'ornamentalFish', label: 'ปลาสวยงาม' },
  { id: 'foodFish', label: 'ปลาอาหาร' },
  { id: 'largeSeaAnimals', label: 'สัตว์ทะเลขนาดใหญ่' },
  { id: 'seaInvertebrates', label: 'สัตว์ทะเลไม่มีกระดูกสันหลัง' },
  { id: 'shrimpAndCrabs', label: 'กุ้งและปู' },
  { id: 'insects', label: 'แมลง' },
  { id: 'householdPests', label: 'แมลงในบ้าน' },
  { id: 'arachnids', label: 'แมงมุมและแมงป่อง' },
  { id: 'reptiles', label: 'ตะขาบและกิ้งกือ' },
  { id: 'smallMammals', label: 'สัตว์เลี้ยงลูกด้วยนมขนาดเล็ก' },
  { id: 'primates', label: 'ลิง' },
  { id: 'wildCats', label: 'แมวป่า' },
  { id: 'canines', label: 'ตระกูลหมา' },
  { id: 'bears', label: 'หมี' },
  { id: 'largeHerbivores', label: 'สัตว์กินพืชขนาดใหญ่' },
  { id: 'farmRuminants', label: 'สัตว์เคี้ยวเอื้อง' },
  { id: 'horseFamily', label: 'ตระกูลม้า' },
  { id: 'pigs', label: 'หมู' },
  { id: 'commonPets', label: 'สัตว์เลี้ยง' },
  { id: 'mainlandSoutheastAsia', label: 'เอเชียตะวันออกเฉียงใต้' },
  { id: 'eastAsia', label: 'เอเชียตะวันออก' },
  { id: 'northAmericanCountries', label: 'อเมริกาเหนือ' },
  { id: 'writingInstruments', label: 'เครื่องเขียน' },
  { id: 'paperAndNotebooks', label: 'กระดาษและสมุด' },
  { id: 'officeTools', label: 'อุปกรณ์สำนักงาน' },
  { id: 'handTools', label: 'เครื่องมือช่าง' },
  { id: 'containers', label: 'ภาชนะ' },
  { id: 'tableware', label: 'จานชาม' },
  { id: 'cutlery', label: 'ช้อนส้อมมีด' },
  { id: 'cookware', label: 'เครื่องครัว' },
  { id: 'kitchenAppliances', label: 'เครื่องใช้ไฟฟ้าในครัว' },
  { id: 'cleaningTools', label: 'อุปกรณ์ทำความสะอาด' },
  { id: 'personalCare', label: 'ของใช้ส่วนตัว' },
  { id: 'bedding', label: 'เครื่องนอน' },
  { id: 'seatingFurniture', label: 'เฟอร์นิเจอร์นั่ง' },
  { id: 'computingDevices', label: 'คอมพิวเตอร์และโทรศัพท์' },
  { id: 'screenAccessories', label: 'จอภาพ' },
  { id: 'controllerAccessories', label: 'อุปกรณ์ควบคุม' },
  { id: 'speakerAccessories', label: 'ลำโพงและหูฟัง' },
  { id: 'coolingAppliances', label: 'เครื่องทำความเย็น' },
  { id: 'bottoms', label: 'กางเกงและกระโปรง' },
  { id: 'casualTops', label: 'เสื้อ' },
  { id: 'footwear', label: 'รองเท้า' },
  { id: 'jewelry', label: 'เครื่องประดับ' },
  { id: 'thaiTraditionalFestivals', label: 'เทศกาลไทย' },
  { id: 'yearEndCelebrations', label: 'เทศกาลปลายปี' },
  { id: 'nationalDays', label: 'วันสำคัญของชาติ' },
  { id: 'coffeeAndTeaDrinks', label: 'กาแฟและชา' },
  { id: 'fruitDrinks', label: 'น้ำผลไม้' },
  { id: 'sweetColdDrinks', label: 'เครื่องดื่มเย็นหวาน' },
  { id: 'thaiCurries', label: 'แกงไทย' },
  { id: 'thaiSoups', label: 'ต้ม' },
  { id: 'plainRice', label: 'ข้าว' },
  { id: 'ricePorridge', label: 'ข้าวต้มและโจ๊ก' },
  { id: 'thaiRiceDishes', label: 'เมนูข้าว' },
  { id: 'noodleDishes', label: 'ก๋วยเตี๋ยวและเส้น' },
  { id: 'stirFriedNoodles', label: 'ผัดเส้น' },
  { id: 'hotpot', label: 'หม้อไฟ' },
  { id: 'eggDishes', label: 'เมนูไข่' },
  { id: 'spicyThaiSalads', label: 'ยำและลาบ' },
  { id: 'westernFastFood', label: 'ฟาสต์ฟู้ด' },
  { id: 'bakery', label: 'ขนมอบ' },
  { id: 'westernDesserts', label: 'ของหวาน' },
  { id: 'commonFruits', label: 'ผลไม้' },
  { id: 'agriculture', label: 'อาชีพเกษตร' },
  { id: 'constructionTrades', label: 'ช่างก่อสร้าง' },
  { id: 'repairTrades', label: 'ช่างซ่อม' },
  { id: 'beautyProfessionals', label: 'ช่างความงาม' },
  { id: 'driversAndDelivery', label: 'ขับรถและส่งของ' },
  { id: 'aviationJobs', label: 'อาชีพการบิน' },
  { id: 'lawEnforcement', label: 'ตำรวจและทหาร' },
  { id: 'legalProfessions', label: 'อาชีพกฎหมาย' },
  { id: 'medicalProfessions', label: 'อาชีพการแพทย์' },
  { id: 'educationProfessions', label: 'อาชีพการศึกษา' },
  { id: 'newsAndPublishing', label: 'สื่อและสิ่งพิมพ์' },
  { id: 'performingArts', label: 'ศิลปินการแสดง' },
  { id: 'moviesSeries', label: 'ภาพยนตร์และซีรีส์' },
  { id: 'thaiInstruments', label: 'เครื่องดนตรีไทย' },
  { id: 'percussionInstruments', label: 'เครื่องกระทบ' },
  { id: 'stringInstruments', label: 'เครื่องสาย' },
  { id: 'musicGenres', label: 'ประเภทเพลง' },
  { id: 'coastalPlaces', label: 'ชายฝั่ง' },
  { id: 'mountainPlaces', label: 'ภูเขาและถ้ำ' },
  { id: 'naturalWaterPlaces', label: 'แหล่งน้ำธรรมชาติ' },
  { id: 'countrysidePlaces', label: 'ชนบท' },
  { id: 'residentialBuildings', label: 'ที่อยู่อาศัย' },
  { id: 'rooms', label: 'ห้องในบ้าน' },
  { id: 'markets', label: 'ตลาดและร้านค้า' },
  { id: 'personalServiceShops', label: 'ร้านบริการ' },
  { id: 'healthcarePlaces', label: 'สถานพยาบาล' },
  { id: 'educationalPlaces', label: 'สถานศึกษา' },
  { id: 'culturalPlaces', label: 'สถานที่วัฒนธรรม' },
  { id: 'religiousPlaces', label: 'สถานที่ทางศาสนา' },
  { id: 'governmentPlaces', label: 'สถานที่ราชการ' },
  { id: 'transportHubs', label: 'ศูนย์การเดินทาง' },
  { id: 'roadInfrastructure', label: 'โครงสร้างถนน' },
  { id: 'vehicleFacilities', label: 'สถานีบริการยานพาหนะ' },
  { id: 'sportsPlaces', label: 'สถานที่กีฬา' },
  { id: 'familyAttractions', label: 'สถานที่ครอบครัว' },
  { id: 'relationships', label: 'ความสัมพันธ์' },
  { id: 'teamBallSports', label: 'กีฬาทีมลูกบอล' },
  { id: 'racketSports', label: 'กีฬาราเก็ต' },
  { id: 'strikingMartialArts', label: 'ศิลปะการต่อสู้' },
  { id: 'precisionSports', label: 'กีฬาความแม่นยำ' },
  { id: 'waterSports', label: 'กีฬาทางน้ำ' },
  { id: 'wheeledSports', label: 'กีฬาล้อ' },
  { id: 'winterSports', label: 'กีฬาฤดูหนาว' },
  { id: 'racingSports', label: 'กีฬาแข่งความเร็ว' },
  { id: 'audioDevices', label: 'อุปกรณ์เสียง' },
  { id: 'wirelessTechnology', label: 'เทคโนโลยีไร้สาย' },
  { id: 'onlineCommunication', label: 'การสื่อสารออนไลน์' },
  { id: 'meetingPlatforms', label: 'แพลตฟอร์มประชุม' },
  { id: 'socialMediaPlatforms', label: 'โซเชียลมีเดีย' },
  { id: 'videoStreamingPlatforms', label: 'สตรีมวิดีโอ' },
  { id: 'digitalMediaFormats', label: 'สื่อดิจิทัล' },
  { id: 'dataTransferActions', label: 'การโอนข้อมูล' },
  { id: 'globalTechCompanies', label: 'บริษัทเทคโนโลยี' },
  { id: 'emotions', label: 'อารมณ์' },
  { id: 'fantasyCharacters', label: 'ตัวละครแฟนตาซี' },
  { id: 'movieGenres', label: 'ประเภทภาพยนตร์' },
  { id: 'transportation', label: 'การขนส่ง' },
  { id: 'weather', label: 'สภาพอากาศ' },
  { id: 'tastes', label: 'รสชาติ' },
] as const;

export const UNDERCOVER_RANDOM_CATEGORY_ID = 'random';

export const UNDERCOVER_CLUE_TIMER_OPTIONS = [15, 30, 45, 60] as const;
export const UNDERCOVER_DISCUSSION_TIMER_OPTIONS = [30, 60, 90] as const;
export const UNDERCOVER_MAX_CLUE_ROUNDS_OPTIONS = [1, 2, 3] as const;

export interface UndercoverLobbyOptions {
  categoryId: string;
  undercoverCount: number;
  mrWhiteEnabled: boolean;
  timerEnabled: boolean;
  clueTimerSec: (typeof UNDERCOVER_CLUE_TIMER_OPTIONS)[number];
  discussionTimerSec: (typeof UNDERCOVER_DISCUSSION_TIMER_OPTIONS)[number];
  maxClueRounds: number;
  randomEliminationOnTie: boolean;
  allowRecheckRole: boolean;
  roleAssignment: 'auto';
}

export function defaultUndercoverLobbyOptions(): UndercoverLobbyOptions {
  return {
    categoryId: UNDERCOVER_RANDOM_CATEGORY_ID,
    undercoverCount: 1,
    mrWhiteEnabled: true,
    timerEnabled: true,
    clueTimerSec: 30,
    discussionTimerSec: 60,
    maxClueRounds: 1,
    randomEliminationOnTie: false,
    allowRecheckRole: true,
    roleAssignment: 'auto',
  };
}

/** Recommended undercover count for player count (before host override). */
export function recommendedUndercoverCount(playerCount: number): number {
  if (playerCount <= 5) return 1;
  if (playerCount <= 8) return 1;
  if (playerCount <= 12) return 2;
  return Math.max(2, Math.round(playerCount * 0.22));
}

/** Whether Mr. White is recommended for player count. */
export function recommendedMrWhiteEnabled(playerCount: number): boolean {
  return playerCount >= 6;
}

export function undercoverCountBounds(
  playerCount: number,
  mrWhiteEnabled: boolean,
): { min: number; max: number } {
  const mrCount = mrWhiteEnabled ? 1 : 0;
  const min = 1;
  const max = Math.max(1, playerCount - mrCount - 1);
  return { min, max };
}

export function parseUndercoverLobbyOptions(
  raw: unknown,
  playerCount?: number,
): UndercoverLobbyOptions {
  const defaults = defaultUndercoverLobbyOptions();
  if (!raw || typeof raw !== 'object') {
    if (playerCount != null) {
      return {
        ...defaults,
        undercoverCount: recommendedUndercoverCount(playerCount),
        mrWhiteEnabled: recommendedMrWhiteEnabled(playerCount),
      };
    }
    return defaults;
  }
  const o = raw as Record<string, unknown>;

  let categoryId = defaults.categoryId;
  if (typeof o.categoryId === 'string' && o.categoryId.trim()) {
    categoryId = o.categoryId.trim();
  }
  const validCategory =
    categoryId === UNDERCOVER_RANDOM_CATEGORY_ID ||
    UNDERCOVER_CATEGORIES.some((c) => c.id === categoryId);
  if (!validCategory) categoryId = defaults.categoryId;

  let undercoverCount =
    typeof o.undercoverCount === 'number' && Number.isFinite(o.undercoverCount)
      ? Math.round(o.undercoverCount)
      : playerCount != null
        ? recommendedUndercoverCount(playerCount)
        : defaults.undercoverCount;

  const mrWhiteFromOpts =
    o.mrWhiteEnabled === false ? false : o.mrWhiteEnabled === true ? true : defaults.mrWhiteEnabled;
  const effectiveMrWhite = playerCount != null && playerCount < 6 ? false : mrWhiteFromOpts;

  if (playerCount != null) {
    const { min, max } = undercoverCountBounds(playerCount, effectiveMrWhite);
    undercoverCount = Math.min(max, Math.max(min, undercoverCount));
  }

  return {
    categoryId,
    undercoverCount,
    mrWhiteEnabled: effectiveMrWhite,
    timerEnabled: true,
    clueTimerSec: defaults.clueTimerSec,
    discussionTimerSec: defaults.discussionTimerSec,
    maxClueRounds: defaults.maxClueRounds,
    randomEliminationOnTie: false,
    allowRecheckRole: true,
    roleAssignment: 'auto',
  };
}

export type UndercoverAction =
  | { type: 'acknowledge_role' }
  | { type: 'complete_clue' }
  | { type: 'host_skip_player' }
  | { type: 'start_voting' }
  | { type: 'cast_vote'; targetId: string }
  | { type: 'mr_white_guess'; text: string }
  | { type: 'ack_elimination' }
  | { type: 'recheck_role' }
  | { type: 'dismiss_recheck_role' };

export interface UndercoverPublicPlayer {
  id: string;
  name: string;
  eliminated: boolean;
  hasAcknowledgedRole: boolean;
}

export interface UndercoverVoteRecord {
  roundNo: number;
  votes: Record<string, string>;
  eliminatedId: string | null;
  tie: boolean;
}

export interface UndercoverPlayerView {
  phase: UndercoverPhase;
  roundNo: number;
  hostId: string;
  players: UndercoverPublicPlayer[];
  you: {
    id: string;
    name: string;
    role?: UndercoverRole;
    secretWord?: string;
    hasAcknowledgedRole: boolean;
    eliminated: boolean;
  };
  categoryLabel: string;
  timerEnabled: boolean;
  allowRecheckRole: boolean;
  roleAcknowledgeProgress: { current: number; total: number };
  clueTurn: {
    currentPlayerId: string | null;
    currentPlayerName: string | null;
    index: number;
    total: number;
    clueRoundNo: number;
    maxClueRounds: number;
  };
  clueEndsAtMs: number | null;
  discussionEndsAtMs: number | null;
  voteProgress: { done: number; total: number };
  yourVoteSubmitted: boolean;
  tieBreakCandidates: { id: string; name: string }[];
  voteResults: Record<string, number> | null;
  tiedPlayerIds: string[] | null;
  eliminationReveal: {
    playerId: string;
    playerName: string;
  } | null;
  eliminationAckProgress: { current: number; total: number };
  mrWhiteGuessPrompt: boolean;
  recheckRoleView: { secretWord?: string } | null;
  lastEvent: string;
  gameResult: GameResult | null;
  gameOverReveal?: {
    civilianWord: string;
    undercoverWord: string;
    categoryLabel: string;
    roles: Record<string, UndercoverRole>;
    words: Record<string, string | undefined>;
    voteHistory: UndercoverVoteRecord[];
    roundsPlayed: number;
    mostVotedPlayerId: string | null;
    winningTeam: 'civilian' | 'hidden' | 'mr_white';
  };
}

export interface UndercoverPlayerFull {
  id: string;
  name: string;
  role: UndercoverRole;
  eliminated: boolean;
}

export interface UndercoverState {
  phase: UndercoverPhase;
  hostId: string;
  players: UndercoverPlayerFull[];
  playerNames: Record<string, string>;
  options: UndercoverLobbyOptions;
  categoryLabel: string;
  civilianWord: string;
  undercoverWord: string;
  civilianVariants: string[];
  roleAcknowledged: Record<string, true>;
  roleAcknowledgeCount: number;
  roundNo: number;
  clueRoundNo: number;
  clueOrder: string[];
  clueIndex: number;
  clueEndsAtMs: number | null;
  discussionEndsAtMs: number | null;
  votes: Record<string, string>;
  tieBreakCandidates: string[];
  isTieBreakVote: boolean;
  voteResults: Record<string, number> | null;
  tiedPlayerIds: string[] | null;
  pendingEliminationId: string | null;
  eliminationAcknowledged: Record<string, true>;
  eliminationAckCount: number;
  mrWhiteGuessPlayerId: string | null;
  voteHistory: UndercoverVoteRecord[];
  recheckRoleViewByPlayer: Record<string, { secretWord?: string }>;
  lastEvent: string;
  outcome: GameResult | null;
  winningTeam: 'civilian' | 'hidden' | 'mr_white' | null;
}
