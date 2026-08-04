import type { TtrBoardLayout } from '../boardGeometry';

/**
 * Overlay calibration for the printed United States board (`map-united-states_jcowip`, 1744×1125).
 * Tune in `/dev/ticket-to-ride-layout` and paste the exported JSON back over these defaults.
 */
export const UNITED_STATES_BOARD_LAYOUT: TtrBoardLayout = {
  aspectRatio: 1.55,
  citySize: 1.8,
  slot: {
    length: 3,
    width: 1.25,
    gap: 0.45,
    endPad: 1.6,
  },
  parallelSpacing: 1.5,
  cities: {
    vancouver: {
      left: 8,
      top: 11.7,
    },
    seattle: {
      left: 7.6,
      top: 20.5,
    },
    portland: {
      left: 5.4,
      top: 28.8,
    },
    calgary: {
      left: 21.6,
      top: 8.8,
    },
    helena: {
      left: 32.2,
      top: 30.2,
    },
    winnipeg: {
      left: 45.1,
      top: 10.7,
    },
    duluth: {
      left: 57,
      top: 29.3,
    },
    'sault-ste-marie': {
      left: 70,
      top: 18.7,
    },
    montreal: {
      left: 90.1,
      top: 8,
    },
    toronto: {
      left: 81.4,
      top: 22.1,
    },
    boston: {
      left: 97.5,
      top: 17.6,
    },
    'new-york': {
      left: 92,
      top: 29.7,
    },
    pittsburgh: {
      left: 83.3,
      top: 36.8,
    },
    washington: {
      left: 93.1,
      top: 44.3,
    },
    chicago: {
      left: 69.7,
      top: 39.3,
    },
    omaha: {
      left: 53.6,
      top: 44.2,
    },
    denver: {
      left: 38.2,
      top: 55.3,
    },
    'salt-lake-city': {
      left: 24.6,
      top: 50.2,
    },
    'san-francisco': {
      left: 3.9,
      top: 60.6,
    },
    'las-vegas': {
      left: 18.8,
      top: 68.1,
    },
    'los-angeles': {
      left: 11.9,
      top: 77.7,
    },
    phoenix: {
      left: 24.4,
      top: 78.6,
    },
    'santa-fe': {
      left: 37.5,
      top: 70.1,
    },
    'el-paso': {
      left: 36.8,
      top: 84.5,
    },
    'oklahoma-city': {
      left: 53.7,
      top: 66.3,
    },
    'kansas-city': {
      left: 55.8,
      top: 52.5,
    },
    'saint-louis': {
      left: 64.9,
      top: 52.8,
    },
    'little-rock': {
      left: 63.1,
      top: 67,
    },
    nashville: {
      left: 74.8,
      top: 58.8,
    },
    raleigh: {
      left: 86.8,
      top: 55.2,
    },
    charleston: {
      left: 89.8,
      top: 65.7,
    },
    atlanta: {
      left: 79.9,
      top: 64.7,
    },
    miami: {
      left: 93,
      top: 91.2,
    },
    'new-orleans': {
      left: 70.1,
      top: 86,
    },
    houston: {
      left: 60,
      top: 87.3,
    },
    dallas: {
      left: 55.8,
      top: 80.7,
    },
  },
  routes: {
    'sea-por-1': {
      slotLength: 3.5,
    },
    'sea-por-2': {
      slotLength: 3.5,
    },
    'sea-van-2': {
      waypoints: [
        {
          left: 7.9,
          top: 19.8,
        },
      ],
      slotLength: 3.45,
    },
    'van-cal': {
      slotLength: 3.5,
      waypoints: [
        {
          left: 8.5,
          top: 11.2,
        },
        {
          left: 21.8,
          top: 8.7,
        },
      ],
    },
    'sea-cal': {
      waypoints: [
        {
          left: 13.6,
          top: 20,
        },
        {
          left: 16.9,
          top: 19.4,
        },
        {
          left: 19.8,
          top: 15.6,
        },
        {
          left: 22.1,
          top: 9.2,
        },
      ],
      slotLength: 3.5,
    },
    'por-slc': {
      waypoints: [
        {
          left: 6.6,
          top: 28.9,
        },
        {
          left: 10.5,
          top: 30.2,
        },
        {
          left: 13.9,
          top: 32.3,
        },
        {
          left: 17.2,
          top: 35.5,
        },
        {
          left: 20,
          top: 39.3,
        },
        {
          left: 22.6,
          top: 43.4,
        },
        {
          left: 24.9,
          top: 49.8,
        },
      ],
      slotLength: 3.5,
    },
    'por-sf-1': {
      waypoints: [
        {
          left: 3.6,
          top: 35.2,
        },
        {
          left: 2.8,
          top: 40.9,
        },
        {
          left: 2.5,
          top: 46.6,
        },
        {
          left: 2.9,
          top: 53.4,
        },
      ],
      offset: -0.9,
      slotLength: 3.95,
    },
    'por-sf-2': {
      waypoints: [
        {
          left: 5.5,
          top: 28.3,
        },
        {
          left: 3.5,
          top: 36,
        },
        {
          left: 2.8,
          top: 41.6,
        },
        {
          left: 2.6,
          top: 47.3,
        },
        {
          left: 3.3,
          top: 55,
        },
      ],
      offset: 0.55,
      slotLength: 3.7,
    },
    'slc-sf-1': {
      slotLength: 3.2,
      waypoints: [
        {
          left: 4.9,
          top: 59.9,
        },
        {
          left: 23.9,
          top: 50.1,
        },
      ],
    },
    'slc-sf-2': {
      waypoints: [
        {
          left: 5.5,
          top: 60,
        },
        {
          left: 23.4,
          top: 50.9,
        },
      ],
      slotLength: 3.25,
    },
    'sf-la-1': {
      waypoints: [
        {
          left: 6.1,
          top: 67.5,
        },
        {
          left: 8.1,
          top: 72.1,
        },
      ],
      slotLength: 4.4,
    },
    'sf-la-2': {
      waypoints: [
        {
          left: 6.3,
          top: 67.4,
        },
        {
          left: 8.2,
          top: 72,
        },
      ],
      slotLength: 3.95,
    },
    'la-lv': {
      waypoints: [
        {
          left: 11.8,
          top: 76.2,
        },
        {
          left: 14,
          top: 69.6,
        },
        {
          left: 19.1,
          top: 67.3,
        },
      ],
      slotLength: 3.7,
    },
    'la-phx': {
      waypoints: [
        {
          left: 13.2,
          top: 76.3,
        },
        {
          left: 16.5,
          top: 75.6,
        },
        {
          left: 20.4,
          top: 75.5,
        },
        {
          left: 24.7,
          top: 77.5,
        },
      ],
      offset: -0.25,
      slotLength: 3.55,
    },
    'la-elp': {
      waypoints: [
        {
          left: 11.8,
          top: 77,
        },
        {
          left: 16.5,
          top: 82.1,
        },
        {
          left: 19.8,
          top: 84.5,
        },
        {
          left: 23.5,
          top: 85.9,
        },
        {
          left: 27.3,
          top: 86.7,
        },
        {
          left: 31,
          top: 86.2,
        },
        {
          left: 35.5,
          top: 84.8,
        },
      ],
      slotLength: 3.4,
    },
    'cal-hel': {
      waypoints: [
        {
          left: 32,
          top: 27.8,
        },
        {
          left: 22.6,
          top: 10.5,
        },
      ],
      slotLength: 3.4,
    },
    'cal-win': {
      waypoints: [
        {
          left: 22.5,
          top: 8.2,
        },
        {
          left: 26.4,
          top: 5.8,
        },
        {
          left: 30,
          top: 4.8,
        },
        {
          left: 33.9,
          top: 4.4,
        },
        {
          left: 37.5,
          top: 5,
        },
        {
          left: 41.2,
          top: 6.9,
        },
        {
          left: 44.5,
          top: 9.1,
        },
      ],
      slotLength: 3.75,
    },
    'hel-win': {
      slotLength: 3.35,
      offset: -0.2,
      waypoints: [
        {
          left: 45.1,
          top: 10.1,
        },
      ],
    },
    'slc-den-1': {
      waypoints: [
        {
          left: 23.8,
          top: 49.8,
        },
        {
          left: 38.6,
          top: 54.2,
        },
      ],
      slotLength: 3.3,
    },
    'slc-den-2': {
      waypoints: [
        {
          left: 24.2,
          top: 49.6,
        },
        {
          left: 37.4,
          top: 53.5,
        },
      ],
      slotLength: 3.3,
    },
    'lv-slc': {
      waypoints: [
        {
          left: 19.9,
          top: 67.6,
        },
        {
          left: 22.6,
          top: 63.5,
        },
        {
          left: 24.1,
          top: 57.9,
        },
        {
          left: 24.9,
          top: 50.2,
        },
      ],
      slotLength: 3.45,
    },
    'sea-hel': {
      waypoints: [
        {
          left: 32.4,
          top: 30.7,
        },
        {
          left: 7.2,
          top: 22.1,
        },
      ],
      slotLength: 3.35,
    },
    'hel-den': {
      waypoints: [
        {
          left: 32.1,
          top: 29.5,
        },
        {
          left: 38.9,
          top: 54.8,
        },
      ],
      slotLength: 3.3,
    },
    'hel-oma': {
      slotLength: 3.35,
      offset: 0.15,
      waypoints: [
        {
          left: 33.6,
          top: 31.3,
        },
        {
          left: 53.9,
          top: 44.1,
        },
      ],
    },
    'hel-dul': {
      slotLength: 4.05,
      waypoints: [
        {
          left: 32.1,
          top: 29.9,
        },
        {
          left: 57.2,
          top: 29.5,
        },
      ],
    },
    'win-dul': {
      slotLength: 3.4,
      waypoints: [
        {
          left: 44.9,
          top: 10.5,
        },
        {
          left: 57.3,
          top: 29.1,
        },
      ],
    },
    'win-sau': {
      waypoints: [
        {
          left: 69.3,
          top: 17.4,
        },
        {
          left: 46.6,
          top: 9.9,
        },
      ],
      slotLength: 3.25,
    },
    'den-oma': {
      waypoints: [
        {
          left: 39.3,
          top: 53.3,
        },
        {
          left: 42.2,
          top: 49.6,
        },
        {
          left: 45.4,
          top: 47.4,
        },
        {
          left: 49.1,
          top: 45.7,
        },
        {
          left: 53.7,
          top: 44.5,
        },
      ],
      slotLength: 3.65,
    },
    'den-okc': {
      waypoints: [
        {
          left: 38.7,
          top: 57.7,
        },
        {
          left: 41.6,
          top: 62.2,
        },
        {
          left: 45.1,
          top: 64.5,
        },
        {
          left: 48.7,
          top: 65.4,
        },
        {
          left: 53.9,
          top: 65.9,
        },
      ],
      slotLength: 3.3,
    },
    'den-kc-2': {
      waypoints: [
        {
          left: 38.7,
          top: 55.9,
        },
        {
          left: 43.5,
          top: 56.4,
        },
        {
          left: 47.5,
          top: 56.1,
        },
        {
          left: 51.1,
          top: 54.9,
        },
        {
          left: 55.7,
          top: 51.9,
        },
      ],
      slotLength: 3.35,
    },
    'den-kc-1': {
      waypoints: [
        {
          left: 39.6,
          top: 56.2,
        },
        {
          left: 44.1,
          top: 56.6,
        },
        {
          left: 47.7,
          top: 56.2,
        },
        {
          left: 51.6,
          top: 55,
        },
        {
          left: 56.1,
          top: 52,
        },
      ],
      slotLength: 3.25,
    },
    'okc-dal-1': {
      waypoints: [
        {
          left: 55.8,
          top: 81.6,
        },
        {
          left: 54.5,
          top: 65.4,
        },
      ],
      slotLength: 3.35,
    },
    'okc-dal-2': {
      waypoints: [
        {
          left: 55.8,
          top: 80.5,
        },
        {
          left: 54.7,
          top: 66.2,
        },
      ],
      slotLength: 3.4,
    },
    'sfe-okc': {
      slotLength: 3.4,
      offset: 0.3,
      waypoints: [
        {
          left: 36.1,
          top: 70.1,
        },
      ],
    },
    'elp-okc': {
      waypoints: [
        {
          left: 38,
          top: 83.6,
        },
        {
          left: 41.8,
          top: 81.8,
        },
        {
          left: 45,
          top: 79.1,
        },
        {
          left: 48.2,
          top: 75.9,
        },
        {
          left: 50.8,
          top: 72.1,
        },
        {
          left: 53.6,
          top: 65.8,
        },
      ],
      slotLength: 3.8,
    },
    'elp-hou': {
      waypoints: [
        {
          left: 41.3,
          top: 88.8,
        },
        {
          left: 45.2,
          top: 90.7,
        },
        {
          left: 48.7,
          top: 91.4,
        },
        {
          left: 52.2,
          top: 91.4,
        },
        {
          left: 55.9,
          top: 90.4,
        },
        {
          left: 60.2,
          top: 87.7,
        },
      ],
      slotLength: 3.9,
    },
    'elp-dal': {
      offset: 0.5,
      slotLength: 3.4,
      waypoints: [
        {
          left: 56.6,
          top: 80.3,
        },
      ],
    },
    'no-hou': {
      slotLength: 3.55,
      offset: 0.8,
      waypoints: [
        {
          left: 61.1,
          top: 88.3,
        },
      ],
    },
    'no-mia': {
      waypoints: [
        {
          left: 71.8,
          top: 85.9,
        },
        {
          left: 75.4,
          top: 82.4,
        },
        {
          left: 79.1,
          top: 81,
        },
        {
          left: 83.1,
          top: 81.1,
        },
        {
          left: 86.4,
          top: 83.8,
        },
        {
          left: 89,
          top: 87.4,
        },
        {
          left: 91.9,
          top: 92.6,
        },
      ],
      slotLength: 3.4,
    },
    'lr-no': {
      slotLength: 3.3,
      offset: 0.05,
      waypoints: [
        {
          left: 63.1,
          top: 66.2,
        },
        {
          left: 69.5,
          top: 84.8,
        },
      ],
    },
    'atl-no-2': {
      waypoints: [
        {
          left: 80.3,
          top: 64.3,
        },
        {
          left: 76.6,
          top: 69.4,
        },
        {
          left: 74,
          top: 73.9,
        },
        {
          left: 72.2,
          top: 78,
        },
        {
          left: 70.3,
          top: 85.8,
        },
      ],
      slotLength: 3.4,
    },
    'atl-no-1': {
      slotLength: 3.5,
      waypoints: [
        {
          left: 80.2,
          top: 64.3,
        },
        {
          left: 76.8,
          top: 68.8,
        },
        {
          left: 74,
          top: 73.6,
        },
        {
          left: 71.9,
          top: 78.7,
        },
        {
          left: 70.5,
          top: 84.5,
        },
      ],
    },
    'atl-mia': {
      slotLength: 3.5,
      offset: 0.2,
      waypoints: [
        {
          left: 80.4,
          top: 66.4,
        },
        {
          left: 92.9,
          top: 90.7,
        },
      ],
    },
    'miami-cha': {
      waypoints: [
        {
          left: 93.4,
          top: 88.7,
        },
        {
          left: 91.6,
          top: 83.5,
        },
        {
          left: 90.5,
          top: 77.9,
        },
        {
          left: 90,
          top: 71.9,
        },
        {
          left: 89.9,
          top: 65.2,
        },
      ],
      slotLength: 3.45,
    },
    'ral-cha': {
      waypoints: [
        {
          left: 89.8,
          top: 64.5,
        },
        {
          left: 91.3,
          top: 60.1,
        },
        {
          left: 87.6,
          top: 56.2,
        },
      ],
      slotLength: 3.4,
    },
    'dal-lr': {
      waypoints: [
        {
          left: 62.6,
          top: 67.2,
        },
        {
          left: 56.8,
          top: 79.7,
        },
      ],
      slotLength: 3.4,
    },
    'dal-hou-2': {
      slotLength: 3.55,
      offset: 0.45,
    },
    'dal-hou-1': {
      slotLength: 3.7,
      offset: -0.95,
    },
    'kc-okc-1': {
      offset: -1.3,
      waypoints: [
        {
          left: 56,
          top: 51.8,
        },
        {
          left: 53.3,
          top: 66.9,
        },
      ],
      slotLength: 3.4,
    },
    'oma-kc-1': {
      offset: -1.1,
    },
    'oma-kc-2': {
      offset: 0.4,
    },
    'dul-oma-2': {
      slotLength: 3.5,
    },
    'dul-oma-1': {
      slotLength: 3.55,
      offset: -0.6,
    },
    'dul-sau': {
      waypoints: [
        {
          left: 57.7,
          top: 27.3,
        },
        {
          left: 70.7,
          top: 18.5,
        },
      ],
      slotLength: 3.3,
    },
    'sau-tor': {
      slotLength: 3.4,
      waypoints: [
        {
          left: 69.7,
          top: 18.3,
        },
        {
          left: 80,
          top: 21.5,
        },
      ],
    },
    'sau-mtl': {
      waypoints: [
        {
          left: 69.9,
          top: 18.5,
        },
        {
          left: 73.9,
          top: 13.4,
        },
        {
          left: 77.2,
          top: 10.6,
        },
        {
          left: 80.8,
          top: 8.8,
        },
        {
          left: 84.5,
          top: 7.4,
        },
        {
          left: 88.9,
          top: 7.4,
        },
      ],
      slotLength: 3.35,
    },
    'dul-tor': {
      slotLength: 3.4,
      waypoints: [
        {
          left: 56.8,
          top: 29.3,
        },
        {
          left: 80.1,
          top: 23.1,
        },
      ],
    },
    'dul-chi': {
      slotLength: 3.35,
      waypoints: [
        {
          left: 56.4,
          top: 29.6,
        },
        {
          left: 61.1,
          top: 33.6,
        },
        {
          left: 64.5,
          top: 35.5,
        },
        {
          left: 68.1,
          top: 36.9,
        },
      ],
    },
    'oma-chi': {
      waypoints: [
        {
          left: 55.1,
          top: 43.9,
        },
        {
          left: 61.2,
          top: 37.6,
        },
      ],
      slotLength: 3.45,
    },
    'kc-stl-2': {
      waypoints: [
        {
          left: 65.2,
          top: 51.5,
        },
        {
          left: 55.6,
          top: 52,
        },
      ],
      slotLength: 3.35,
    },
    'stl-lr': {
      offset: -0.1,
      slotLength: 3.2,
    },
    'okc-lr': {
      waypoints: [
        {
          left: 63,
          top: 66.1,
        },
      ],
      slotLength: 3.5,
    },
    'stl-nas': {
      waypoints: [
        {
          left: 65.3,
          top: 54.7,
        },
      ],
      slotLength: 3.4,
    },
    'chi-stl-2': {
      waypoints: [
        {
          left: 64.7,
          top: 51.5,
        },
        {
          left: 69.2,
          top: 40.1,
        },
      ],
      slotLength: 3.4,
    },
    'chi-stl-1': {
      waypoints: [
        {
          left: 64,
          top: 52.6,
        },
        {
          left: 69.5,
          top: 38.8,
        },
      ],
      slotLength: 3.4,
    },
    'phx-den': {
      waypoints: [
        {
          left: 24.6,
          top: 78.8,
        },
        {
          left: 26.4,
          top: 71.7,
        },
        {
          left: 28.2,
          top: 66.7,
        },
        {
          left: 30.4,
          top: 61.8,
        },
        {
          left: 33.4,
          top: 58.1,
        },
        {
          left: 37.1,
          top: 55.9,
        },
      ],
      slotLength: 3.3,
    },
    'pit-nas': {
      slotLength: 3.4,
      waypoints: [
        {
          left: 83.4,
          top: 39.4,
        },
        {
          left: 80.7,
          top: 45.1,
        },
        {
          left: 77.9,
          top: 47.8,
        },
        {
          left: 75.4,
          top: 52.7,
        },
        {
          left: 73.4,
          top: 58.1,
        },
      ],
    },
    'stl-pit': {
      waypoints: [
        {
          left: 64.6,
          top: 54.2,
        },
        {
          left: 83.9,
          top: 37.2,
        },
      ],
      slotLength: 3.25,
    },
    'tor-chi': {
      waypoints: [
        {
          left: 82.4,
          top: 22.6,
        },
        {
          left: 78.7,
          top: 27,
        },
        {
          left: 74.7,
          top: 28.9,
        },
        {
          left: 71.7,
          top: 31.9,
        },
        {
          left: 68.6,
          top: 37.1,
        },
      ],
      slotLength: 3.4,
    },
    'chi-pit-1': {
      waypoints: [
        {
          left: 69.3,
          top: 38.4,
        },
        {
          left: 73.3,
          top: 36.7,
        },
        {
          left: 77.9,
          top: 35.7,
        },
        {
          left: 82,
          top: 35.8,
        },
      ],
      slotLength: 3.4,
    },
    'chi-pit-2': {
      waypoints: [
        {
          left: 69.6,
          top: 38.2,
        },
        {
          left: 74.8,
          top: 36.1,
        },
        {
          left: 78.4,
          top: 35.3,
        },
        {
          left: 82.7,
          top: 35.6,
        },
      ],
      slotLength: 3.35,
    },
    'nas-ral': {
      waypoints: [
        {
          left: 74.5,
          top: 58.3,
        },
        {
          left: 78.7,
          top: 54.5,
        },
        {
          left: 82.6,
          top: 53,
        },
        {
          left: 86.2,
          top: 53.7,
        },
      ],
      slotLength: 3.35,
    },
    'ral-pit': {
      slotLength: 3.35,
    },
    'pit-was': {
      slotLength: 3.4,
    },
    'was-ny-2': {
      offset: 0.95,
      slotLength: 3.4,
      waypoints: [
        {
          left: 92.3,
          top: 29.7,
        },
        {
          left: 92.8,
          top: 44.4,
        },
      ],
    },
    'was-ny-1': {
      offset: -0.45,
      slotLength: 3.35,
      waypoints: [
        {
          left: 92.4,
          top: 29.7,
        },
        {
          left: 92.9,
          top: 44.2,
        },
      ],
    },
    'pit-ny-1': {
      offset: -1.15,
      slotLength: 3.55,
      waypoints: [
        {
          left: 91.9,
          top: 29.2,
        },
      ],
    },
    'pit-ny-2': {
      offset: 0.25,
      slotLength: 3.55,
      waypoints: [
        {
          left: 91.7,
          top: 29.3,
        },
      ],
    },
    'tor-pit': {
      waypoints: [
        {
          left: 82.2,
          top: 22.3,
        },
      ],
      slotLength: 3.5,
    },
    'tor-mtl': {
      waypoints: [
        {
          left: 80.7,
          top: 21,
        },
        {
          left: 82.7,
          top: 15.1,
        },
        {
          left: 85.9,
          top: 10.9,
        },
        {
          left: 90.3,
          top: 8.2,
        },
      ],
      slotLength: 3.45,
    },
    'mtl-bos-1': {
      offset: -1.1,
      slotLength: 3.3,
    },
    'mtl-bos-2': {
      offset: 0.65,
      slotLength: 3.25,
    },
    'ny-bos-2': {
      waypoints: [
        {
          left: 93.3,
          top: 28.6,
        },
        {
          left: 97.7,
          top: 17.4,
        },
      ],
      slotLength: 3.4,
    },
    'ny-bos-1': {
      waypoints: [
        {
          left: 92.9,
          top: 29.8,
        },
        {
          left: 97.7,
          top: 17.5,
        },
      ],
      slotLength: 3.45,
      offset: -0.6,
    },
    'atl-cha': {
      slotLength: 3.45,
      offset: 0.6,
      waypoints: [
        {
          left: 89.6,
          top: 65.6,
        },
        {
          left: 80.4,
          top: 64.9,
        },
      ],
    },
    'mtl-ny': {
      offset: 0.45,
      slotLength: 3.5,
      waypoints: [
        {
          left: 89.9,
          top: 8.7,
        },
      ],
    },
    'phx-elp': {
      slotLength: 3.25,
      waypoints: [
        {
          left: 37.1,
          top: 84.1,
        },
        {
          left: 24.3,
          top: 78.6,
        },
      ],
    },
    'phx-sfe': {
      waypoints: [
        {
          left: 37.7,
          top: 69.2,
        },
      ],
      slotLength: 3.4,
    },
    'nas-lr': {
      waypoints: [
        {
          left: 75.1,
          top: 58.8,
        },
        {
          left: 71.2,
          top: 64.2,
        },
        {
          left: 67.9,
          top: 66.2,
        },
        {
          left: 62.9,
          top: 66.9,
        },
      ],
      slotLength: 3.75,
    },
    'kc-okc-2': {
      waypoints: [
        {
          left: 56.5,
          top: 53.3,
        },
        {
          left: 54,
          top: 66.5,
        },
      ],
      slotLength: 3.35,
    },
    'slc-hel': {
      waypoints: [
        {
          left: 31.9,
          top: 30.8,
        },
        {
          left: 24.9,
          top: 48.8,
        },
      ],
      slotLength: 3.3,
    },
    'sea-van-1': {
      waypoints: [
        {
          left: 8,
          top: 20.5,
        },
      ],
      slotLength: 3.3,
    },
    'kc-stl-1': {
      waypoints: [
        {
          left: 64.9,
          top: 52,
        },
        {
          left: 55.9,
          top: 52.5,
        },
      ],
      slotLength: 3.35,
    },
    'nas-atl': {
      slotLength: 3.35,
      waypoints: [
        {
          left: 74.5,
          top: 58.4,
        },
      ],
    },
    'sfe-den': {
      waypoints: [
        {
          left: 37.8,
          top: 55.4,
        },
        {
          left: 37.3,
          top: 70,
        },
      ],
      slotLength: 3.35,
    },
    'sfe-elp': {
      waypoints: [
        {
          left: 37.4,
          top: 69.7,
        },
        {
          left: 37,
          top: 84.5,
        },
      ],
      slotLength: 3.4,
    },
    'ral-atl-1': {
      waypoints: [
        {
          left: 87.1,
          top: 55,
        },
        {
          left: 79.7,
          top: 64.8,
        },
      ],
      slotLength: 3.3,
    },
    'ral-atl-2': {
      slotLength: 3.3,
      waypoints: [
        {
          left: 87.1,
          top: 55.2,
        },
        {
          left: 79.8,
          top: 64.9,
        },
      ],
    },
    'was-ral-1': {
      waypoints: [
        {
          left: 86.7,
          top: 55.6,
        },
        {
          left: 93.2,
          top: 43.6,
        },
      ],
      slotLength: 3.25,
    },
    'was-ral-2': {
      waypoints: [
        {
          left: 87.2,
          top: 55.3,
        },
        {
          left: 93.1,
          top: 44.6,
        },
      ],
      slotLength: 3.2,
    },
  },
};
