// MLB team ID → primary color (used for logo fallback circle)
export const TEAM_COLORS: Record<number, string> = {
  108: '#BA0021', // Angels
  109: '#A71930', // Diamondbacks
  110: '#DF4601', // Orioles
  111: '#BD3039', // Red Sox
  112: '#0E3386', // Cubs
  113: '#C6011F', // Reds
  114: '#00385D', // Guardians
  115: '#33006F', // Rockies
  116: '#0C2340', // Tigers
  117: '#EB6E1F', // Astros
  118: '#004687', // Royals
  119: '#005A9C', // Dodgers
  120: '#AB0003', // Nationals
  121: '#002D72', // Mets
  133: '#003831', // Athletics
  134: '#27251F', // Pirates
  135: '#2F241D', // Padres
  136: '#0C2C56', // Mariners
  137: '#FD5A1E', // Giants
  138: '#C41E3A', // Cardinals
  139: '#092C5C', // Rays
  140: '#003278', // Rangers
  141: '#134A8E', // Blue Jays
  142: '#002B5C', // Twins
  143: '#E81828', // Phillies
  144: '#CE1141', // Braves
  145: '#27251F', // White Sox
  146: '#00A3E0', // Marlins
  147: '#003087', // Yankees
  158: '#12284B', // Brewers
};

// MLB team ID → display abbreviation (uppercase, shown in score cards)
export const TEAM_DISPLAY_ABBR: Record<number, string> = {
  108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC', 113: 'CIN',
  114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU', 118: 'KC',  119: 'LAD',
  120: 'WSH', 121: 'NYM', 133: 'OAK', 134: 'PIT', 135: 'SD',  136: 'SEA',
  137: 'SF',  138: 'STL', 139: 'TB',  140: 'TEX', 141: 'TOR', 142: 'MIN',
  143: 'PHI', 144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL',
};

// MLB team ID → short abbreviation (for ESPN logo CDN)
const TEAM_ABBR: Record<number, string> = {
  108: 'laa', 109: 'ari', 110: 'bal', 111: 'bos', 112: 'chc', 113: 'cin',
  114: 'cle', 115: 'col', 116: 'det', 117: 'hou', 118: 'kc',  119: 'lad',
  120: 'wsh', 121: 'nym', 133: 'oak', 134: 'pit', 135: 'sd',  136: 'sea',
  137: 'sf',  138: 'stl', 139: 'tb',  140: 'tex', 141: 'tor', 142: 'min',
  143: 'phi', 144: 'atl', 145: 'cws', 146: 'mia', 147: 'nyy', 158: 'mil',
};

// Official MLB SVG logos (white/light version for dark backgrounds)
export function getTeamLogoUrl(teamId: number): string {
  return `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${teamId}.svg`;
}

// PNG fallback via ESPN CDN
export function getTeamLogoPngUrl(teamId: number): string {
  const abbr = TEAM_ABBR[teamId];
  if (!abbr) return '';
  return `https://a.espncdn.com/i/teamlogos/mlb/500-dark/${abbr}.png`;
}

// Player headshot — MLB official CDN (PNG, generic silhouette if unknown)
export function getHeadshotUrl(playerId: number): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;
}

// MLB venue ID → ESPN venue ID (ESPN CDN has reliable stadium photos)
const VENUE_ESPN_ID: Record<number, number> = {
  1: 3,      // Angel Stadium
  2: 1,      // Oriole Park at Camden Yards
  3: 2,      // Fenway Park
  4: 4,      // Rate Field
  5: 5,      // Progressive Field
  7: 7,      // Kauffman Stadium
  12: 31,    // Tropicana Field
  14: 14,    // Rogers Centre
  15: 30,    // Chase Field
  17: 16,    // Wrigley Field
  19: 27,    // Coors Field
  22: 19,    // Dodger Stadium
  31: 47,    // PNC Park
  32: 4242,  // American Family Field
  680: 41,   // T-Mobile Park
  2392: 44,  // Daikin Park
  2394: 45,  // Comerica Park
  2395: 43,  // Oracle Park
  2602: 83,  // Great American Ball Park
  2680: 85,  // Petco Park
  2681: 84,  // Citizens Bank Park
  2889: 87,  // Busch Stadium
  3289: 209, // Citi Field
  3309: 89,  // Nationals Park
  3312: 210, // Target Field
  3313: 208, // Yankee Stadium
  4169: 4223,// loanDepot park
  4705: 218, // Truist Park
  5325: 231, // Globe Life Field
};

// Stadium aerial/exterior image via ESPN CDN (confirmed working URLs)
export function getStadiumImageUrl(venueId: number): string {
  const espnId = VENUE_ESPN_ID[venueId];
  if (!espnId) return '';
  return `https://a.espncdn.com/i/venues/mlb/day/${espnId}.jpg`;
}
