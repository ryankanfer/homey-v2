/**
 * ADVSR NYC Neighborhood Taxonomy
 * Broker-level micro-micro neighborhoods with lat/lng coordinates.
 * Each micro has a strategic "vibe" tag used in profile synthesis.
 */

export interface MicroNeighborhood {
  name: string;
  lat: number;
  lng: number;
  vibe: string; // one-line strategic identity
}

export interface SubMarket {
  name: string;
  micros: MicroNeighborhood[];
}

export interface Borough {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  subMarkets: SubMarket[];
}

export const NYC_BOROUGHS: Borough[] = [
  {
    name: 'Manhattan',
    lat: 40.7580,
    lng: -73.9855,
    zoom: 12,
    subMarkets: [
      {
        name: 'Chelsea',
        micros: [
          { name: 'West Chelsea', lat: 40.7465, lng: -74.0062, vibe: 'High Line adjacency, gallery cluster' },
          { name: 'Gallery District', lat: 40.7490, lng: -74.0045, vibe: '10th–11th Ave, art-driven pricing premium' },
          { name: 'Flower District', lat: 40.7465, lng: -73.9920, vibe: '6th Ave low 20s, mixed-use grit' },
          { name: 'Hudson Yards Fringe', lat: 40.7530, lng: -74.0010, vibe: '30s west side, new dev spillover' },
        ],
      },
      {
        name: 'West Village / Greenwich',
        micros: [
          { name: 'Gold Coast', lat: 40.7335, lng: -73.9990, vibe: 'Lower 5th / 10th / Charles, trophy townhouses' },
          { name: 'Far West Village', lat: 40.7350, lng: -74.0080, vibe: 'West of 7th Ave, quieter, cobblestone premium' },
          { name: 'Meatpacking Edge', lat: 40.7395, lng: -74.0073, vibe: 'Nightlife bleed, younger buyer pool' },
          { name: 'Bleecker Corridor', lat: 40.7320, lng: -74.0030, vibe: 'Retail + foot traffic micro-zone' },
          { name: 'Greenwich Village Core', lat: 40.7335, lng: -73.9965, vibe: 'NYU adjacency, classic village charm' },
        ],
      },
      {
        name: 'SoHo / Nolita / NoHo',
        micros: [
          { name: 'Cast Iron Core', lat: 40.7230, lng: -74.0000, vibe: 'Greene, Mercer, Wooster — historic SoHo lofts' },
          { name: 'West SoHo', lat: 40.7250, lng: -74.0060, vibe: 'Hudson-facing, quieter, loft-heavy' },
          { name: 'Nolita Core', lat: 40.7230, lng: -73.9950, vibe: 'Elizabeth / Mott boutique lifestyle zone' },
          { name: 'NoHo Prime', lat: 40.7270, lng: -73.9925, vibe: 'Bond Street, ultra luxury micro-pocket' },
        ],
      },
      {
        name: 'Tribeca',
        micros: [
          { name: 'Tribeca North', lat: 40.7200, lng: -74.0080, vibe: 'Canal to Chambers, loft conversions' },
          { name: 'Tribeca West', lat: 40.7165, lng: -74.0120, vibe: 'River-facing, family-size luxury' },
          { name: 'Tribeca Historic Core', lat: 40.7175, lng: -74.0070, vibe: 'Cobblestone streets, celebrity pricing' },
        ],
      },
      {
        name: 'Lower East Side / East Village',
        micros: [
          { name: 'LES Core', lat: 40.7150, lng: -73.9850, vibe: 'Orchard/Ludlow, nightlife-adjacent pricing' },
          { name: 'Two Bridges', lat: 40.7105, lng: -73.9930, vibe: 'Waterfront new dev, value play' },
          { name: 'East Village North', lat: 40.7290, lng: -73.9865, vibe: 'Alphabet City fringe, creative identity' },
          { name: 'East Village South', lat: 40.7240, lng: -73.9855, vibe: 'St. Marks adjacency, younger demo' },
          { name: 'Alphabet City', lat: 40.7240, lng: -73.9790, vibe: 'Tompkins Sq adjacency, garden-block premium' },
        ],
      },
      {
        name: 'Midtown',
        micros: [
          { name: 'Gramercy Park', lat: 40.7380, lng: -73.9860, vibe: 'Key-access park, co-op prestige' },
          { name: 'Flatiron', lat: 40.7400, lng: -73.9900, vibe: 'Madison Square adjacency, lifestyle hub' },
          { name: "Hell's Kitchen", lat: 40.7640, lng: -73.9910, vibe: 'Theater District edge, value pocket' },
          { name: 'Murray Hill', lat: 40.7480, lng: -73.9780, vibe: 'Young professional enclave' },
          { name: 'Sutton Place', lat: 40.7580, lng: -73.9620, vibe: 'Quiet East River enclave, co-op dominant' },
          { name: 'Kips Bay', lat: 40.7430, lng: -73.9780, vibe: 'Hospital zone, starter apartment territory' },
          { name: 'Turtle Bay', lat: 40.7540, lng: -73.9680, vibe: 'UN adjacency, diplomatic community' },
        ],
      },
      {
        name: 'Upper East Side',
        micros: [
          { name: 'Park Ave Corridor', lat: 40.7700, lng: -73.9650, vibe: 'Co-op prestige, legacy wealth' },
          { name: 'Madison Ave Spine', lat: 40.7720, lng: -73.9665, vibe: 'Retail + prewar luxury' },
          { name: 'Carnegie Hill Core', lat: 40.7825, lng: -73.9570, vibe: 'Museum adjacency premium' },
          { name: 'Yorkville East', lat: 40.7760, lng: -73.9500, vibe: 'More value, newer dev' },
          { name: 'East End Ave Enclave', lat: 40.7740, lng: -73.9480, vibe: 'Quiet, almost hidden, river views' },
          { name: 'Lenox Hill', lat: 40.7650, lng: -73.9610, vibe: 'Hospital zone, practical luxury' },
        ],
      },
      {
        name: 'Upper West Side',
        micros: [
          { name: 'Central Park West Line', lat: 40.7810, lng: -73.9710, vibe: 'Park premium, classic co-op inventory' },
          { name: 'Riverside Drive Strip', lat: 40.7850, lng: -73.9780, vibe: 'River views, quieter, prewar' },
          { name: 'Lincoln Square Core', lat: 40.7730, lng: -73.9840, vibe: 'Newer dev + culture hub, Columbus Circle' },
          { name: 'Manhattan Valley', lat: 40.7960, lng: -73.9660, vibe: 'North of 96th, value pocket' },
        ],
      },
      {
        name: 'Financial District / Downtown',
        micros: [
          { name: 'Wall Street Core', lat: 40.7065, lng: -74.0090, vibe: 'Office conversions, rental-heavy' },
          { name: 'Seaport / Fulton', lat: 40.7070, lng: -74.0030, vibe: 'Lifestyle branding, cobblestone aesthetic' },
          { name: 'Stone Street Pocket', lat: 40.7040, lng: -74.0110, vibe: 'Nightlife micro zone, historic' },
          { name: 'Battery Park City', lat: 40.7100, lng: -74.0170, vibe: 'Waterfront planned community, family-friendly' },
        ],
      },
      {
        name: 'Harlem',
        micros: [
          { name: 'Central Harlem', lat: 40.8090, lng: -73.9500, vibe: 'Brownstone revival, cultural heritage' },
          { name: 'West Harlem', lat: 40.8130, lng: -73.9560, vibe: 'Hamilton Heights, Columbia spillover' },
          { name: 'East Harlem', lat: 40.7940, lng: -73.9420, vibe: 'El Barrio, emerging development zone' },
          { name: 'Sugar Hill', lat: 40.8260, lng: -73.9450, vibe: 'Historic district, brownstone premium' },
          { name: 'Morningside Heights', lat: 40.8070, lng: -73.9620, vibe: 'Columbia campus, academic community' },
        ],
      },
      {
        name: 'Washington Heights / Inwood',
        micros: [
          { name: 'Hudson Heights', lat: 40.8540, lng: -73.9350, vibe: 'Fort Tryon adjacency, park lovers' },
          { name: 'Washington Heights Core', lat: 40.8410, lng: -73.9400, vibe: 'Value play, prewar stock' },
          { name: 'Inwood', lat: 40.8680, lng: -73.9220, vibe: 'Inwood Hill Park, northernmost Manhattan' },
        ],
      },
    ],
  },
  {
    name: 'Brooklyn',
    lat: 40.6782,
    lng: -73.9442,
    zoom: 12,
    subMarkets: [
      {
        name: 'Williamsburg',
        micros: [
          { name: 'North Williamsburg Waterfront', lat: 40.7180, lng: -73.9630, vibe: 'Condo luxury, Manhattan spillover' },
          { name: 'Domino Park Zone', lat: 40.7145, lng: -73.9680, vibe: 'Lifestyle premium, waterfront new dev' },
          { name: 'South Williamsburg', lat: 40.7080, lng: -73.9560, vibe: 'More residential, cultural identity' },
          { name: 'East Williamsburg', lat: 40.7110, lng: -73.9380, vibe: 'Industrial loft / creator crowd' },
        ],
      },
      {
        name: 'Greenpoint',
        micros: [
          { name: 'Greenpoint Waterfront', lat: 40.7290, lng: -73.9590, vibe: 'New dev towers, ferry access' },
          { name: 'Greenpoint Proper', lat: 40.7270, lng: -73.9500, vibe: 'Polish heritage, residential village feel' },
          { name: 'India Street Pocket', lat: 40.7220, lng: -73.9570, vibe: 'Williamsburg border, creative spillover' },
        ],
      },
      {
        name: 'Park Slope',
        micros: [
          { name: 'North Slope', lat: 40.6810, lng: -73.9780, vibe: 'Highest demand, brownstone core' },
          { name: 'Center Slope', lat: 40.6735, lng: -73.9780, vibe: 'Family prime zone, school district premium' },
          { name: 'South Slope', lat: 40.6620, lng: -73.9870, vibe: 'Value relative to north, emerging' },
          { name: 'Prospect Park West Line', lat: 40.6680, lng: -73.9720, vibe: 'Park premium, trophy blocks' },
          { name: 'Gowanus Edge', lat: 40.6740, lng: -73.9880, vibe: 'Rezoning + new dev pricing' },
        ],
      },
      {
        name: 'Carroll Gardens / Cobble Hill / Boerum Hill',
        micros: [
          { name: 'Carroll Gardens Core', lat: 40.6800, lng: -73.9985, vibe: 'Deep garden blocks, family brownstone' },
          { name: 'Cobble Hill', lat: 40.6870, lng: -73.9960, vibe: 'Compact, premium, restaurant row' },
          { name: 'Boerum Hill', lat: 40.6860, lng: -73.9850, vibe: 'Atlantic Ave arts corridor, brownstone mix' },
          { name: 'Columbia Waterfront', lat: 40.6850, lng: -74.0020, vibe: 'BQE edge, quieter, value pocket' },
        ],
      },
      {
        name: 'Brooklyn Heights / DUMBO',
        micros: [
          { name: 'Brooklyn Heights Promenade Line', lat: 40.6960, lng: -73.9965, vibe: 'Elite positioning, Manhattan views' },
          { name: 'DUMBO Core', lat: 40.7035, lng: -73.9890, vibe: 'Washington St, postcard effect pricing' },
          { name: 'Vinegar Hill', lat: 40.7030, lng: -73.9830, vibe: 'Hidden, low inventory premium' },
          { name: 'Fulton Ferry', lat: 40.7020, lng: -73.9930, vibe: 'Waterfront adjacency, Jane\'s Carousel' },
        ],
      },
      {
        name: 'Fort Greene / Clinton Hill',
        micros: [
          { name: 'Fort Greene Core', lat: 40.6890, lng: -73.9740, vibe: 'BAM adjacency, cultural premium' },
          { name: 'Clinton Hill Proper', lat: 40.6890, lng: -73.9630, vibe: 'Pratt area, brownstone elegance' },
          { name: 'Fort Greene Park Edge', lat: 40.6910, lng: -73.9770, vibe: 'Park-facing blocks, family demand' },
        ],
      },
      {
        name: 'Prospect Heights / Crown Heights',
        micros: [
          { name: 'Prospect Heights Core', lat: 40.6780, lng: -73.9680, vibe: 'Museum + Botanic Garden premium' },
          { name: 'Vanderbilt Ave Corridor', lat: 40.6810, lng: -73.9680, vibe: 'Restaurant row, lifestyle zone' },
          { name: 'Crown Heights West', lat: 40.6720, lng: -73.9580, vibe: 'Franklin Ave strip, emerging luxury' },
          { name: 'Crown Heights East', lat: 40.6690, lng: -73.9400, vibe: 'Value play, rapid appreciation' },
        ],
      },
      {
        name: 'Bed-Stuy',
        micros: [
          { name: 'Bed-Stuy North', lat: 40.6900, lng: -73.9480, vibe: 'Brownstone revival, investor interest' },
          { name: 'Bed-Stuy South', lat: 40.6820, lng: -73.9440, vibe: 'Deeper value, family-size brownstones' },
          { name: 'Stuyvesant Heights', lat: 40.6850, lng: -73.9380, vibe: 'Historic district, landmark pricing' },
        ],
      },
      {
        name: 'Bushwick',
        micros: [
          { name: 'East Bushwick', lat: 40.6940, lng: -73.9160, vibe: 'Emerging creative corridor' },
          { name: 'West Bushwick', lat: 40.6960, lng: -73.9270, vibe: 'Morgan Ave L train, gallery adjacency' },
        ],
      },
      {
        name: 'Bay Ridge / South Brooklyn',
        micros: [
          { name: 'Bay Ridge Proper', lat: 40.6340, lng: -74.0280, vibe: 'Waterfront, family-oriented, quiet' },
          { name: 'Sunset Park', lat: 40.6460, lng: -74.0080, vibe: 'Industry City adjacency, emerging' },
          { name: 'Bensonhurst', lat: 40.6010, lng: -73.9960, vibe: 'Suburban feel, value play' },
        ],
      },
      {
        name: 'Flatbush / Ditmas Park',
        micros: [
          { name: 'Ditmas Park', lat: 40.6360, lng: -73.9620, vibe: 'Victorian detached houses, village feel' },
          { name: 'Prospect Lefferts Gardens', lat: 40.6590, lng: -73.9530, vibe: 'Prospect Park East, brownstone value' },
          { name: 'Flatbush Core', lat: 40.6460, lng: -73.9610, vibe: 'Caribbean cultural core, emerging dev' },
        ],
      },
    ],
  },
  {
    name: 'Queens',
    lat: 40.7282,
    lng: -73.7949,
    zoom: 11,
    subMarkets: [
      {
        name: 'Long Island City',
        micros: [
          { name: 'LIC Waterfront', lat: 40.7430, lng: -73.9580, vibe: 'Manhattan-view towers, ferry access' },
          { name: 'Court Square Core', lat: 40.7470, lng: -73.9450, vibe: 'Transit hub, MoMA PS1 adjacency' },
          { name: 'Hunters Point South', lat: 40.7410, lng: -73.9570, vibe: 'Gantry Park, family new dev' },
        ],
      },
      {
        name: 'Astoria',
        micros: [
          { name: 'Astoria Heights', lat: 40.7720, lng: -73.9150, vibe: 'Residential core, Greek heritage streets' },
          { name: 'Ditmars Boulevard', lat: 40.7780, lng: -73.9120, vibe: 'Restaurant row, village character' },
          { name: 'Old Astoria', lat: 40.7680, lng: -73.9260, vibe: 'Waterfront park access, quieter' },
        ],
      },
      {
        name: 'Sunnyside / Woodside',
        micros: [
          { name: 'Sunnyside Gardens', lat: 40.7430, lng: -73.9190, vibe: 'Historic planned community, garden premium' },
          { name: 'Woodside Core', lat: 40.7455, lng: -73.9050, vibe: 'Transit hub value, diverse community' },
        ],
      },
      {
        name: 'Forest Hills / Rego Park',
        micros: [
          { name: 'Forest Hills Gardens', lat: 40.7200, lng: -73.8450, vibe: 'Tudor enclave, gated community feel' },
          { name: 'Forest Hills Proper', lat: 40.7180, lng: -73.8440, vibe: 'Austin Street village, suburban urban' },
          { name: 'Rego Park', lat: 40.7260, lng: -73.8560, vibe: 'Co-op valley, excellent transit' },
        ],
      },
      {
        name: 'Jackson Heights',
        micros: [
          { name: 'Jackson Heights Historic', lat: 40.7490, lng: -73.8830, vibe: 'Garden apartments, co-op dominant' },
          { name: 'Roosevelt Ave Corridor', lat: 40.7470, lng: -73.8810, vibe: 'Cultural diversity hub, commercial spine' },
        ],
      },
    ],
  },
];

// Flatten for quick lookups
export function getAllMicros(): MicroNeighborhood[] {
  return NYC_BOROUGHS.flatMap(b =>
    b.subMarkets.flatMap(sm => sm.micros)
  );
}

export function findMicroByName(name: string): MicroNeighborhood | undefined {
  return getAllMicros().find(m => m.name === name);
}
