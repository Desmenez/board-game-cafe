import type { TtrBoardLayout } from '../boardGeometry';

/**
 * Overlay calibration for the printed Japan board (`map-japan_vc7lwd`, 2784×1536).
 * Tune in `/dev/ticket-to-ride-layout` and paste the exported JSON back over these defaults.
 *
 * `tokyo` / `kokura` have two markers: [0] main board, [1] zoom inset.
 * Route geometry picks the shortest marker pair so inset tracks stay in the boxes.
 */
export const JAPAN_BOARD_LAYOUT: TtrBoardLayout = {
  aspectRatio: 1.8125,
  citySize: 1.5,
  slot: {
    length: 2.6,
    width: 1.1,
    gap: 0.1,
    endPad: 1.5,
  },
  parallelSpacing: 1.35,
  cities: {
    hakodate: { left: 97.3, top: 7.8 },
    aomori: { left: 93.7, top: 20.7 },
    akita: { left: 84.8, top: 32.9 },
    morioka: { left: 92.1, top: 39.5 },
    miyako: { left: 96.5, top: 44.7 },
    shinjo: { left: 82.5, top: 47 },
    sendai: { left: 84.7, top: 60.3 },
    niigata: { left: 71.9, top: 51.9 },
    fukushima: { left: 79.8, top: 62.9 },
    iwaki: { left: 79.2, top: 77.4 },
    utsunomiya: { left: 72.2, top: 77.6 },
    takasaki: { left: 64.7, top: 74.4 },
    nagano: { left: 60.8, top: 65.3 },
    matsumoto: { left: 56.7, top: 70.7 },
    kanazawa: { left: 51.1, top: 56.7 },
    tsuruga: { left: 42.5, top: 67.2 },
    tokyo: [
      { left: 66.5, top: 88.6 },
      { left: 50.9, top: 30.1 },
    ],
    narita: { left: 71.3, top: 91.8 },
    odawara: { left: 61.8, top: 92.6 },
    hamamatsu: { left: 51.3, top: 92.3 },
    nagoya: { left: 46.5, top: 79 },
    ise: { left: 42, top: 88.9 },
    kyoto: { left: 38.9, top: 75 },
    osaka: { left: 34.2, top: 76.7 },
    tottori: { left: 30.8, top: 55.8 },
    okayama: { left: 25.2, top: 65.6 },
    hiroshima: { left: 14.9, top: 60.3 },
    masuda: { left: 11.9, top: 52.1 },
    matsuyama: { left: 13.4, top: 69.4 },
    takamatsu: { left: 23.8, top: 74.1 },
    kochi: { left: 17.4, top: 81.9 },
    kokura: [
      { left: 1.3, top: 57.2 },
      { left: 25.6, top: 12.4 },
    ],
    hakata: { left: 20.7, top: 11.5 },
    nagasaki: { left: 12.9, top: 16.6 },
    kumamoto: { left: 17.1, top: 23.5 },
    oita: { left: 25, top: 25.9 },
    miyazaki: { left: 16.5, top: 42.3 },
    'kagoshima-chuo': { left: 9.5, top: 36.5 },
    ikebukuro: { left: 44.5, top: 13.3 },
    ueno: { left: 54.5, top: 17.7 },
    'kita-senju': { left: 61.9, top: 13.5 },
    asakusa: { left: 65.2, top: 20.1 },
    suitengumae: { left: 59, top: 28.9 },
    'monzen-nakacho': { left: 63.7, top: 40.1 },
    ginza: { left: 53.2, top: 38 },
    yotsuya: { left: 45.6, top: 28.9 },
    shinjuku: { left: 37.8, top: 28.8 },
    shibuya: { left: 42.5, top: 41.8 },
  },
  routes: {
    'kok-mat': {
      waypoints: [
        { left: 1.5, top: 59.4 },
        { left: 4.1, top: 63.4 },
        { left: 6.6, top: 66.1 },
        { left: 9.3, top: 68.1 },
        { left: 13.5, top: 69.7 },
      ],
      slotLength: 3,
    },
    'hir-kok': {
      waypoints: [
        { left: 1.5, top: 57.7 },
        { left: 5.1, top: 59.8 },
        { left: 8, top: 60.7 },
        { left: 10.9, top: 61 },
        { left: 14.6, top: 60.7 },
      ],
      slotLength: 2.85,
    },
    'hir-mas-1': {
      slotLength: 2.95,
    },
    'hir-mas-2': {
      waypoints: [
        { left: 14.5, top: 60.1 },
        { left: 11.8, top: 52.6 },
      ],
      slotLength: 2.95,
    },
    'hir-mat-2': {
      waypoints: [
        { left: 13.4, top: 69.8 },
      ],
      slotLength: 3.05,
      offset: 0.55,
    },
    'hir-mat-1': {
      waypoints: [
        { left: 13.4, top: 69.7 },
      ],
      slotLength: 3.05,
      offset: -0.55,
    },
    'mas-kok-2': {
      waypoints: [
        { left: 12.2, top: 51.7 },
        { left: 7.9, top: 51.7 },
        { left: 4.8, top: 53.1 },
        { left: 1, top: 56.4 },
      ],
      slotLength: 3.3,
    },
    'mas-kok-1': {
      waypoints: [
        { left: 1.2, top: 55.6 },
        { left: 4.7, top: 52.6 },
        { left: 7.8, top: 51.1 },
        { left: 11.6, top: 51.1 },
      ],
      slotLength: 2.95,
    },
    'mat-kochi': {
      waypoints: [
        { left: 16.9, top: 81.3 },
        { left: 15, top: 76.5 },
        { left: 13.4, top: 70.7 },
      ],
      slotLength: 2.9,
    },
    'takamatsu-kochi': {
      waypoints: [
        { left: 17.2, top: 82.5 },
        { left: 20.9, top: 78.5 },
        { left: 24.2, top: 73.6 },
      ],
      slotLength: 2.95,
    },
    'takamatsu-mat': {
      waypoints: [
        { left: 24, top: 73.7 },
        { left: 13.1, top: 69.4 },
      ],
      slotLength: 3.1,
    },
    'oka-hir': {
      waypoints: [
        { left: 25.4, top: 65.6 },
        { left: 14.7, top: 60.3 },
      ],
      slotLength: 3.05,
    },
    'tot-mas': {
      waypoints: [
        { left: 31.2, top: 55.7 },
        { left: 27, top: 53.8 },
        { left: 24.2, top: 52.7 },
        { left: 21.4, top: 51.8 },
        { left: 18.5, top: 51.3 },
        { left: 15.7, top: 51.1 },
        { left: 11.5, top: 51.2 },
      ],
      slotLength: 2.8,
    },
    'tot-oka': {
      slotLength: 2.9,
    },
    'osa-oka': {
      waypoints: [
        { left: 34.3, top: 77.1 },
        { left: 31, top: 72.5 },
        { left: 28.8, top: 69.6 },
        { left: 24.9, top: 65.7 },
      ],
      slotLength: 3.1,
    },
    'osa-takamatsu': {
      waypoints: [
        { left: 34.1, top: 77.7 },
        { left: 30.2, top: 77.4 },
        { left: 27.4, top: 76.7 },
        { left: 23.6, top: 74.9 },
      ],
      slotLength: 3,
    },
    'oka-takamatsu-2': {
      waypoints: [
        { left: 23.9, top: 74.1 },
        { left: 25.2, top: 65.9 },
      ],
      slotLength: 2.95,
    },
    'oka-takamatsu-1': {
      waypoints: [
        { left: 23.6, top: 74.3 },
        { left: 25, top: 65.3 },
      ],
      slotLength: 2.95,
    },
    'osa-tot': {
      waypoints: [
        { left: 34.7, top: 77 },
        { left: 32.5, top: 69.2 },
        { left: 31.5, top: 64.7 },
        { left: 30.4, top: 57.8 },
      ],
      slotLength: 2.85,
    },
    'kyo-osa': {
      slotLength: 2.9,
    },
    'kyo-tot': {
      waypoints: [
        { left: 38.8, top: 75.5 },
        { left: 30.5, top: 55.7 },
      ],
      slotLength: 2.9,
    },
    'tot-tsu': {
      waypoints: [
        { left: 42.6, top: 66.7 },
        { left: 39.5, top: 62.7 },
        { left: 37, top: 60 },
        { left: 34.5, top: 57.8 },
        { left: 31, top: 55.4 },
      ],
      slotLength: 2.85,
    },
    'ise-osa': {
      waypoints: [
        { left: 42, top: 89.9 },
        { left: 38.3, top: 86.5 },
        { left: 36, top: 83 },
        { left: 33.6, top: 77.6 },
      ],
      slotLength: 2.9,
    },
    'kyo-ise': {
      waypoints: [
        { left: 41.4, top: 88.5 },
        { left: 39.7, top: 82 },
        { left: 38.6, top: 75.5 },
      ],
      slotLength: 2.95,
    },
    'tsu-kyo': {
      waypoints: [
        { left: 42.2, top: 67.9 },
        { left: 38.9, top: 74.1 },
      ],
      slotLength: 2.9,
    },
    'nagoya-kyo': {
      waypoints: [
        { left: 39.2, top: 74.8 },
        { left: 46, top: 78.6 },
      ],
      slotLength: 2.85,
    },
    'nagoya-ise': {
      waypoints: [
        { left: 46.7, top: 79.1 },
        { left: 42.7, top: 81.8 },
        { left: 41.8, top: 89.3 },
      ],
      slotLength: 2.95,
    },
    'tsu-nagoya': {
      waypoints: [
        { left: 46.4, top: 78.7 },
        { left: 42.8, top: 67.2 },
      ],
      slotLength: 2.85,
    },
    'kan-tsu': {
      waypoints: [
        { left: 50.9, top: 55.8 },
        { left: 42.2, top: 67.4 },
      ],
      slotLength: 3,
    },
    'kan-nagoya': {
      waypoints: [
        { left: 51.4, top: 56.3 },
        { left: 46.5, top: 79.5 },
      ],
      slotLength: 3.1,
    },
    'ham-nagoya': {
      waypoints: [
        { left: 51.5, top: 92.7 },
        { left: 47.2, top: 91.6 },
        { left: 45.8, top: 86.3 },
        { left: 46.5, top: 78.6 },
      ],
      slotLength: 3.05,
    },
    'nag-kan': {
      waypoints: [
        { left: 60.9, top: 65.8 },
        { left: 60.1, top: 58.7 },
        { left: 57.7, top: 55.1 },
        { left: 54.7, top: 53.3 },
        { left: 50.9, top: 56.2 },
      ],
      slotLength: 3.1,
    },
    'nag-mat': {
      waypoints: [
        { left: 56.8, top: 70.4 },
        { left: 60.7, top: 65.6 },
      ],
      slotLength: 2.85,
    },
    'mat-tok': {
      waypoints: [
        { left: 65.9, top: 88.8 },
        { left: 57.4, top: 70.7 },
      ],
      slotLength: 2.75,
    },
    'oda-ham': {
      waypoints: [
        { left: 62, top: 92.7 },
        { left: 51, top: 92.3 },
      ],
      slotLength: 3.2,
    },
    'mat-nagoya-1': {
      waypoints: [
        { left: 57.3, top: 70.4 },
        { left: 53.5, top: 75 },
        { left: 50.4, top: 77.6 },
        { left: 46.1, top: 80.3 },
      ],
      slotLength: 2.95,
    },
    'mat-nagoya-2': {
      waypoints: [
        { left: 56.8, top: 71.5 },
        { left: 53.2, top: 75.8 },
        { left: 50.5, top: 78.1 },
        { left: 47, top: 80.3 },
      ],
      slotLength: 2.85,
    },
    'tak-nag': {
      waypoints: [
        { left: 64.8, top: 74.7 },
        { left: 60.5, top: 73.2 },
        { left: 60.9, top: 65.2 },
      ],
      slotLength: 3.15,
    },
    'tok-oda': {
      slotLength: 2.95,
    },
    'tak-tok': {
      waypoints: [
        { left: 64.8, top: 74.4 },
      ],
      slotLength: 2.9,
    },
    'mat-oda': {
      waypoints: [
        { left: 61.7, top: 92.6 },
        { left: 56.6, top: 71 },
      ],
      slotLength: 2.8,
    },
    'nii-nag': {
      waypoints: [
        { left: 72, top: 51.6 },
        { left: 60.7, top: 66 },
      ],
      slotLength: 3.05,
    },
    'nii-tak': {
      waypoints: [
        { left: 71.8, top: 52.4 },
        { left: 70.2, top: 60 },
        { left: 69, top: 64.1 },
        { left: 67.6, top: 68.3 },
        { left: 64.5, top: 74.8 },
      ],
      slotLength: 2.85,
    },
    'uts-tak': {
      waypoints: [
        { left: 72.4, top: 77.5 },
        { left: 68.4, top: 75.3 },
        { left: 64.5, top: 74.5 },
      ],
      slotLength: 3,
    },
    'uts-tok': {
      waypoints: [
        { left: 72.2, top: 77.4 },
      ],
      slotLength: 2.8,
    },
    'uts-nar': {
      waypoints: [
        { left: 72.4, top: 77.5 },
        { left: 72.4, top: 84.7 },
        { left: 71.7, top: 91.3 },
      ],
      slotLength: 3.1,
    },
    'fuk-nii': {
      waypoints: [
        { left: 79.9, top: 63.2 },
        { left: 75.5, top: 62.9 },
        { left: 73.6, top: 58.2 },
        { left: 71.6, top: 51.8 },
      ],
      slotLength: 3,
    },
    'nar-tok-2': {
      waypoints: [
        { left: 71.1, top: 92.2 },
        { left: 66.4, top: 89 },
      ],
      slotLength: 2.9,
    },
    'nar-tok-1': {
      waypoints: [
        { left: 66.8, top: 88.7 },
      ],
      slotLength: 2.9,
    },
    'nar-iwa': {
      waypoints: [
        { left: 72, top: 92.2 },
        { left: 75, top: 87.4 },
        { left: 76.9, top: 83.7 },
        { left: 79.5, top: 77.1 },
      ],
      slotLength: 2.85,
    },
    'fuk-uts': {
      waypoints: [
        { left: 79.9, top: 62.3 },
        { left: 71.9, top: 78.4 },
      ],
      slotLength: 2.8,
    },
    'fuk-iwa': {
      waypoints: [
        { left: 79.2, top: 77 },
        { left: 79.3, top: 70.2 },
        { left: 79.9, top: 63.3 },
      ],
      slotLength: 2.95,
    },
    'sen-iwa': {
      waypoints: [
        { left: 85, top: 60 },
        { left: 83.6, top: 67.2 },
        { left: 82.3, top: 71.8 },
        { left: 80, top: 77.7 },
      ],
      slotLength: 2.9,
    },
    'sen-fuk': {
      waypoints: [
        { left: 80.1, top: 62.6 },
      ],
      slotLength: 2.95,
    },
    'shi-nii': {
      waypoints: [
        { left: 82.4, top: 46.4 },
        { left: 78.8, top: 49.5 },
        { left: 75.9, top: 51.4 },
        { left: 72.2, top: 52.7 },
      ],
      slotLength: 2.95,
    },
    'nii-aki': {
      waypoints: [
        { left: 84.2, top: 33.1 },
        { left: 72.1, top: 51 },
      ],
      slotLength: 2.75,
    },
    'hak-aom-long': {
      waypoints: [
        { left: 96.8, top: 6.4 },
        { left: 93.6, top: 8.8 },
        { left: 92, top: 14.1 },
        { left: 92.9, top: 20.6 },
      ],
      slotLength: 3.1,
    },
    'hak-aom-short': {
      waypoints: [
        { left: 94.2, top: 20.2 },
        { left: 97, top: 8.1 },
      ],
      slotLength: 2.8,
    },
    'fuk-shi': {
      waypoints: [
        { left: 82.3, top: 48 },
        { left: 79.9, top: 52 },
        { left: 77.5, top: 56.1 },
        { left: 79.5, top: 61.9 },
      ],
      slotLength: 2.95,
    },
    'miy-sen': {
      waypoints: [
        { left: 96.6, top: 43.9 },
        { left: 95.6, top: 51.7 },
        { left: 94, top: 56.3 },
        { left: 91.6, top: 59.9 },
        { left: 88.9, top: 61.5 },
        { left: 84.6, top: 61.4 },
      ],
      slotLength: 2.95,
    },
    'mor-sen': {
      waypoints: [
        { left: 92.5, top: 40 },
        { left: 90.7, top: 46.8 },
        { left: 89.6, top: 50.7 },
        { left: 87.8, top: 55.1 },
        { left: 85.1, top: 60.6 },
      ],
      slotLength: 3.1,
    },
    'mor-miy': {
      waypoints: [
        { left: 96.3, top: 44.1 },
        { left: 92.3, top: 39.9 },
      ],
      slotLength: 2.95,
    },
    'aki-shi': {
      waypoints: [
        { left: 84.9, top: 33.2 },
        { left: 84.1, top: 40.3 },
        { left: 82.5, top: 47.2 },
      ],
      slotLength: 2.9,
    },
    'mor-shi': {
      waypoints: [
        { left: 92.4, top: 38.6 },
        { left: 88.9, top: 43 },
        { left: 86.3, top: 45.4 },
        { left: 82.2, top: 48.1 },
      ],
      slotLength: 2.85,
    },
    'aom-miy': {
      waypoints: [
        { left: 94, top: 19.5 },
        { left: 98, top: 22.2 },
        { left: 99, top: 27.8 },
        { left: 98.6, top: 33 },
        { left: 97.9, top: 38.1 },
        { left: 96.3, top: 45.3 },
      ],
      slotLength: 3.2,
    },
    'aom-mor': {
      waypoints: [
        { left: 93.5, top: 21.4 },
        { left: 97.2, top: 24.9 },
        { left: 97.2, top: 30.8 },
        { left: 95.2, top: 35.3 },
        { left: 92.2, top: 40 },
      ],
      slotLength: 3.2,
    },
    'aki-mor': {
      waypoints: [
        { left: 91.8, top: 38.7 },
        { left: 88.7, top: 35.6 },
        { left: 85.3, top: 33.1 },
      ],
      slotLength: 2.85,
    },
    'aom-aki': {
      waypoints: [
        { left: 93.9, top: 20.5 },
        { left: 85.2, top: 32.1 },
      ],
      slotLength: 3,
    },
    'kum-kag': {
      waypoints: [
        { left: 17.4, top: 22.8 },
        { left: 14, top: 27.1 },
        { left: 11.9, top: 30.7 },
        { left: 9.1, top: 36.9 },
      ],
      slotLength: 2.85,
    },
    'kum-oit-1': {
      waypoints: [
        { left: 24.8, top: 26.4 },
        { left: 21.2, top: 25.8 },
        { left: 17.4, top: 24.1 },
      ],
      slotLength: 3,
    },
    'kum-oit-2': {
      waypoints: [
        { left: 24.8, top: 25.8 },
        { left: 21.3, top: 25.4 },
        { left: 17.5, top: 23.5 },
      ],
      slotLength: 3,
    },
    'miy-kag': {
      waypoints: [
        { left: 16.5, top: 42.6 },
        { left: 9.4, top: 36.5 },
      ],
      slotLength: 2.75,
    },
    'kok-hak': {
      waypoints: [
        { left: 25.4, top: 12.1 },
        { left: 20.6, top: 11.4 },
      ],
      slotLength: 2.8,
    },
    'oit-miy': {
      waypoints: [
        { left: 25.2, top: 25.4 },
        { left: 24.4, top: 32.7 },
        { left: 22.8, top: 37.4 },
        { left: 20.6, top: 41.1 },
        { left: 16.3, top: 42.8 },
      ],
      slotLength: 3.15,
    },
    'kum-miy': {
      waypoints: [
        { left: 17.3, top: 23 },
        { left: 16.5, top: 42.9 },
      ],
      slotLength: 2.8,
    },
    'nag-kum-1': {
      waypoints: [
        { left: 16.5, top: 22.7 },
        { left: 13.5, top: 18 },
      ],
      slotLength: 2.85,
    },
    'nag-kum-2': {
      waypoints: [
        { left: 16.6, top: 22.3 },
        { left: 13.7, top: 17.7 },
      ],
      slotLength: 2.85,
    },
    'hak-nag-2': {
      waypoints: [
        { left: 20.8, top: 11.6 },
        { left: 16.8, top: 13.4 },
        { left: 13.1, top: 16.1 },
      ],
      slotLength: 2.9,
    },
    'hak-nag-1': {
      waypoints: [
        { left: 20.7, top: 11 },
        { left: 16.7, top: 12.9 },
        { left: 13.2, top: 15.5 },
      ],
      slotLength: 2.85,
    },
    'hak-kum': {
      waypoints: [
        { left: 21, top: 11.8 },
        { left: 19.3, top: 18 },
        { left: 17.2, top: 23.8 },
      ],
      slotLength: 3,
    },
    'kok-oit-2': {
      waypoints: [
        { left: 25.2, top: 26.2 },
        { left: 25.6, top: 12.2 },
      ],
      slotLength: 2.85,
    },
    'kok-oit-1': {
      waypoints: [
        { left: 24.9, top: 25.4 },
        { left: 25.3, top: 12.8 },
      ],
      slotLength: 2.85,
    },
    'tk-sin-shi-2': {
      waypoints: [
        { left: 42.2, top: 42.3 },
        { left: 39.8, top: 36.3 },
        { left: 37.9, top: 28.9 },
      ],
      slotLength: 3.15,
    },
    'tk-sin-shi-1': {
      waypoints: [
        { left: 41.8, top: 42.1 },
        { left: 39.6, top: 36.4 },
        { left: 37.7, top: 29.9 },
      ],
      slotLength: 2.95,
    },
    'tk-shi-yot-1': {
      waypoints: [
        { left: 45.9, top: 29.2 },
        { left: 44, top: 35.1 },
        { left: 42.6, top: 41.8 },
      ],
      slotLength: 2.9,
    },
    'tk-sin-yot-1': {
      waypoints: [
        { left: 45, top: 29 },
        { left: 38.6, top: 28.8 },
      ],
      slotLength: 2.85,
    },
    'tk-sin-yot-2': {
      waypoints: [
        { left: 45.5, top: 28.6 },
        { left: 41.9, top: 28.4 },
        { left: 38.1, top: 28.3 },
      ],
      slotLength: 2.85,
    },
    'tk-ike-yot': {
      waypoints: [
        { left: 45.5, top: 28.6 },
        { left: 45.4, top: 21.4 },
        { left: 44.6, top: 14.1 },
      ],
      slotLength: 3.1,
    },
    'tk-ike-sin-2': {
      waypoints: [
        { left: 44.5, top: 12 },
        { left: 41.2, top: 18.1 },
        { left: 39.2, top: 22.9 },
        { left: 37.3, top: 28.8 },
      ],
      slotLength: 3.05,
    },
    'tk-ike-sin-1': {
      waypoints: [
        { left: 43.9, top: 12.4 },
        { left: 41.4, top: 16.9 },
        { left: 39.2, top: 21.9 },
        { left: 37.3, top: 27.7 },
      ],
      slotLength: 2.9,
    },
    'tk-yot-tok-1': {
      waypoints: [
        { left: 50.2, top: 29.6 },
        { left: 46, top: 29.4 },
      ],
      slotLength: 3,
    },
    'tk-yot-tok-2': {
      waypoints: [
        { left: 50.4, top: 29.1 },
        { left: 46, top: 28.9 },
      ],
      slotLength: 3,
    },
    'tk-ike-uen-1': {
      waypoints: [
        { left: 54.2, top: 17 },
        { left: 44.9, top: 13.5 },
      ],
      slotLength: 2.8,
    },
    'tk-ike-uen-2': {
      waypoints: [
        { left: 54.3, top: 16.5 },
        { left: 45, top: 12.9 },
      ],
      slotLength: 2.8,
    },
    'tk-tok-uen-1': {
      waypoints: [
        { left: 54.3, top: 18.9 },
        { left: 52.6, top: 24 },
        { left: 50.9, top: 28.7 },
      ],
      slotLength: 2.85,
    },
    'tk-tok-gin-1': {
      waypoints: [
        { left: 53.2, top: 37.9 },
        { left: 51.3, top: 30.1 },
      ],
      slotLength: 2.8,
    },
    'tk-sui-gin': {
      waypoints: [
        { left: 53.5, top: 37.7 },
        { left: 56.4, top: 34.4 },
        { left: 59.4, top: 31.1 },
      ],
      slotLength: 2.85,
    },
    'tk-mon-gin': {
      waypoints: [
        { left: 63.9, top: 41.1 },
        { left: 59.8, top: 41.1 },
        { left: 56.8, top: 40.3 },
        { left: 52.8, top: 38.3 },
      ],
      slotLength: 2.95,
    },
    'tk-tok-uen-2': {
      waypoints: [
        { left: 54, top: 18.8 },
        { left: 52.4, top: 23.6 },
        { left: 50.7, top: 28.4 },
      ],
      slotLength: 2.9,
    },
    'tk-uen-kit-1': {
      waypoints: [
        { left: 62.1, top: 13.4 },
        { left: 58.1, top: 14.9 },
        { left: 54.3, top: 17.7 },
      ],
      slotLength: 2.95,
    },
    'tk-uen-kit-2': {
      waypoints: [
        { left: 61.3, top: 13.1 },
        { left: 58, top: 14.5 },
        { left: 54.8, top: 16.7 },
      ],
      slotLength: 2.85,
    },
    'tk-uen-sui': {
      waypoints: [
        { left: 58.9, top: 28.1 },
        { left: 54.9, top: 18.2 },
      ],
      slotLength: 2.9,
    },
    'tk-shi-tok-2': {
      waypoints: [
        { left: 51.2, top: 30.6 },
        { left: 48.5, top: 35.6 },
        { left: 46.2, top: 39.1 },
        { left: 43, top: 43 },
      ],
      slotLength: 2.95,
    },
    'tk-shi-tok-1': {
      waypoints: [
        { left: 51.4, top: 31.2 },
        { left: 48.6, top: 36.2 },
        { left: 46.4, top: 39.4 },
        { left: 43.2, top: 43.2 },
      ],
      slotLength: 2.8,
    },
    'tk-tok-sui-2': {
      waypoints: [
        { left: 58.3, top: 29.2 },
        { left: 51.8, top: 29.7 },
      ],
      slotLength: 2.85,
    },
    'tk-tok-sui-1': {
      waypoints: [
        { left: 58.8, top: 29.8 },
        { left: 51.4, top: 30.4 },
      ],
      slotLength: 2.85,
    },
    'tk-asa-mon': {
      waypoints: [
        { left: 65.7, top: 20.8 },
        { left: 65.6, top: 28.3 },
        { left: 65.3, top: 32.9 },
        { left: 64.2, top: 40.2 },
      ],
      slotLength: 2.85,
    },
    'tk-asa-sui-2': {
      waypoints: [
        { left: 60, top: 27.4 },
        { left: 64.1, top: 21.4 },
      ],
      slotLength: 2.75,
    },
    'tk-asa-sui-1': {
      waypoints: [
        { left: 64.5, top: 20.3 },
        { left: 59.3, top: 27.9 },
      ],
      slotLength: 3.05,
    },
    'tk-kit-asa-1': {
      waypoints: [
        { left: 61.8, top: 13.3 },
      ],
      slotLength: 2.9,
    },
    'tk-kit-asa-2': {
      waypoints: [
        { left: 64.9, top: 18.8 },
        { left: 62.5, top: 13.9 },
      ],
      slotLength: 2.95,
    },
    'tk-sui-mon-2': {
      waypoints: [
        { left: 63.3, top: 39 },
        { left: 59.6, top: 29.7 },
      ],
      slotLength: 2.75,
    },
    'tk-sui-mon-1': {
      waypoints: [
        { left: 62.8, top: 38.6 },
        { left: 59.7, top: 30.8 },
      ],
      slotLength: 2.9,
    },
    'shi-sen': {
      waypoints: [{ left: 84.6, top: 60.4 }],
      slotLength: 2.85,
    },
  },
};
