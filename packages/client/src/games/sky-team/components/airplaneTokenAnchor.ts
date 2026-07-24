/** Position/size of the placed airplane token as % of the approach card. */
export type AirplaneTokenAnchor = {
  left: number;
  top: number;
  width: number;
};

/** Edit these by hand to place the center airplane token on ApproachCard. */
export const DEFAULT_AIRPLANE_TOKEN_ANCHOR: AirplaneTokenAnchor = {
  left: 50,
  top: 50,
  width: 18,
};
