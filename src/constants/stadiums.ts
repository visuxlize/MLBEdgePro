export interface StadiumInfo {
  lat: number;
  lon: number;
  name: string;
  indoor?: boolean; // true only for fixed-dome stadiums
}

// Keyed by MLB Stats API venue.id (confirmed from statsapi.mlb.com)
export const STADIUM_COORDS: Record<number, StadiumInfo> = {
  1: { lat: 33.8003, lon: -117.8827, name: 'Angel Stadium' },
  2: { lat: 39.2838, lon: -76.6218, name: 'Oriole Park at Camden Yards' },
  3: { lat: 42.3467, lon: -71.0972, name: 'Fenway Park' },
  4: { lat: 41.8299, lon: -87.6338, name: 'Rate Field' },
  5: { lat: 41.4962, lon: -81.6852, name: 'Progressive Field' },
  7: { lat: 39.0974, lon: -94.5878, name: 'Kauffman Stadium' },
  12: { lat: 27.7683, lon: -82.6534, name: 'Tropicana Field', indoor: true },
  14: { lat: 43.6414, lon: -79.3890, name: 'Rogers Centre' },
  15: { lat: 33.4453, lon: -112.0667, name: 'Chase Field' },
  17: { lat: 41.9484, lon: -87.6553, name: 'Wrigley Field' },
  19: { lat: 39.7559, lon: -104.9942, name: 'Coors Field' },
  22: { lat: 34.0739, lon: -118.2400, name: 'Dodger Stadium' },
  31: { lat: 40.4469, lon: -80.0057, name: 'PNC Park' },
  32: { lat: 44.5013, lon: -88.0625, name: 'American Family Field' },
  680: { lat: 47.5914, lon: -122.3325, name: 'T-Mobile Park' },
  2392: { lat: 29.7573, lon: -95.3555, name: 'Daikin Park' },
  2394: { lat: 42.3390, lon: -83.0485, name: 'Comerica Park' },
  2395: { lat: 37.7786, lon: -122.3893, name: 'Oracle Park' },
  2529: { lat: 38.5797, lon: -121.4975, name: 'Sutter Health Park' },
  2602: { lat: 39.0974, lon: -84.5070, name: 'Great American Ball Park' },
  2680: { lat: 32.7073, lon: -117.1566, name: 'Petco Park' },
  2681: { lat: 39.9061, lon: -75.1665, name: 'Citizens Bank Park' },
  2889: { lat: 38.6226, lon: -90.1928, name: 'Busch Stadium' },
  3289: { lat: 40.7571, lon: -73.8458, name: 'Citi Field' },
  3309: { lat: 38.8730, lon: -77.0074, name: 'Nationals Park' },
  3312: { lat: 44.9817, lon: -93.2776, name: 'Target Field' },
  3313: { lat: 40.8296, lon: -73.9262, name: 'Yankee Stadium' },
  4169: { lat: 25.7781, lon: -80.2197, name: 'loanDepot park' },
  4705: { lat: 33.8903, lon: -84.4677, name: 'Truist Park' },
  5325: { lat: 32.7512, lon: -97.0832, name: 'Globe Life Field' },
};

// Fallback: lookup by venue name when ID isn't in the map
const COORDS_BY_NAME: Record<string, StadiumInfo> = Object.fromEntries(
  Object.values(STADIUM_COORDS).map((s) => [s.name.toLowerCase(), s]),
);

export function getStadiumInfo(venueId: number, venueName: string): StadiumInfo | null {
  return STADIUM_COORDS[venueId] ?? COORDS_BY_NAME[venueName.toLowerCase()] ?? null;
}
