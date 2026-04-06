// Module-level token cache
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getRealPlusToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  const res = await fetch('https://bhs.realplusonline.com/resourceapi/security/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      username: process.env.REALPLUS_USERNAME!,
      password: process.env.REALPLUS_PASSWORD!,
    }),
  });
  if (!res.ok) throw new Error(`RealPlus auth failed: ${res.status}`);
  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return tokenCache.token;
}

// Extract address from a listing URL
// e.g. https://streeteasy.com/building/129-lafayette-st-new_york/pha → "129 Lafayette St"
export function extractAddressFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    const addressSegment = segments.find(s => /\d/.test(s) && s.length > 4);
    if (!addressSegment) return null;
    return addressSegment
      .replace(/-new_york$|-manhattan$|-brooklyn$|-queens$|-bronx$|-staten_island$/i, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return null;
  }
}

const BUILDING_QUERY = `query GetBuilding($propertyId: Int!) {
  property(id: $propertyId) {
    id
    buildingName
    coopName
    yearBuilt
    totalFloors
    totalUnits
    elevators
    doorman { id name }
    ownershipType { id name }
    address {
      fullAddress
      neighborhood { name }
      borough { name }
    }
    flipTax { paidBy remarks fliptax }
    financials {
      financingAllowedPercent
      taxDeductPercent
      maximumFinancingRemarks
      taxAbatement
      specialAssessment { yesNo { name } amount expirationDate }
      buildingAssessment { yesNo { name } amount expirationDate }
      mortgage { type { name } amount term expires rate }
    }
    boardRequirements
    petsAllowed { name }
    buildingAmenities { name }
    buildingFeatures { name }
    parking { name }
    laundry { name }
    newDevelopment { newConstruction status { name } occupancyDate }
  }
}`;

export async function fetchBuildingIntelligence(listingUrl: string): Promise<string | null> {
  try {
    const address = extractAddressFromUrl(listingUrl);
    if (!address) return null;

    const token = await getRealPlusToken();

    // Step 1: address → buildingID
    const searchRes = await fetch(
      `https://bhs.realplusonline.com/resourceapi/search/getListingByAddressSearchOmni?addressSearchOmniText=${encodeURIComponent(address)}&x=0`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    if (!searchRes.ok) return null;
    const buildings: { location: string; buildingID: string }[] = await searchRes.json();
    if (!buildings.length) return null;

    const buildingId = parseInt(buildings[0].buildingID.trim(), 10);
    if (isNaN(buildingId)) return null;

    // Step 2: buildingID → full building data via GraphQL
    const gqlRes = await fetch('https://gateway.realplusonline.com/graphql?o=GetBuilding', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'GetBuilding',
        variables: { propertyId: buildingId },
        query: BUILDING_QUERY,
      }),
      cache: 'no-store',
    });
    if (!gqlRes.ok) return null;

    const { data } = await gqlRes.json();
    const p = data?.property;
    if (!p) return null;

    const lines: string[] = [];
    lines.push(`Address: ${p.address?.fullAddress ?? address}`);
    lines.push(`Neighborhood: ${p.address?.neighborhood?.name ?? '—'}, ${p.address?.borough?.name ?? '—'}`);
    if (p.ownershipType?.name) lines.push(`Ownership: ${p.ownershipType.name}`);
    if (p.buildingName || p.coopName) lines.push(`Building: ${p.buildingName || p.coopName}`);
    if (p.yearBuilt) lines.push(`Year built: ${p.yearBuilt}`);
    if (p.totalUnits) lines.push(`Total units: ${p.totalUnits}`);
    if (p.totalFloors) lines.push(`Floors: ${p.totalFloors}`);
    if (p.doorman?.name) lines.push(`Doorman: ${p.doorman.name}`);

    const fin = p.financials;
    if (fin) {
      if (fin.financingAllowedPercent) lines.push(`Max financing: ${fin.financingAllowedPercent}%`);
      if (fin.taxDeductPercent) lines.push(`Tax deductibility: ${fin.taxDeductPercent}%`);
      if (fin.maximumFinancingRemarks) lines.push(`Financing notes: ${fin.maximumFinancingRemarks}`);
      if (fin.taxAbatement) lines.push(`Tax abatement: ${fin.taxAbatement}`);
      const sa = fin.specialAssessment;
      if (sa?.yesNo?.name === 'Yes') lines.push(`Special assessment: $${sa.amount} (expires ${sa.expirationDate})`);
      const ba = fin.buildingAssessment;
      if (ba?.yesNo?.name === 'Yes') lines.push(`Building assessment: $${ba.amount} (expires ${ba.expirationDate})`);
      if (fin.mortgage?.amount) lines.push(`Building mortgage: $${Number(fin.mortgage.amount).toLocaleString()} @ ${fin.mortgage.rate}% (expires ${fin.mortgage.expires})`);
    }

    if (p.flipTax?.fliptax) lines.push(`Flip tax: ${p.flipTax.fliptax} (paid by ${p.flipTax.paidBy})`);
    if (p.boardRequirements) lines.push(`Board requirements: ${p.boardRequirements}`);
    if (p.petsAllowed?.length) lines.push(`Pets: ${p.petsAllowed.map((x: { name: string }) => x.name).join(', ')}`);

    const amenities = [
      ...(p.buildingAmenities ?? []),
      ...(p.buildingFeatures ?? []),
    ].map((x: { name: string }) => x.name).filter(Boolean);
    if (amenities.length) lines.push(`Amenities: ${amenities.slice(0, 8).join(', ')}`);

    if (p.newDevelopment?.newConstruction) {
      lines.push(`New development: ${p.newDevelopment.status?.name ?? 'Yes'} (occupancy: ${p.newDevelopment.occupancyDate ?? 'TBD'})`);
    }

    return lines.join('\n');
  } catch (err) {
    console.error('RealPlus lookup error:', err);
    return null;
  }
}
