import type { TtrMapId } from 'shared';
import { TTR_DEFAULT_MAP_ID } from 'shared';
import type { TtrBoardLayout } from '../boardGeometry';
import { imageMap } from '../../../imageMap';
import {
  EUROPE_DESTINATION_CARD_LAYOUT,
  INDIA_DESTINATION_CARD_LAYOUT,
  JAPAN_DESTINATION_CARD_LAYOUT,
  UNITED_STATES_DESTINATION_CARD_LAYOUT,
  type TtrDestinationCardLayout,
} from './destinationCardLayout';
import { EUROPE_BOARD_LAYOUT } from './europeLayout';
import { INDIA_BOARD_LAYOUT } from './indiaLayout';
import { JAPAN_BOARD_LAYOUT } from './japanLayout';
import { UNITED_STATES_BOARD_LAYOUT } from './unitedStatesLayout';

export type TtrMapPresentation = {
  /** Printed board art the overlay is calibrated against. */
  image: string;
  layout: TtrBoardLayout;
  /** Destination ticket front template + percent overlays for route/points. */
  destinationCard: {
    image: string;
    layout: TtrDestinationCardLayout;
  };
};

/** Board art + overlay calibration per map. Adding an expansion means adding one entry. */
export const TTR_MAP_PRESENTATION: Readonly<Record<TtrMapId, TtrMapPresentation>> = {
  'united-states': {
    image: imageMap.ticketToRide.maps['united-states'],
    layout: UNITED_STATES_BOARD_LAYOUT,
    destinationCard: {
      image: imageMap.ticketToRide.destinationCardFronts['united-states'],
      layout: UNITED_STATES_DESTINATION_CARD_LAYOUT,
    },
  },
  europe: {
    image: imageMap.ticketToRide.maps.europe,
    layout: EUROPE_BOARD_LAYOUT,
    destinationCard: {
      image: imageMap.ticketToRide.destinationCardFronts.europe,
      layout: EUROPE_DESTINATION_CARD_LAYOUT,
    },
  },
  india: {
    image: imageMap.ticketToRide.maps.india,
    layout: INDIA_BOARD_LAYOUT,
    destinationCard: {
      image: imageMap.ticketToRide.destinationCardFronts.india,
      layout: INDIA_DESTINATION_CARD_LAYOUT,
    },
  },
  japan: {
    image: imageMap.ticketToRide.maps.japan,
    layout: JAPAN_BOARD_LAYOUT,
    destinationCard: {
      image: imageMap.ticketToRide.destinationCardFronts.japan,
      layout: JAPAN_DESTINATION_CARD_LAYOUT,
    },
  },
};

export function ttrMapPresentation(mapId: TtrMapId | undefined): TtrMapPresentation {
  return TTR_MAP_PRESENTATION[mapId ?? TTR_DEFAULT_MAP_ID] ?? TTR_MAP_PRESENTATION['united-states'];
}

export {
  EUROPE_BOARD_LAYOUT,
  EUROPE_DESTINATION_CARD_LAYOUT,
  INDIA_BOARD_LAYOUT,
  INDIA_DESTINATION_CARD_LAYOUT,
  JAPAN_BOARD_LAYOUT,
  JAPAN_DESTINATION_CARD_LAYOUT,
  UNITED_STATES_BOARD_LAYOUT,
  UNITED_STATES_DESTINATION_CARD_LAYOUT,
};
export type { TtrDestinationCardLayout };
