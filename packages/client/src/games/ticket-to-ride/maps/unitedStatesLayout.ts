import type { TtrBoardLayout } from '../boardGeometry';

/**
 * Overlay calibration for the printed United States board (`map-united-states_jcowip`, 1744×1125).
 * Tune in `/dev/ticket-to-ride-layout` and paste the exported JSON back over these defaults.
 */
export const UNITED_STATES_BOARD_LAYOUT: TtrBoardLayout = {
  aspectRatio: 1744 / 1125,
  citySize: 1.8,
  slot: {
    length: 3,
    width: 1.25,
    gap: 0.45,
    endPad: 1.6,
  },
  parallelSpacing: 1.5,
  cities: {
    vancouver: { left: 8, top: 11.7 },
    seattle: { left: 7.6, top: 20.5 },
    portland: { left: 5.4, top: 28.8 },
    calgary: { left: 21.6, top: 8.8 },
    helena: { left: 32.2, top: 30.2 },
    winnipeg: { left: 45.1, top: 10.7 },
    duluth: { left: 57, top: 29.3 },
    'sault-ste-marie': { left: 70, top: 18.7 },
    montreal: { left: 90.1, top: 8 },
    toronto: { left: 81.4, top: 22.1 },
    boston: { left: 97.5, top: 17.6 },
    'new-york': { left: 92, top: 29.7 },
    pittsburgh: { left: 83.3, top: 36.8 },
    washington: { left: 93.1, top: 44.3 },
    chicago: { left: 69.7, top: 39.3 },
    omaha: { left: 53.6, top: 44.2 },
    denver: { left: 38.2, top: 55.3 },
    'salt-lake-city': { left: 24.6, top: 50.2 },
    'san-francisco': { left: 3.9, top: 60.6 },
    'las-vegas': { left: 18.8, top: 68.1 },
    'los-angeles': { left: 11.9, top: 77.7 },
    phoenix: { left: 24.4, top: 78.6 },
    'santa-fe': { left: 37.5, top: 70.1 },
    'el-paso': { left: 36.8, top: 84.5 },
    'oklahoma-city': { left: 53.7, top: 66.3 },
    'kansas-city': { left: 55.8, top: 52.5 },
    'saint-louis': { left: 64.9, top: 52.8 },
    'little-rock': { left: 63.1, top: 67 },
    nashville: { left: 74.8, top: 58.8 },
    raleigh: { left: 86.8, top: 55.2 },
    charleston: { left: 89.8, top: 65.7 },
    atlanta: { left: 79.9, top: 64.7 },
    miami: { left: 93, top: 91.2 },
    'new-orleans': { left: 70.1, top: 86 },
    houston: { left: 60, top: 87.3 },
    dallas: { left: 55.8, top: 80.7 },
  },
  routes: {
    'sea-por-1': { slotLength: 3.5 },
    'sea-por-2': { slotLength: 3.5 },
    'sea-van-1': { slotLength: 3.5 },
    'sea-van-2': { slotLength: 3.55 },
    'van-cal': { slotLength: 3.5 },
    'sea-cal': {
      waypoints: [
        { left: 13.6, top: 20 },
        { left: 16.9, top: 19.4 },
        { left: 19.8, top: 15.6 },
      ],
      slotLength: 3.5,
    },
    'por-slc': {
      waypoints: [
        { left: 13.2, top: 31.6 },
        { left: 17.6, top: 35.9 },
        { left: 22.5, top: 43.2 },
      ],
      slotLength: 3.5,
    },
    'por-sf-1': {
      waypoints: [
        { left: 3.6, top: 35.2 },
        { left: 2.8, top: 40.9 },
        { left: 2.5, top: 46.6 },
        { left: 2.9, top: 53.4 },
      ],
      offset: -0.9,
      slotLength: 3.95,
    },
    'por-sf-2': {
      waypoints: [
        { left: 5.1, top: 28.6 },
        { left: 3.5, top: 36 },
        { left: 2.8, top: 41.6 },
        { left: 2.6, top: 47.3 },
        { left: 3.3, top: 55 },
      ],
      offset: 0.55,
      slotLength: 3.7,
    },
    'slc-sf-1': { slotLength: 3.5 },
    'slc-sf-2': { offset: 0.8, slotLength: 3.3 },
    'sf-la-1': {
      waypoints: [
        { left: 6.1, top: 67.5 },
        { left: 8.1, top: 72.1 },
      ],
      slotLength: 4.4,
    },
    'sf-la-2': {
      waypoints: [
        { left: 6.3, top: 67.4 },
        { left: 8.2, top: 72 },
      ],
      slotLength: 3.95,
    },
    'la-lv': {
      waypoints: [
        { left: 12.4, top: 73.7 },
        { left: 14, top: 69.6 },
        { left: 19.1, top: 67.3 },
      ],
      slotLength: 3.7,
    },
    'la-phx': {
      waypoints: [
        { left: 13.2, top: 76.3 },
        { left: 16.5, top: 75.6 },
        { left: 20.4, top: 75.5 },
        { left: 24.7, top: 77.5 },
      ],
      offset: -0.25,
      slotLength: 3.55,
    },
    'la-elp': {
      waypoints: [
        { left: 16.4, top: 82.3 },
        { left: 20.2, top: 84.7 },
        { left: 23.6, top: 86 },
        { left: 27.4, top: 86.6 },
        { left: 31.4, top: 86.3 },
      ],
      slotLength: 3.8,
    },
    'cal-hel': {
      slotLength: 3.75,
      offset: -0.45,
      waypoints: [{ left: 31.9, top: 29.4 }],
    },
    'cal-win': {
      waypoints: [
        { left: 22.5, top: 8.2 },
        { left: 26.4, top: 5.8 },
        { left: 30, top: 4.8 },
        { left: 33.9, top: 4.4 },
        { left: 37.5, top: 5 },
        { left: 41.2, top: 6.9 },
        { left: 44.5, top: 9.1 },
      ],
      slotLength: 3.75,
    },
    'hel-win': { slotLength: 3.6, offset: -0.2 },
    'slc-hel': { slotLength: 3.55, offset: -0.15 },
    'slc-den-1': {
      slotLength: 4,
      offset: -1.25,
      waypoints: [{ left: 24.4, top: 50.5 }],
    },
    'slc-den-2': { slotLength: 3.9, offset: 0.2 },
    'lv-slc': {
      waypoints: [
        { left: 22.5, top: 63.8 },
        { left: 24.2, top: 57.4 },
      ],
      slotLength: 3.45,
    },
    'sea-hel': { slotLength: 4.3, offset: 0.7 },
    'hel-den': { slotLength: 3.8, offset: -0.3 },
    'hel-oma': { slotLength: 3.9, offset: 0.15 },
    'hel-dul': { slotLength: 3.5 },
    'win-dul': {
      slotLength: 3.4,
      waypoints: [
        { left: 44.9, top: 10.5 },
        { left: 57.3, top: 29.1 },
      ],
    },
    'win-sau': { slotLength: 3.65, offset: -0.65 },
    'den-oma': {
      waypoints: [
        { left: 39.3, top: 53.3 },
        { left: 42.2, top: 49.6 },
        { left: 45.4, top: 47.4 },
        { left: 49.1, top: 45.7 },
        { left: 53.2, top: 44.6 },
      ],
      slotLength: 3.65,
    },
    'den-okc': {
      waypoints: [
        { left: 41, top: 61.7 },
        { left: 44.9, top: 64.7 },
        { left: 48.6, top: 65.5 },
      ],
      slotLength: 3.55,
    },
    'den-kc-2': {
      waypoints: [
        { left: 44.9, top: 56.5 },
        { left: 48, top: 56.1 },
        { left: 51.1, top: 55.1 },
      ],
      slotLength: 4.05,
    },
    'den-kc-1': {
      waypoints: [
        { left: 40.3, top: 56.2 },
        { left: 44.4, top: 56.6 },
        { left: 47.7, top: 56.2 },
        { left: 51.6, top: 55 },
        { left: 55.8, top: 52 },
      ],
      slotLength: 3.8,
    },
    'okc-dal-1': {
      offset: -1.35,
      waypoints: [{ left: 55.3, top: 80.9 }],
    },
    'okc-dal-2': {
      offset: 0.1,
      waypoints: [{ left: 55.2, top: 80.5 }],
    },
    'sfe-okc': {
      slotLength: 3.4,
      offset: 0.3,
      waypoints: [{ left: 36.1, top: 70.1 }],
    },
    'elp-okc': {
      waypoints: [
        { left: 44.6, top: 79.5 },
        { left: 48.5, top: 75.5 },
        { left: 52.6, top: 68.8 },
      ],
      slotLength: 3.8,
    },
    'elp-hou': {
      waypoints: [
        { left: 41.3, top: 88.8 },
        { left: 45.2, top: 90.7 },
        { left: 48.7, top: 91.4 },
        { left: 52.2, top: 91.4 },
        { left: 55.9, top: 90.4 },
        { left: 60.2, top: 87.7 },
      ],
      slotLength: 3.9,
    },
    'elp-dal': {
      offset: 0.5,
      slotLength: 3.4,
      waypoints: [{ left: 56.6, top: 80.3 }],
    },
    'no-hou': {
      slotLength: 3.55,
      offset: 0.8,
      waypoints: [{ left: 61.1, top: 88.3 }],
    },
    'no-mia': {
      waypoints: [
        { left: 72, top: 85.8 },
        { left: 75.4, top: 82.4 },
        { left: 79.1, top: 81 },
        { left: 83.1, top: 81.1 },
        { left: 86.4, top: 83.8 },
        { left: 89, top: 87.4 },
        { left: 91.5, top: 91.9 },
      ],
      slotLength: 3.5,
    },
    'lr-no': { slotLength: 3.7, offset: 0.05 },
    'atl-no-2': {
      waypoints: [
        { left: 76.9, top: 69 },
        { left: 74.2, top: 73.9 },
        { left: 71.9, top: 79.1 },
      ],
      slotLength: 3.4,
    },
    'atl-no-1': {
      slotLength: 3.5,
      waypoints: [
        { left: 76.4, top: 69.8 },
        { left: 74, top: 74.5 },
        { left: 71.9, top: 79 },
      ],
    },
    'atl-mia': { slotLength: 3.5, offset: 0.2 },
    'miami-cha': {
      waypoints: [
        { left: 93.2, top: 88.1 },
        { left: 91.6, top: 83.5 },
        { left: 90.5, top: 77.9 },
        { left: 90, top: 71.9 },
        { left: 89.9, top: 65.2 },
      ],
      slotLength: 3.45,
    },
    'ral-cha': {
      waypoints: [{ left: 91.2, top: 59.8 }],
      slotLength: 3.4,
    },
    'dal-lr': {
      waypoints: [{ left: 61.9, top: 68.4 }],
      slotLength: 3.4,
    },
    'dal-hou-2': { slotLength: 3.55, offset: 0.45 },
    'dal-hou-1': { slotLength: 3.7, offset: -0.95 },
    'kc-okc-2': { offset: 0.15 },
    'kc-okc-1': { offset: -1.3 },
    'oma-kc-1': { offset: -1.1 },
    'oma-kc-2': { offset: 0.4 },
    'dul-oma-2': { slotLength: 3.5 },
    'dul-oma-1': { slotLength: 3.55, offset: -0.6 },
    'dul-sau': {
      slotLength: 3.65,
      offset: -0.7,
      waypoints: [
        { left: 59.6, top: 27.2 },
        { left: 69.6, top: 20.6 },
      ],
    },
    'sau-tor': { slotLength: 3.9 },
    'sau-mtl': {
      waypoints: [
        { left: 73.9, top: 13.4 },
        { left: 77.2, top: 10.5 },
        { left: 80.7, top: 8.9 },
        { left: 84.6, top: 7.5 },
        { left: 88.3, top: 7.3 },
      ],
      slotLength: 3.55,
    },
    'dul-tor': { slotLength: 3.4 },
    'dul-chi': {
      slotLength: 3.35,
      waypoints: [
        { left: 57.6, top: 31 },
        { left: 61.1, top: 33.6 },
        { left: 68, top: 37 },
      ],
    },
    'oma-chi': {
      waypoints: [
        { left: 55.1, top: 43.9 },
        { left: 61.2, top: 37.6 },
      ],
      slotLength: 3.45,
    },
    'kc-stl-1': { offset: -1.1 },
    'kc-stl-2': { offset: 0.3, slotLength: 3.2 },
    'stl-lr': { offset: -0.1, slotLength: 3.2 },
    'okc-lr': {
      waypoints: [{ left: 63, top: 66.1 }],
      slotLength: 3.5,
    },
    'stl-nas': {
      waypoints: [{ left: 65.3, top: 54.7 }],
      slotLength: 3.4,
    },
    'chi-stl-2': { offset: 1.25, slotLength: 3.4 },
    'chi-stl-1': {
      waypoints: [{ left: 64.1, top: 52.3 }],
      slotLength: 3.3,
    },
    'phx-den': {
      waypoints: [
        { left: 28.2, top: 67.2 },
        { left: 30.7, top: 61.5 },
        { left: 34.2, top: 57.9 },
      ],
      slotLength: 3.3,
    },
    'pit-nas': {
      slotLength: 3.4,
      waypoints: [
        { left: 82.9, top: 40.5 },
        { left: 80.7, top: 45.1 },
        { left: 77.9, top: 47.8 },
        { left: 75.4, top: 52.7 },
        { left: 73.8, top: 56.9 },
      ],
    },
    'stl-pit': {
      offset: 0.6,
      slotLength: 3.5,
      waypoints: [{ left: 65.9, top: 52.2 }],
    },
    'tor-chi': {
      waypoints: [
        { left: 80.8, top: 24.2 },
        { left: 78.2, top: 27.2 },
        { left: 74.7, top: 28.9 },
        { left: 71.4, top: 32.1 },
        { left: 69.2, top: 36.3 },
      ],
      slotLength: 3.2,
    },
    'chi-pit-1': {
      waypoints: [
        { left: 69.7, top: 38.2 },
        { left: 73.3, top: 36.7 },
        { left: 77.8, top: 35.5 },
        { left: 82, top: 35.8 },
      ],
      slotLength: 3.6,
    },
    'chi-pit-2': {
      waypoints: [
        { left: 70.7, top: 38 },
        { left: 74.8, top: 36.1 },
        { left: 78.5, top: 35.5 },
      ],
      slotLength: 3.6,
    },
    'nas-ral': {
      waypoints: [
        { left: 75.3, top: 57.4 },
        { left: 78.8, top: 54.6 },
        { left: 82.8, top: 53.1 },
        { left: 86, top: 53.5 },
      ],
      slotLength: 3.3,
    },
    'ral-pit': { slotLength: 3.35 },
    'pit-was': { slotLength: 3.4 },
    'was-ny-2': { offset: 0.95, slotLength: 3.4 },
    'was-ny-1': { offset: -0.45, slotLength: 3.35 },
    'pit-ny-1': { offset: -1.15, slotLength: 3.55 },
    'pit-ny-2': { offset: 0.25, slotLength: 3.55 },
    'tor-pit': {
      waypoints: [{ left: 82.2, top: 22.3 }],
      slotLength: 3.5,
    },
    'tor-mtl': {
      waypoints: [
        { left: 80.9, top: 20.5 },
        { left: 82.7, top: 15.1 },
        { left: 87, top: 10.4 },
      ],
      slotLength: 3.45,
    },
    'mtl-bos-1': { offset: -1.1, slotLength: 3.3 },
    'mtl-bos-2': { offset: 0.65, slotLength: 3.25 },
    'ny-bos-2': {
      waypoints: [{ left: 93.3, top: 28.6 }],
      slotLength: 3.4,
    },
    'ny-bos-1': {
      waypoints: [{ left: 92.9, top: 29.8 }],
      slotLength: 3.45,
      offset: -0.6,
    },
    'atl-cha': { slotLength: 3.45, offset: 0.6 },
    'mtl-ny': {
      offset: 0.45,
      slotLength: 3.5,
      waypoints: [{ left: 89.9, top: 8.7 }],
    },
    'phx-elp': {
      slotLength: 3.25,
      waypoints: [{ left: 37.1, top: 84.1 }],
    },
    'phx-sfe': {
      waypoints: [{ left: 37.7, top: 69.2 }],
      slotLength: 3.4,
    },
    'nas-lr': {
      waypoints: [
        { left: 74.2, top: 59.9 },
        { left: 71.1, top: 64 },
        { left: 67.9, top: 66.2 },
      ],
      slotLength: 3.4,
    },
  },
};
