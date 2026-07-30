import type { TtrBoardLayout } from '../boardGeometry';

/**
 * Overlay calibration for the printed Europe board (`map-europe_h5tijj`, 1744×1125).
 * Tuned in `/dev/ticket-to-ride-layout` and pasted back over these defaults.
 */
export const EUROPE_BOARD_LAYOUT: TtrBoardLayout = {
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
    amsterdam: { left: 30.7, top: 29.1 },
    angora: { left: 87.6, top: 93.7 },
    athina: { left: 66.8, top: 93.5 },
    barcelona: { left: 19.8, top: 87.8 },
    berlin: { left: 49, top: 32.7 },
    brest: { left: 11.1, top: 47.1 },
    brindisi: { left: 54.4, top: 81.3 },
    bruxelles: { left: 28.5, top: 36.5 },
    bucuresti: { left: 74.8, top: 65.6 },
    budapest: { left: 59.6, top: 54.9 },
    cadiz: { left: 8.5, top: 97.6 },
    constantinople: { left: 79.8, top: 85.1 },
    danzic: { left: 60.5, top: 20.7 },
    dieppe: { left: 20, top: 42.7 },
    edinburgh: { left: 14.5, top: 5.3 },
    erzurum: { left: 95.7, top: 89.9 },
    essen: { left: 38.9, top: 30.6 },
    frankfurt: { left: 37.5, top: 41.5 },
    kharkov: { left: 94.1, top: 48.1 },
    kobenhavn: { left: 46.2, top: 14 },
    kyiv: { left: 80.5, top: 39.8 },
    lisboa: { left: 1.9, top: 89.6 },
    london: { left: 21.1, top: 28.6 },
    madrid: { left: 8.7, top: 86.2 },
    marseille: { left: 33.8, top: 72.7 },
    moskva: { left: 95.6, top: 24.6 },
    munchen: { left: 43.2, top: 48.4 },
    palermo: { left: 49.5, top: 97.8 },
    pamplona: { left: 18.5, top: 73.5 },
    paris: { left: 25, top: 49.6 },
    petrograd: { left: 85.8, top: 5.9 },
    riga: { left: 68.8, top: 6.6 },
    roma: { left: 45.7, top: 77.2 },
    rostov: { left: 98.1, top: 56.4 },
    sarajevo: { left: 62, top: 74.2 },
    sevastopol: { left: 88.7, top: 67.9 },
    smolensk: { left: 86.9, top: 28.3 },
    smyrna: { left: 75.4, top: 97.4 },
    sochi: { left: 97.6, top: 70.3 },
    sofia: { left: 68.7, top: 75.8 },
    stockholm: { left: 56.6, top: 2.1 },
    venezia: { left: 45, top: 63.2 },
    warszawa: { left: 65.4, top: 31.6 },
    wien: { left: 54.7, top: 51 },
    wilno: { left: 76.6, top: 27.4 },
    zagrab: { left: 53.5, top: 65.1 },
    zurich: { left: 36.7, top: 58.2 },
  },
  routes: {
    'ams-bru': { slotLength: 3.35 },
    'ams-ess': {
      waypoints: [
        { left: 30.4, top: 29.4 },
        { left: 31.5, top: 23.2 },
        { left: 35.3, top: 24.7 },
        { left: 38.9, top: 31 },
      ],
      slotLength: 3.55,
    },
    'ams-fra': {
      waypoints: [
        { left: 31.5, top: 30.5 },
        { left: 34.3, top: 34.7 },
        { left: 37.2, top: 39.3 },
      ],
      slotLength: 3.35,
    },
    'ams-lon': {
      waypoints: [
        { left: 20.9, top: 28.4 },
        { left: 30.6, top: 28.8 },
      ],
      slotLength: 3.45,
    },
    'ang-con': {
      waypoints: [
        { left: 79.7, top: 84.6 },
        { left: 87.8, top: 93.6 },
      ],
      slotLength: 3.4,
    },
    'ang-erz': {
      waypoints: [
        { left: 88, top: 93 },
        { left: 92, top: 97.1 },
        { left: 96.3, top: 95.7 },
        { left: 95.7, top: 89.6 },
      ],
      slotLength: 3.45,
    },
    'ang-smy': {
      waypoints: [
        { left: 75.1, top: 97.6 },
        { left: 80.1, top: 98.2 },
        { left: 83.9, top: 97.6 },
        { left: 87.9, top: 93.7 },
      ],
      slotLength: 3.65,
    },
    'ath-bri': {
      waypoints: [
        { left: 55.4, top: 81.4 },
        { left: 58.5, top: 93.2 },
        { left: 62, top: 94.9 },
        { left: 67.4, top: 93.9 },
      ],
      slotLength: 3.65,
    },
    'ath-sar': {
      waypoints: [
        { left: 62, top: 74.2 },
        { left: 61.4, top: 91.7 },
        { left: 66.8, top: 92 },
      ],
      slotLength: 3.4,
    },
    'ath-smy': {
      waypoints: [
        { left: 66.4, top: 93.3 },
        { left: 71.2, top: 93.1 },
        { left: 75.4, top: 95.9 },
      ],
      slotLength: 3.5,
    },
    'ath-sof': {
      waypoints: [
        { left: 67.2, top: 93 },
        { left: 65, top: 86.3 },
        { left: 65.6, top: 80.8 },
        { left: 68.8, top: 75.3 },
      ],
      slotLength: 3.45,
    },
    'bar-mad': {
      waypoints: [
        { left: 20.6, top: 87.4 },
        { left: 8.6, top: 86.7 },
      ],
      slotLength: 3.4,
    },
    'bar-mar': {
      waypoints: [
        { left: 22.9, top: 82.6 },
        { left: 26.1, top: 78 },
        { left: 29.3, top: 75.3 },
      ],
      slotLength: 3.4,
    },
    'bar-pam': { slotLength: 3.3 },
    'ber-dan': {
      waypoints: [
        { left: 60.8, top: 20 },
        { left: 56.1, top: 18.5 },
        { left: 52.3, top: 19.9 },
        { left: 49.9, top: 25 },
        { left: 49.3, top: 31.3 },
      ],
      slotLength: 3.9,
    },
    'ber-ess': {
      waypoints: [
        { left: 40.1, top: 29.7 },
        { left: 49.4, top: 31.3 },
      ],
      slotLength: 3.4,
    },
    'ber-fra-1': {
      waypoints: [
        { left: 37.3, top: 42.5 },
        { left: 49.5, top: 33.5 },
      ],
      slotLength: 3.4,
    },
    'ber-fra-2': {
      waypoints: [
        { left: 37.6, top: 42.3 },
        { left: 49.2, top: 33.5 },
      ],
      slotLength: 3.6,
    },
    'ber-war-1': {
      waypoints: [
        { left: 65.6, top: 31.7 },
        { left: 61, top: 30.3 },
        { left: 57.1, top: 30.4 },
        { left: 53.4, top: 31.3 },
        { left: 49, top: 33.5 },
      ],
      slotLength: 3.45,
    },
    'ber-war-2': {
      waypoints: [
        { left: 65.7, top: 31.7 },
        { left: 61, top: 30.5 },
        { left: 57.3, top: 30.5 },
        { left: 53.4, top: 31.1 },
        { left: 48.8, top: 33.5 },
      ],
      slotLength: 3.65,
    },
    'ber-wie': {
      waypoints: [
        { left: 55.3, top: 51.4 },
        { left: 52.3, top: 45.2 },
        { left: 50.3, top: 39.8 },
        { left: 48.9, top: 31.8 },
      ],
      slotLength: 3.35,
    },
    'bre-die': {
      waypoints: [
        { left: 20.3, top: 42.1 },
        { left: 15.3, top: 42.2 },
        { left: 10.5, top: 46.5 },
      ],
      slotLength: 3.7,
    },
    'bre-pam': {
      waypoints: [
        { left: 9.5, top: 47.7 },
        { left: 15.5, top: 51.5 },
        { left: 17.5, top: 56.3 },
        { left: 18, top: 62.4 },
        { left: 18, top: 68.1 },
      ],
      slotLength: 3.4,
    },
    'bre-par': { waypoints: [{ left: 10.5, top: 46.8 }], slotLength: 3.45 },
    'bri-pal': {
      waypoints: [
        { left: 53.7, top: 80.6 },
        { left: 55.9, top: 88.4 },
        { left: 52.8, top: 93.3 },
        { left: 49.8, top: 99.4 },
      ],
      slotLength: 3.55,
    },
    'bri-rom': {
      waypoints: [
        { left: 46.2, top: 76.5 },
        { left: 51.1, top: 75.8 },
        { left: 54.7, top: 81.9 },
      ],
      slotLength: 3.5,
    },
    'bru-die': {
      waypoints: [
        { left: 27.4, top: 35.9 },
        { left: 21.1, top: 42.6 },
      ],
      slotLength: 3.3,
    },
    'bru-fra': {
      waypoints: [
        { left: 28.4, top: 37.8 },
        { left: 32.9, top: 36 },
        { left: 37, top: 41.9 },
      ],
      slotLength: 3.55,
    },
    'bru-par-1': {
      waypoints: [
        { left: 24.3, top: 50.3 },
        { left: 29.5, top: 35.6 },
      ],
      slotLength: 3.45,
    },
    'bru-par-2': {
      waypoints: [
        { left: 24.7, top: 49.6 },
        { left: 29.1, top: 36.6 },
      ],
      slotLength: 3.6,
    },
    'buc-bud': {
      waypoints: [
        { left: 74.5, top: 65.8 },
        { left: 60.1, top: 54.4 },
      ],
      slotLength: 3.3,
    },
    'buc-con': {
      waypoints: [
        { left: 74.6, top: 65 },
        { left: 80.1, top: 85.2 },
      ],
      slotLength: 3.4,
    },
    'buc-kyi': {
      waypoints: [
        { left: 73.9, top: 66.4 },
        { left: 79.8, top: 39.2 },
      ],
      slotLength: 3.35,
    },
    'buc-sev': {
      waypoints: [
        { left: 89.4, top: 69 },
        { left: 85.8, top: 62 },
        { left: 82.2, top: 59.1 },
        { left: 78.5, top: 60.6 },
        { left: 74.2, top: 66.7 },
      ],
      slotLength: 3.55,
    },
    'buc-sof': {
      waypoints: [
        { left: 73.8, top: 66 },
        { left: 73.3, top: 72.5 },
        { left: 69.5, top: 74.3 },
      ],
      slotLength: 3.45,
    },
    'bud-kyi': {
      waypoints: [
        { left: 80.8, top: 40.9 },
        { left: 72.1, top: 40.8 },
        { left: 64.8, top: 45.8 },
        { left: 59, top: 54.2 },
      ],
      slotLength: 3.4,
    },
    'bud-sar': {
      waypoints: [
        { left: 59.8, top: 53.8 },
        { left: 61.8, top: 75.3 },
      ],
      slotLength: 3.4,
    },
    'bud-wie-1': {
      waypoints: [
        { left: 54.2, top: 51.1 },
        { left: 59.4, top: 56 },
      ],
      slotLength: 3.4,
    },
    'bud-wie-2': {
      waypoints: [
        { left: 54.1, top: 50.7 },
        { left: 59.6, top: 55.8 },
      ],
      slotLength: 3.4,
    },
    'bud-zag': {
      waypoints: [
        { left: 53.5, top: 66 },
        { left: 57, top: 60.9 },
        { left: 59.6, top: 54.3 },
      ],
      slotLength: 3.6,
    },
    'cad-lis': {
      waypoints: [
        { left: 1.7, top: 89.1 },
        { left: 3.9, top: 96.3 },
        { left: 8.8, top: 97.9 },
      ],
      slotLength: 3.6,
    },
    'cad-mad': {
      waypoints: [
        { left: 9.4, top: 87.1 },
        { left: 12.5, top: 91 },
        { left: 13.5, top: 95.3 },
        { left: 8.4, top: 98.2 },
      ],
      slotLength: 3.55,
    },
    'con-sev': {
      waypoints: [
        { left: 87.7, top: 68.3 },
        { left: 87.6, top: 74.9 },
        { left: 85.1, top: 80.8 },
        { left: 82.9, top: 78.3 },
        { left: 80.2, top: 84.4 },
      ],
      slotLength: 3.6,
    },
    'con-smy': { offset: -0.15, slotLength: 3.15 },
    'con-sof': {
      waypoints: [
        { left: 68.5, top: 75.6 },
        { left: 80.2, top: 85.4 },
      ],
      slotLength: 3.4,
    },
    'dan-rig': {
      waypoints: [
        { left: 69, top: 6.3 },
        { left: 64.1, top: 9.1 },
        { left: 61.8, top: 14 },
        { left: 60.4, top: 21.2 },
      ],
      slotLength: 3.45,
    },
    'dan-war': {
      waypoints: [
        { left: 65.3, top: 30.2 },
        { left: 64.5, top: 24.2 },
        { left: 60.2, top: 20.1 },
      ],
      slotLength: 3.6,
    },
    'die-lon-1': {
      waypoints: [
        { left: 20.8, top: 28.1 },
        { left: 19.8, top: 43.2 },
      ],
      slotLength: 3.4,
    },
    'die-lon-2': {
      waypoints: [
        { left: 20.9, top: 28.1 },
        { left: 20, top: 43.1 },
      ],
      slotLength: 3.4,
    },
    'die-par': { waypoints: [{ left: 20, top: 41.8 }], slotLength: 3.45 },
    'edi-lon-1': {
      waypoints: [
        { left: 21.1, top: 29.7 },
        { left: 14.3, top: 4.6 },
      ],
      slotLength: 3.3,
    },
    'edi-lon-2': {
      waypoints: [
        { left: 21, top: 28.7 },
        { left: 14.7, top: 5.5 },
      ],
      slotLength: 3.3,
    },
    'erz-sev': {
      waypoints: [
        { left: 95.2, top: 89.4 },
        { left: 91.6, top: 85.6 },
        { left: 89.6, top: 80.8 },
        { left: 89, top: 75 },
        { left: 88.9, top: 67.4 },
      ],
      slotLength: 3.45,
    },
    'erz-soc': {
      waypoints: [
        { left: 95.8, top: 90.3 },
        { left: 97.6, top: 70 },
      ],
      slotLength: 3.45,
    },
    'ess-fra': {
      waypoints: [
        { left: 36.9, top: 39.2 },
        { left: 41.4, top: 35.8 },
        { left: 39.7, top: 29.4 },
      ],
      slotLength: 3.45,
    },
    'ess-kob-1': {
      waypoints: [
        { left: 38.5, top: 30.6 },
        { left: 46.2, top: 13.1 },
      ],
      slotLength: 3.35,
    },
    'ess-kob-2': {
      waypoints: [
        { left: 38.6, top: 30.7 },
        { left: 46.3, top: 13.3 },
      ],
      slotLength: 3.35,
    },
    'fra-mun': {
      waypoints: [
        { left: 37.6, top: 40.1 },
        { left: 39.2, top: 49.4 },
        { left: 43.5, top: 47.1 },
      ],
      slotLength: 3.5,
    },
    'fra-par-1': {
      waypoints: [
        { left: 26.7, top: 50.5 },
        { left: 30.6, top: 48.4 },
        { left: 33.7, top: 45.8 },
        { left: 37.8, top: 41.2 },
      ],
      slotLength: 3.45,
    },
    'fra-par-2': {
      waypoints: [
        { left: 26.5, top: 50.6 },
        { left: 30.8, top: 48.2 },
        { left: 33.5, top: 45.8 },
        { left: 38.2, top: 40.6 },
      ],
      slotLength: 3.5,
    },
    'kha-kyi': {
      waypoints: [
        { left: 94.3, top: 47.7 },
        { left: 89.9, top: 49.7 },
        { left: 85.8, top: 49.6 },
        { left: 82.1, top: 46.5 },
        { left: 80.5, top: 39.5 },
      ],
      slotLength: 3.6,
    },
    'kha-mos': {
      waypoints: [
        { left: 93.5, top: 48.8 },
        { left: 96.8, top: 43.1 },
        { left: 98.3, top: 36.7 },
        { left: 97.5, top: 30.7 },
        { left: 95.4, top: 23.8 },
      ],
      slotLength: 3.6,
    },
    'kha-ros': {
      waypoints: [
        { left: 94, top: 48.2 },
        { left: 98.3, top: 48.2 },
        { left: 98.3, top: 56.4 },
      ],
      slotLength: 3.8,
    },
    'kob-sto-1': {
      waypoints: [
        { left: 57, top: 1.2 },
        { left: 52.3, top: 5.1 },
        { left: 49.2, top: 9.1 },
        { left: 45.7, top: 14.8 },
      ],
      slotLength: 3.35,
    },
    'kob-sto-2': {
      waypoints: [
        { left: 56.6, top: 1.8 },
        { left: 52.2, top: 5.5 },
        { left: 49.4, top: 9.2 },
        { left: 46, top: 14.5 },
      ],
      slotLength: 3.6,
    },
    'kyi-smo': {
      waypoints: [
        { left: 80.3, top: 39.8 },
        { left: 85.5, top: 40.2 },
        { left: 88.4, top: 35.6 },
        { left: 86.9, top: 27.8 },
      ],
      slotLength: 3.6,
    },
    'kyi-war': {
      waypoints: [
        { left: 80.4, top: 38.4 },
        { left: 76.1, top: 38.4 },
        { left: 71.9, top: 38.5 },
        { left: 68.5, top: 36.4 },
        { left: 65.1, top: 30.9 },
      ],
      slotLength: 3.45,
    },
    'kyi-wil': {
      waypoints: [
        { left: 80.6, top: 40.1 },
        { left: 80.8, top: 31.9 },
        { left: 76.4, top: 27.2 },
      ],
      slotLength: 3.65,
    },
    'lis-mad': {
      waypoints: [
        { left: 9, top: 86.1 },
        { left: 4.8, top: 81.7 },
        { left: 1.7, top: 81.6 },
        { left: 1.8, top: 90 },
      ],
      slotLength: 3.55,
    },
    'mad-pam-1': {
      waypoints: [
        { left: 18.2, top: 72.9 },
        { left: 14.3, top: 76.6 },
        { left: 12.1, top: 80.3 },
        { left: 8.9, top: 86.4 },
      ],
      slotLength: 3.5,
    },
    'mad-pam-2': {
      waypoints: [
        { left: 17.6, top: 73.4 },
        { left: 14, top: 77.2 },
        { left: 11.2, top: 81.6 },
        { left: 8.6, top: 86.7 },
      ],
      slotLength: 3.35,
    },
    'mar-pam': {
      waypoints: [
        { left: 18.1, top: 73.2 },
        { left: 22.7, top: 75.8 },
        { left: 24.2, top: 68.9 },
        { left: 28.5, top: 68.9 },
      ],
      slotLength: 3.5,
    },
    'mar-par': {
      waypoints: [
        { left: 34.7, top: 73.3 },
        { left: 31.5, top: 66.7 },
        { left: 27.9, top: 63.6 },
        { left: 25.7, top: 58.1 },
        { left: 25.5, top: 49.3 },
      ],
      slotLength: 3.45,
    },
    'mar-rom': {
      waypoints: [
        { left: 34.3, top: 73.3 },
        { left: 40.5, top: 66.4 },
        { left: 45.8, top: 77.8 },
      ],
      slotLength: 3.55,
    },
    'mar-zur': {
      waypoints: [
        { left: 34.5, top: 71.5 },
        { left: 37.1, top: 57.8 },
      ],
      slotLength: 3.4,
    },
    'mos-pet': {
      waypoints: [
        { left: 95.4, top: 25 },
        { left: 94.9, top: 17.3 },
        { left: 93.4, top: 12.1 },
        { left: 90.3, top: 8.1 },
        { left: 85.5, top: 5.7 },
      ],
      slotLength: 3.75,
    },
    'mos-smo': {
      waypoints: [
        { left: 95.9, top: 24 },
        { left: 91.7, top: 28.9 },
        { left: 86.6, top: 28.2 },
      ],
      slotLength: 3.7,
    },
    'mun-ven': {
      waypoints: [
        { left: 43.1, top: 49.1 },
        { left: 45, top: 63.7 },
      ],
      slotLength: 3.3,
    },
    'mun-wie': {
      waypoints: [
        { left: 43.3, top: 47.7 },
        { left: 46.4, top: 53.9 },
        { left: 50.4, top: 54.4 },
        { left: 54.3, top: 49.9 },
      ],
      slotLength: 3.75,
    },
    'mun-zur': {
      waypoints: [
        { left: 36.6, top: 58.3 },
        { left: 43.4, top: 48.5 },
      ],
      slotLength: 3.35,
    },
    'pal-rom': {
      waypoints: [
        { left: 45, top: 76.8 },
        { left: 49.7, top: 80.6 },
        { left: 52.1, top: 85.9 },
        { left: 52.1, top: 91.6 },
        { left: 48.7, top: 98.1 },
      ],
      slotLength: 3.4,
    },
    'pal-smy': {
      waypoints: [
        { left: 50.3, top: 97.2 },
        { left: 76.3, top: 97.6 },
      ],
      slotLength: 3.25,
    },
    'pam-par-1': {
      waypoints: [
        { left: 17.8, top: 73.4 },
        { left: 20.8, top: 67.5 },
        { left: 22.1, top: 62.4 },
        { left: 23.2, top: 56.6 },
        { left: 23.7, top: 49.7 },
      ],
      slotLength: 3.45,
    },
    'pam-par-2': {
      waypoints: [
        { left: 25.3, top: 48.2 },
        { left: 24.7, top: 56.8 },
        { left: 23.7, top: 62.4 },
        { left: 22.2, top: 67.9 },
        { left: 19, top: 75.1 },
      ],
      slotLength: 3.45,
    },
    'par-zur': {
      waypoints: [
        { left: 26.5, top: 51.5 },
        { left: 28.9, top: 56.9 },
        { left: 32.1, top: 59.1 },
        { left: 37.5, top: 59.1 },
      ],
      slotLength: 3.3,
    },
    'pet-rig': {
      waypoints: [
        { left: 69.3, top: 6.7 },
        { left: 85.1, top: 6.6 },
      ],
      slotLength: 3.35,
    },
    'pet-sto': {
      waypoints: [
        { left: 85.4, top: 5 },
        { left: 81.3, top: 2.1 },
        { left: 62.9, top: 2.3 },
        { left: 59.1, top: 6.6 },
        { left: 56.5, top: 1.8 },
      ],
      slotLength: 3.55,
    },
    'pet-wil': {
      waypoints: [
        { left: 76.3, top: 27.5 },
        { left: 86.2, top: 6.1 },
      ],
      slotLength: 3.7,
    },
    'rig-wil': {
      waypoints: [
        { left: 76.9, top: 26.1 },
        { left: 69.8, top: 19.5 },
        { left: 68.2, top: 13.8 },
        { left: 69.3, top: 6.2 },
      ],
      slotLength: 3.5,
    },
    'rom-ven': {
      waypoints: [
        { left: 44.8, top: 63.1 },
        { left: 46.4, top: 76.5 },
      ],
      slotLength: 3.35,
    },
    'ros-sev': {
      waypoints: [
        { left: 98.5, top: 56.1 },
        { left: 90.6, top: 54.3 },
        { left: 89.2, top: 68.2 },
      ],
      slotLength: 3.45,
    },
    'ros-soc': {
      waypoints: [
        { left: 97.5, top: 70.5 },
        { left: 98.3, top: 56.3 },
      ],
      slotLength: 3.35,
    },
    'sar-sof': {
      waypoints: [
        { left: 62.7, top: 73.4 },
        { left: 66.5, top: 70.2 },
        { left: 68.2, top: 74.7 },
      ],
      slotLength: 3.45,
    },
    'sar-zag': {
      waypoints: [
        { left: 53.4, top: 63.8 },
        { left: 53.9, top: 72.8 },
        { left: 57.3, top: 76.1 },
        { left: 63, top: 73.4 },
      ],
      slotLength: 3.7,
    },
    'sev-soc': {},
    'smo-wil': {
      waypoints: [
        { left: 86.9, top: 28.9 },
        { left: 80.5, top: 21.8 },
        { left: 77.6, top: 28 },
      ],
      slotLength: 3.65,
    },
    'ven-zag': {
      waypoints: [
        { left: 44, top: 63.2 },
        { left: 49.4, top: 61.2 },
        { left: 54.1, top: 65.9 },
      ],
      slotLength: 3.55,
    },
    'ven-zur': {
      waypoints: [
        { left: 35.9, top: 57.6 },
        { left: 45.3, top: 65.2 },
      ],
      slotLength: 3.35,
    },
    'war-wie': {
      waypoints: [
        { left: 65.7, top: 32.2 },
        { left: 63.5, top: 38.3 },
        { left: 61.2, top: 43.1 },
        { left: 58.3, top: 47.1 },
        { left: 54.3, top: 50.7 },
      ],
      slotLength: 3.45,
    },
    'war-wil': {
      waypoints: [
        { left: 76.5, top: 28.3 },
        { left: 72.1, top: 24.2 },
        { left: 68, top: 25.6 },
        { left: 66.1, top: 32.3 },
      ],
      slotLength: 3.65,
    },
    'wie-zag': {
      waypoints: [
        { left: 54, top: 51.3 },
        { left: 53.3, top: 64.8 },
      ],
      slotLength: 3.3,
    },
  },
};
