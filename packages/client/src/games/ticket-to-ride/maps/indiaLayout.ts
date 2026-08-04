import type { TtrBoardLayout } from '../boardGeometry';

/**
 * Overlay calibration for the printed India board (`map-india_rma5ac`, 1125×1744 portrait).
 * Tune in `/dev/ticket-to-ride-layout` and paste the exported JSON back over these defaults.
 */
export const INDIA_BOARD_LAYOUT: TtrBoardLayout = {
  aspectRatio: 1125 / 1744,
  /**
   * Portrait board is height-fitted in most viewports, so % of width paints small
   * on screen. Scale overlays up so cars stay readable vs landscape maps.
   */
  overlayScale: 1.25,
  citySize: 1.8,
  slot: {
    length: 3.2,
    width: 1.35,
    gap: 0.5,
    endPad: 1.8,
  },
  parallelSpacing: 1.6,
  cities: {
    peshawar: { left: 11.5, top: 6.5 },
    lahore: { left: 21.3, top: 8 },
    jacobabad: { left: 10.7, top: 19.6 },
    bhatinda: { left: 26.2, top: 17.6 },
    ambala: { left: 41.7, top: 17.3 },
    rohri: { left: 16.1, top: 24.9 },
    jodhpur: { left: 21, top: 30.6 },
    delhi: { left: 40.4, top: 27.3 },
    bareilly: { left: 50.3, top: 25.7 },
    lucknow: { left: 54.4, top: 31.6 },
    jarhat: { left: 97.5, top: 29.9 },
    karachi: { left: 2.5, top: 34.8 },
    jaipur: { left: 32.2, top: 35.4 },
    agra: { left: 42.1, top: 37 },
    patna: { left: 71.6, top: 35.6 },
    dhubri: { left: 86, top: 35.5 },
    ahmadabad: { left: 19.4, top: 43.7 },
    ratlam: { left: 27.9, top: 40.7 },
    bhopal: { left: 41.8, top: 43 },
    katni: { left: 57.1, top: 37.1 },
    bilaspur: { left: 57, top: 43.1 },
    calcutta: { left: 81.4, top: 44.8 },
    bombay: { left: 21.5, top: 57.4 },
    khandwa: { left: 31.2, top: 48.9 },
    raipur: { left: 55.2, top: 48.9 },
    chittagong: { left: 96.3, top: 43.2 },
    poona: { left: 30.4, top: 60.6 },
    manmad: { left: 30.3, top: 54.8 },
    indur: { left: 50.5, top: 53.6 },
    wadi: { left: 39.7, top: 61 },
    bezwada: { left: 52.2, top: 63.3 },
    waltain: { left: 67.1, top: 59.1 },
    mormugao: { left: 22.8, top: 63.7 },
    guntakal: { left: 38.1, top: 67 },
    madras: { left: 53.1, top: 69.6 },
    mangalore: { left: 28.8, top: 72.8 },
    calicut: { left: 31, top: 78.8 },
    erode: { left: 51.9, top: 79.9 },
    quilon: { left: 37.1, top: 88 },
  },
  routes: {
    'pes-jac-2': {
      waypoints: [
        { left: 10.4, top: 6.8 },
        { left: 9.2, top: 10.1 },
        { left: 8.7, top: 14.3 },
        { left: 10.4, top: 19.6 },
      ],
      slotLength: 4.1,
    },
    'pes-jac-1': {
      waypoints: [
        { left: 10, top: 7.4 },
        { left: 8.5, top: 11.2 },
        { left: 8.4, top: 14.3 },
        { left: 10.1, top: 19.2 },
      ],
      slotLength: 3.95,
    },
    'pes-lah-2': {
      slotLength: 4.35,
      offset: 0.75,
    },
    'pes-lah-1': {
      slotLength: 4.35,
    },
    'lah-amb': {
      waypoints: [
        { left: 21.3, top: 7.7 },
        { left: 28.4, top: 9.1 },
        { left: 33.8, top: 11.1 },
        { left: 38, top: 13.3 },
        { left: 42.6, top: 16.9 },
      ],
      slotLength: 4,
    },
    'lah-bha-2': {
      waypoints: [
        { left: 21.3, top: 8.1 },
        { left: 25.8, top: 17 },
      ],
      slotLength: 4,
    },
    'lah-bha-1': {
      waypoints: [
        { left: 21.1, top: 7.8 },
        { left: 26.3, top: 17.7 },
      ],
      slotLength: 4.1,
      offset: -0.8,
    },
    'jac-kar': {
      waypoints: [
        { left: 10.7, top: 19.3 },
        { left: 5.8, top: 23.1 },
        { left: 3, top: 26.3 },
        { left: 2.6, top: 29.9 },
        { left: 2.4, top: 34.8 },
      ],
      slotLength: 4,
    },
    'bha-del': {
      waypoints: [
        { left: 40.3, top: 27.3 },
        { left: 34.2, top: 24.5 },
        { left: 29.7, top: 21.7 },
        { left: 26.3, top: 17.6 },
      ],
      slotLength: 4,
    },
    'bha-amb-2': {
      waypoints: [
        { left: 26.3, top: 17.3 },
        { left: 41.3, top: 17.2 },
      ],
      slotLength: 4.05,
    },
    'bha-amb-1': {
      waypoints: [
        { left: 26.3, top: 17.4 },
        { left: 41.6, top: 17.3 },
      ],
      slotLength: 4.1,
    },
    'jod-jai': {
      waypoints: [{ left: 28.9, top: 30.5 }],
      slotLength: 4.35,
    },
    'del-jai': {
      waypoints: [{ left: 34, top: 30.3 }],
      slotLength: 4.15,
    },
    'luc-agr': {
      waypoints: [{ left: 47.3, top: 32.7 }],
      slotLength: 4.1,
    },
    'del-luc': {
      slotLength: 4,
    },
    'bar-pat': {
      waypoints: [
        { left: 50.4, top: 25.6 },
        { left: 58, top: 27.4 },
        { left: 63, top: 29.2 },
        { left: 67, top: 31.4 },
        { left: 71.2, top: 34.7 },
      ],
      slotLength: 4,
    },
    'pat-dhu-1': {
      waypoints: [
        { left: 85.6, top: 35.5 },
        { left: 72.1, top: 35.4 },
      ],
      slotLength: 3.95,
    },
    'pat-dhu-2': {
      waypoints: [
        { left: 84.5, top: 35.3 },
        { left: 73.2, top: 35.2 },
      ],
      slotLength: 4,
    },
    'jac-lah': {
      waypoints: [
        { left: 21.1, top: 7.9 },
        { left: 11.2, top: 19.7 },
      ],
      slotLength: 3.8,
    },
    'amb-bar': {
      waypoints: [
        { left: 42.6, top: 17.4 },
        { left: 47.5, top: 21.1 },
        { left: 50.3, top: 25.5 },
      ],
      slotLength: 4,
    },
    'bha-roh': {
      waypoints: [
        { left: 25.7, top: 17.3 },
        { left: 15.7, top: 25.1 },
      ],
      slotLength: 4.15,
    },
    'bha-jod': {
      waypoints: [
        { left: 26.1, top: 17.5 },
        { left: 21.2, top: 30.7 },
      ],
      slotLength: 3.95,
    },
    'jac-roh-2': {
      slotLength: 4.3,
    },
    'jac-roh-1': {
      slotLength: 4.2,
    },
    'amb-del-2': {
      waypoints: [
        { left: 41.9, top: 17.4 },
        { left: 40.3, top: 26.9 },
      ],
      slotLength: 3.8,
    },
    'amb-del-1': {
      waypoints: [
        { left: 41.6, top: 17.2 },
        { left: 40.1, top: 27.2 },
      ],
      slotLength: 3.8,
    },
    'bar-luc': {
      slotLength: 4.2,
    },
    'roh-kar': {
      waypoints: [
        { left: 16, top: 24.6 },
        { left: 10.3, top: 27.9 },
        { left: 6.8, top: 30.6 },
        { left: 2.6, top: 34.8 },
      ],
      slotLength: 3.9,
    },
    'jod-kar': {
      waypoints: [
        { left: 20.8, top: 30.7 },
        { left: 14.9, top: 33.1 },
        { left: 9.5, top: 34.3 },
        { left: 2.5, top: 34.9 },
      ],
      slotLength: 4,
    },
    'del-agr': {
      slotLength: 4.05,
    },
    'del-bar': {
      slotLength: 4.2,
    },
    'jai-rat-2': {
      slotLength: 4.35,
    },
    'jai-rat-1': {
      slotLength: 4.25,
    },
    'jai-agr-1': {
      slotLength: 4.25,
    },
    'jai-agr-2': {
      slotLength: 4.3,
    },
    'agr-bho-2': {
      slotLength: 4.35,
    },
    'agr-bho-1': {
      slotLength: 4.25,
    },
    'agr-kat': {
      waypoints: [
        { left: 55.5, top: 37.3 },
        { left: 43.3, top: 37.1 },
      ],
      slotLength: 3.95,
    },
    'luc-kat-1': {
      waypoints: [
        { left: 55, top: 32.3 },
        { left: 57.3, top: 36.6 },
      ],
      slotLength: 4.15,
    },
    'luc-kat-2': {
      waypoints: [
        { left: 54.9, top: 31.7 },
        { left: 57.7, top: 36.9 },
      ],
      slotLength: 4.15,
    },
    'rat-bho': {
      waypoints: [
        { left: 28, top: 40.5 },
        { left: 41.8, top: 42.8 },
      ],
      slotLength: 4.45,
    },
    'rat-kha': {
      waypoints: [
        { left: 28.2, top: 41.3 },
        { left: 33.3, top: 44.1 },
        { left: 31, top: 48.7 },
      ],
      slotLength: 4.3,
    },
    'bho-kha': {
      waypoints: [
        { left: 41.6, top: 42.7 },
        { left: 38.6, top: 47.2 },
        { left: 30.8, top: 48.7 },
      ],
      slotLength: 4.35,
    },
    'pat-kat-2': {
      slotLength: 4.2,
    },
    'pat-kat-1': {
      slotLength: 4.2,
    },
    'dhu-jar-2': {
      waypoints: [
        { left: 85.3, top: 35.4 },
        { left: 97.4, top: 29.4 },
      ],
      slotLength: 3.8,
    },
    'dhu-jar-1': {
      waypoints: [
        { left: 86.2, top: 35.1 },
        { left: 97.1, top: 29.9 },
      ],
      slotLength: 3.9,
    },
    'dhu-chi': {
      waypoints: [
        { left: 87.5, top: 36.2 },
        { left: 92.2, top: 39.1 },
        { left: 95.5, top: 42.4 },
      ],
      slotLength: 3.95,
    },
    'pat-cal': {
      waypoints: [
        { left: 71.7, top: 35.3 },
        { left: 81.8, top: 44 },
      ],
      slotLength: 4.05,
    },
    'bil-cal': {
      waypoints: [
        { left: 57.7, top: 42.9 },
        { left: 64, top: 41.4 },
        { left: 69.6, top: 40.7 },
        { left: 75.2, top: 41.9 },
        { left: 80.9, top: 44.2 },
      ],
      slotLength: 4,
    },
    'dhu-cal-2': {
      waypoints: [
        { left: 82.6, top: 43.6 },
        { left: 86.4, top: 36.9 },
      ],
      slotLength: 4.05,
    },
    'dhu-cal-1': {
      waypoints: [
        { left: 86.3, top: 36.5 },
        { left: 81.6, top: 44.8 },
      ],
      slotLength: 3.95,
    },
    'ahm-jod-2': {
      waypoints: [
        { left: 20.8, top: 30.8 },
        { left: 19.1, top: 43.6 },
      ],
      slotLength: 4,
    },
    'ahm-jod-1': {
      waypoints: [
        { left: 20.9, top: 31.7 },
        { left: 19.5, top: 42.8 },
      ],
      slotLength: 4,
    },
    'ahm-rat': {
      waypoints: [{ left: 20, top: 43.8 }],
      slotLength: 4.15,
    },
    'ahm-kha': {
      waypoints: [
        { left: 20, top: 43.9 },
        { left: 26.6, top: 45.1 },
        { left: 30.2, top: 48.8 },
      ],
      slotLength: 4.15,
    },
    'ahm-bom': {
      waypoints: [
        { left: 19.4, top: 44.3 },
        { left: 21.5, top: 48.7 },
        { left: 20.2, top: 52.2 },
        { left: 21.3, top: 57 },
      ],
      slotLength: 4.3,
    },
    'kat-bil-2': {
      waypoints: [{ left: 57.7, top: 37.2 }],
      slotLength: 4.15,
    },
    'kat-bil-1': {
      waypoints: [{ left: 57.5, top: 37.5 }],
      slotLength: 4.15,
    },
    'bho-bil-1': {
      waypoints: [
        { left: 42.7, top: 43 },
        { left: 55.9, top: 42.9 },
      ],
      slotLength: 3.95,
    },
    'bho-bil-2': {
      waypoints: [
        { left: 41.8, top: 42.8 },
        { left: 56.9, top: 42.8 },
      ],
      slotLength: 3.9,
    },
    'bil-rai-2': {
      waypoints: [
        { left: 56.7, top: 44.1 },
        { left: 55.4, top: 48.7 },
      ],
      slotLength: 4.25,
    },
    'bil-rai-1': {
      waypoints: [
        { left: 56.7, top: 43.1 },
        { left: 55.2, top: 48.8 },
      ],
      slotLength: 4.3,
    },
    'cal-rai': {
      slotLength: 3.9,
    },
    'kha-rai': {
      waypoints: [
        { left: 31.8, top: 49.5 },
        { left: 38.9, top: 49.1 },
        { left: 43.4, top: 46.8 },
        { left: 49.3, top: 46.3 },
        { left: 55.2, top: 49.1 },
      ],
      slotLength: 4.35,
    },
    'cal-wal': {
      waypoints: [
        { left: 81.4, top: 44.7 },
        { left: 78.9, top: 49.3 },
        { left: 76.6, top: 52.5 },
        { left: 72.5, top: 55.7 },
        { left: 67.2, top: 59 },
      ],
      slotLength: 4,
    },
    'jar-chi': {
      waypoints: [
        { left: 97.7, top: 31.1 },
        { left: 97.8, top: 34.5 },
        { left: 97.8, top: 37.9 },
        { left: 96.5, top: 43.1 },
      ],
      slotLength: 4,
    },
    'kha-man': {
      slotLength: 4.1,
    },
    'man-ind': {
      waypoints: [
        { left: 30.8, top: 54.9 },
        { left: 37.9, top: 55.2 },
        { left: 43.3, top: 54.7 },
        { left: 49.8, top: 53.6 },
      ],
      slotLength: 4.1,
    },
    'rai-wal-1': {
      slotLength: 4,
    },
    'rai-wal-2': {
      slotLength: 4.05,
    },
    'ind-wad': {
      slotLength: 3.95,
    },
    'man-poo': {
      slotLength: 4.25,
    },
    'bom-man': {
      slotLength: 4.4,
    },
    'bom-poo': {
      slotLength: 4.25,
      offset: -0.25,
    },
    'poo-wad': {
      slotLength: 4.2,
      offset: -0.4,
    },
    'ind-bez-2': {
      slotLength: 4.1,
    },
    'ind-bez-1': {
      slotLength: 4.1,
    },
    'bez-wal-1': {
      slotLength: 4.05,
    },
    'bez-wal-2': {
      slotLength: 4.05,
    },
    'wal-mad': {
      waypoints: [
        { left: 66.8, top: 60.1 },
        { left: 63.5, top: 63.8 },
        { left: 60.4, top: 66.4 },
        { left: 53.5, top: 69.6 },
      ],
      slotLength: 4.05,
    },
    'bez-gun': {
      slotLength: 4,
      offset: -0.15,
    },
    'wad-gun-1': {
      slotLength: 4.3,
    },
    'wad-gun-2': {
      slotLength: 4.3,
    },
    'wad-mor': {
      waypoints: [
        { left: 37.5, top: 62 },
        { left: 23.2, top: 64 },
      ],
      slotLength: 4.1,
    },
    'bom-mor': {
      waypoints: [
        { left: 21.1, top: 57.7 },
        { left: 22.5, top: 63.6 },
      ],
      slotLength: 4.1,
    },
    'poo-mor': {
      waypoints: [
        { left: 29.8, top: 60.3 },
        { left: 22.4, top: 63.6 },
      ],
      slotLength: 4.1,
    },
    'mor-gun': {
      slotLength: 4,
      offset: 0.4,
    },
    'bez-mad': {
      slotLength: 4.3,
    },
    'mad-ero-2': {
      slotLength: 4.1,
    },
    'mad-ero-1': {
      slotLength: 4.1,
    },
    'gun-mad': {
      waypoints: [
        { left: 52.3, top: 69.4 },
        { left: 45.4, top: 68.6 },
        { left: 38.9, top: 67.4 },
      ],
      slotLength: 4.15,
    },
    'gun-man': {
      waypoints: [
        { left: 38.9, top: 67.3 },
        { left: 36.3, top: 71.7 },
        { left: 29.6, top: 72.3 },
      ],
      slotLength: 4.3,
    },
    'mor-man': {
      waypoints: [
        { left: 22.7, top: 64.5 },
        { left: 24.7, top: 68.2 },
        { left: 27.7, top: 72 },
      ],
      slotLength: 4.05,
    },
    'ero-qui': {
      waypoints: [
        { left: 49.8, top: 84.4 },
        { left: 46.6, top: 87.4 },
        { left: 42.3, top: 90.6 },
        { left: 37.7, top: 87.9 },
      ],
      slotLength: 4.05,
    },
    'man-cal-1': {
      slotLength: 4,
    },
    'man-cal-2': {
      slotLength: 4,
    },
    'cal-ero-1': {
      slotLength: 4.1,
    },
    'cal-ero-2': {
      slotLength: 4,
    },
    'man-mad': {
      waypoints: [
        { left: 29.5, top: 73.1 },
        { left: 36.1, top: 74 },
        { left: 41.3, top: 74.1 },
        { left: 46.6, top: 72.7 },
        { left: 51.2, top: 70.5 },
      ],
      slotLength: 4,
    },
    'kar-bom-2': {
      waypoints: [
        { left: 2.5, top: 34.1 },
        { left: 4.1, top: 40.3 },
        { left: 5.6, top: 43.7 },
        { left: 8, top: 47.3 },
        { left: 11, top: 50.4 },
        { left: 14.2, top: 53.2 },
        { left: 18.8, top: 56.7 },
      ],
      slotLength: 4.1,
    },
    'kar-bom-1': {
      waypoints: [
        { left: 2.6, top: 34.2 },
        { left: 3.7, top: 39.6 },
        { left: 5.7, top: 44.1 },
        { left: 7.7, top: 47.1 },
        { left: 10.7, top: 50.5 },
        { left: 14.4, top: 53.4 },
        { left: 18.9, top: 56.5 },
      ],
      slotLength: 4.1,
    },
    'cal-chi-2': {
      waypoints: [
        { left: 96.3, top: 44.2 },
        { left: 89.5, top: 46.4 },
        { left: 82, top: 45.7 },
      ],
      slotLength: 4.25,
    },
    'cal-chi-1': {
      waypoints: [
        { left: 96.6, top: 44.3 },
        { left: 89.5, top: 46.5 },
        { left: 81.8, top: 45.8 },
      ],
      slotLength: 4.2,
    },
    'mad-cal-ferry': {
      waypoints: [
        { left: 83, top: 44 },
        { left: 82.2, top: 50.6 },
        { left: 80.8, top: 54.3 },
        { left: 78.2, top: 57.9 },
        { left: 74.6, top: 60.8 },
        { left: 70.6, top: 63.3 },
        { left: 66.3, top: 65.8 },
        { left: 62, top: 67.8 },
        { left: 52.5, top: 71 },
      ],
      slotLength: 4.15,
    },
    'bom-cal-ferry': {
      waypoints: [
        { left: 19.7, top: 58.5 },
        { left: 17.9, top: 62.9 },
        { left: 17.4, top: 66 },
        { left: 18.1, top: 69.8 },
        { left: 20, top: 73.6 },
        { left: 23.3, top: 76.5 },
        { left: 28.6, top: 78.7 },
      ],
      slotLength: 4.1,
    },
    'cal-qui-2': {
      waypoints: [
        { left: 30.1, top: 78.1 },
        { left: 31.4, top: 84.5 },
        { left: 35.1, top: 88.8 },
      ],
      slotLength: 4.1,
    },
    'cal-qui-1': {
      waypoints: [
        { left: 30.1, top: 78.6 },
        { left: 31, top: 83.7 },
        { left: 34.5, top: 88.3 },
      ],
      slotLength: 4.1,
    },
  },
};
