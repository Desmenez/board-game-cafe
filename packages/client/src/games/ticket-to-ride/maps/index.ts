import type { TtrMapId } from 'shared';
import { TTR_DEFAULT_MAP_ID } from 'shared';
import type { TtrBoardLayout } from '../boardGeometry';
import { imageMap } from '../../../imageMap';
import { UNITED_STATES_BOARD_LAYOUT } from './unitedStatesLayout';

export type TtrMapPresentation = {
  /** Printed board art the overlay is calibrated against. */
  image: string;
  layout: TtrBoardLayout;
};

/** Board art + overlay calibration per map. Adding an expansion means adding one entry. */
export const TTR_MAP_PRESENTATION: Readonly<Record<TtrMapId, TtrMapPresentation>> = {
  'united-states': {
    image: imageMap.ticketToRide.maps['united-states'],
    layout: UNITED_STATES_BOARD_LAYOUT,
  },
};

export function ttrMapPresentation(mapId: TtrMapId | undefined): TtrMapPresentation {
  return TTR_MAP_PRESENTATION[mapId ?? TTR_DEFAULT_MAP_ID] ?? TTR_MAP_PRESENTATION['united-states'];
}

export { UNITED_STATES_BOARD_LAYOUT };
