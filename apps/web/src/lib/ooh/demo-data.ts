export type OohCityKey = "Karachi" | "Baghdad";
export type OohMediaType = "BILLBOARD" | "DIGITAL_SCREEN";
export type OohAssetStatus =
  | "ACTIVE"
  | "AVAILABLE"
  | "RESERVED"
  | "MAINTENANCE"
  | "NEEDS_COORDINATES"
  | "INACTIVE";
export type OohDimensionUnit = "METER" | "PIXEL";

export type OohAreaDefinition = {
  city: OohCityKey;
  country: "Pakistan" | "Iraq";
  name: string;
  slug: string;
  centerLatitude: number;
  centerLongitude: number;
};

export type OohDemoAsset = {
  assetCode: string;
  city: OohCityKey;
  country: "Pakistan" | "Iraq";
  area: string;
  areaSlug: string;
  latitude: number;
  longitude: number;
  mediaType: OohMediaType;
  status: OohAssetStatus;
  locationName: string;
  address: string;
  landmark: string;
  width: number;
  height: number;
  dimensionUnit: OohDimensionUnit;
  numberOfFaces: number;
  totalSqm: number | null;
  facingDirection: string;
  roadType: string;
  illumination: string;
  mediaOwner: string;
  contactName: string;
  contactPhone: string;
  brandName: string;
  brandSlug: string;
  brandCategory: string;
  campaignName: string;
  campaignSlogan: string;
  campaignStatus: "active";
  installedAt: string;
  campaignStartDate: string;
  campaignEndDate: string;
  placementStatus: "CURRENT";
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
  currency: "PKR" | "IQD";
  expectedDailyAudience: number;
  dailyVehicleVolume: number;
  dailyPedestrianVolume: number;
  estimatedDailyImpressions: number;
  estimatedMonthlyReach: number;
  averageFrequency: number;
  dwellTimeSeconds: number;
  visibilityScore: number;
  nearbyPoiCount: number;
  audienceConfidence: string;
  resolutionWidth: number | null;
  resolutionHeight: number | null;
  brightnessNits: number | null;
  operatingStartTime: string | null;
  operatingEndTime: string | null;
  loopLengthSeconds: number | null;
  spotLengthSeconds: number | null;
  estimatedPlaysPerDay: number | null;
  creativeImagePath: string;
  siteImagePath: string;
  availabilityStartDate: string;
  availabilityEndDate: string;
  availabilityStatus: "BOOKED" | "AVAILABLE";
};

const KARACHI_AREAS = [
  ["Clifton", 24.8133, 67.0304],
  ["DHA", 24.8047, 67.0672],
  ["Saddar", 24.8567, 67.0106],
  ["Shahrah-e-Faisal", 24.8719, 67.0934],
  ["Gulshan-e-Iqbal", 24.9261, 67.0822],
  ["North Nazimabad", 24.9367, 67.0324],
  ["Korangi", 24.8324, 67.1456],
  ["PECHS", 24.8768, 67.0585],
  ["Tariq Road", 24.8734, 67.0598],
  ["I. I. Chundrigar Road", 24.8486, 67.0042],
] as const;

const BAGHDAD_AREAS = [
  ["Mansour", 33.3152, 44.3463],
  ["Karkh", 33.3097, 44.3398],
  ["Yarmouk", 33.3107, 44.3141],
  ["Kadhimiya", 33.3784, 44.3434],
  ["Adhamiya", 33.3772, 44.3755],
  ["Karrada", 33.3051, 44.4457],
  ["Zayouna", 33.3236, 44.4592],
  ["Sadr City", 33.3725, 44.4922],
  ["Jadriya", 33.2776, 44.3848],
  ["Palestine Street", 33.3493, 44.4488],
] as const;

const BRAND_CATEGORIES = [
  "Beverage",
  "FMCG",
  "Telecom",
  "Banking",
  "Fintech",
  "Automotive",
  "Food Delivery",
  "Restaurant",
  "Electronics",
  "Fashion",
  "E-commerce",
  "Real Estate",
  "Airline",
  "Entertainment",
  "Healthcare",
  "Education",
] as const;

const BRAND_PREFIXES = [
  "PakPulse",
  "Karachi Brew",
  "IndusDrive",
  "UrbanCart",
  "BlueWave",
  "MetroBite",
  "Nova",
  "SilkRoute",
  "Mesopotamia",
  "Tigris",
  "Babylon",
  "Noor",
  "Baghdad Fresh",
  "Euphrates",
  "Cedar",
  "Falcon",
  "Orbit",
  "Golden Palm",
  "Skyline",
  "Riverfront",
] as const;

const BRAND_SUFFIXES = [
  "Mobile",
  "Co.",
  "Motors",
  "Pay",
  "Foods",
  "Bank",
  "Screens",
  "Labs",
  "Homes",
  "Air",
  "Care",
  "Academy",
  "Bites",
  "Energy",
  "Media",
  "Retail",
] as const;

const SLOGAN_PREFIXES = [
  "Own the moment",
  "Future in motion",
  "Built for the city",
  "Refresh every route",
  "Move smarter daily",
  "Taste the upgrade",
  "Connected by design",
  "Charge the commute",
] as const;

const FACING_DIRECTIONS = ["North", "North-East", "East", "South-East", "South", "West"] as const;
const ROAD_TYPES = ["Boulevard", "Highway", "Arterial", "Commercial Street", "Intersection"] as const;
const MEDIA_OWNERS = ["Urban Vision Media", "Metro Reach", "Prime Horizon", "Cityline Outdoor"] as const;
const CONTACTS = [
  ["Adeel Khan", "+92-300-111-2001"],
  ["Rania Nabil", "+964-770-111-2002"],
  ["Sami Tariq", "+92-321-111-2003"],
  ["Noor Abbas", "+964-780-111-2004"],
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function seededInt(seed: number, min: number, max: number) {
  const x = Math.sin(seed * 999) * 10000;
  const normalized = x - Math.floor(x);
  return Math.floor(normalized * (max - min + 1)) + min;
}

function seededFloat(seed: number, min: number, max: number, decimals = 4) {
  const x = Math.cos(seed * 777) * 10000;
  const normalized = x - Math.floor(x);
  return Number((min + normalized * (max - min)).toFixed(decimals));
}

function getAreaDefinitions(): OohAreaDefinition[] {
  return [
    ...KARACHI_AREAS.map(([name, lat, lng]) => ({
      city: "Karachi" as const,
      country: "Pakistan" as const,
      name,
      slug: slugify(name),
      centerLatitude: lat,
      centerLongitude: lng,
    })),
    ...BAGHDAD_AREAS.map(([name, lat, lng]) => ({
      city: "Baghdad" as const,
      country: "Iraq" as const,
      name,
      slug: slugify(name),
      centerLatitude: lat,
      centerLongitude: lng,
    })),
  ];
}

function getBrandDefinition(index: number) {
  const prefix = BRAND_PREFIXES[index % BRAND_PREFIXES.length];
  const suffix = BRAND_SUFFIXES[Math.floor(index / BRAND_PREFIXES.length) % BRAND_SUFFIXES.length];
  const category = BRAND_CATEGORIES[index % BRAND_CATEGORIES.length];
  const name = `${prefix} ${suffix}`.replace(/\s+/g, " ").trim();
  return {
    name,
    slug: slugify(name),
    category,
    slogan: `${SLOGAN_PREFIXES[index % SLOGAN_PREFIXES.length]} ${index + 1}`.trim(),
  };
}

export function getOohDemoAreas() {
  return getAreaDefinitions();
}

export function buildOohDemoAssets() {
  const assets: OohDemoAsset[] = [];
  const areas = getAreaDefinitions();
  const cityBillboardCounter = { Karachi: 1, Baghdad: 1 };
  const cityDigitalCounter = { Karachi: 1, Baghdad: 1 };

  areas.forEach((area, areaIndex) => {
    for (let slot = 0; slot < 10; slot += 1) {
      const isBillboard = slot < 7;
      const citySeed = areaIndex * 100 + slot + 1;
      const mediaType: OohMediaType = isBillboard ? "BILLBOARD" : "DIGITAL_SCREEN";
      const cityKey = area.city;
      const serial = isBillboard ? cityBillboardCounter[cityKey]++ : cityDigitalCounter[cityKey]++;
      const codePrefix = cityKey === "Karachi" ? "KHI" : "BGD";
      const assetCode = `${codePrefix}-${isBillboard ? "BB" : "DS"}-${String(serial).padStart(4, "0")}`;
      const latOffset = ((slot % 5) - 2) * 0.0032 + seededFloat(citySeed, -0.0008, 0.0008, 6);
      const lngOffset = (Math.floor(slot / 5) - 1) * 0.0036 + seededFloat(citySeed + 1, -0.0008, 0.0008, 6);
      const latitude = Number((area.centerLatitude + latOffset).toFixed(6));
      const longitude = Number((area.centerLongitude + lngOffset).toFixed(6));
      const width = isBillboard ? seededInt(citySeed, 12, 18) : seededInt(citySeed, 1080, 3840);
      const height = isBillboard ? seededInt(citySeed + 2, 4, 7) : seededInt(citySeed + 3, 720, 2160);
      const brand = getBrandDefinition(areaIndex * 10 + slot);
      const audienceBase =
        cityKey === "Karachi"
          ? isBillboard
            ? seededInt(citySeed, 25_000, 180_000)
            : seededInt(citySeed, 45_000, 250_000)
          : isBillboard
            ? seededInt(citySeed, 20_000, 160_000)
            : seededInt(citySeed, 40_000, 230_000);
      const vehicleBase =
        cityKey === "Karachi"
          ? isBillboard
            ? seededInt(citySeed + 4, 15_000, 140_000)
            : seededInt(citySeed + 4, 20_000, 180_000)
          : isBillboard
            ? seededInt(citySeed + 4, 12_000, 130_000)
            : seededInt(citySeed + 4, 18_000, 170_000);
      const pedestrianBase =
        cityKey === "Karachi"
          ? isBillboard
            ? seededInt(citySeed + 5, 3_000, 45_000)
            : seededInt(citySeed + 5, 5_000, 70_000)
          : isBillboard
            ? seededInt(citySeed + 5, 2_000, 40_000)
            : seededInt(citySeed + 5, 4_000, 65_000);
      const visibilityScore = cityKey === "Karachi"
        ? isBillboard ? seededInt(citySeed + 6, 55, 96) : seededInt(citySeed + 6, 65, 99)
        : isBillboard ? seededInt(citySeed + 6, 55, 96) : seededInt(citySeed + 6, 65, 99);
      const dailyCost =
        cityKey === "Karachi"
          ? isBillboard
            ? seededInt(citySeed + 7, 45_000, 180_000)
            : seededInt(citySeed + 7, 90_000, 350_000)
          : isBillboard
            ? seededInt(citySeed + 7, 250_000, 900_000)
            : seededInt(citySeed + 7, 500_000, 1_500_000);
      const estimatedDailyImpressions = Math.round(audienceBase * (1 + visibilityScore / 180) * (isBillboard ? 1 : 1.18));
      const estimatedMonthlyReach = Math.round(Math.min(audienceBase * 24, audienceBase * 14.4));
      const averageFrequency = Number((seededInt(citySeed + 8, 3, 9) / 2).toFixed(1));
      const dwellTimeSeconds = isBillboard ? seededInt(citySeed + 9, 3, 12) : seededInt(citySeed + 9, 5, 24);
      const nearbyPoiCount = seededInt(citySeed + 10, 3, 24);
      const installedAt = `2026-${String(seededInt(citySeed + 11, 4, 6)).padStart(2, "0")}-${String(seededInt(citySeed + 12, 1, 28)).padStart(2, "0")}`;
      const campaignStartDate = installedAt;
      const campaignEndDate = `2026-${String(seededInt(citySeed + 13, 8, 12)).padStart(2, "0")}-${String(seededInt(citySeed + 14, 1, 28)).padStart(2, "0")}`;

      assets.push({
        assetCode,
        city: cityKey,
        country: area.country,
        area: area.name,
        areaSlug: area.slug,
        latitude,
        longitude,
        mediaType,
        status: "ACTIVE",
        locationName: `${area.name} ${isBillboard ? "Main Boulevard" : "Digital Corridor"} ${slot + 1}`,
        address: `${area.name} Avenue ${slot + 1}, ${cityKey}`,
        landmark: `${area.name} Junction ${seededInt(citySeed + 15, 1, 9)}`,
        width,
        height,
        dimensionUnit: isBillboard ? "METER" : "PIXEL",
        numberOfFaces: seededInt(citySeed + 16, 1, isBillboard ? 2 : 1),
        totalSqm: isBillboard ? Number((width * height).toFixed(2)) : null,
        facingDirection: FACING_DIRECTIONS[citySeed % FACING_DIRECTIONS.length],
        roadType: ROAD_TYPES[citySeed % ROAD_TYPES.length],
        illumination: isBillboard ? (citySeed % 2 === 0 ? "Front lit" : "Back lit") : "LED",
        mediaOwner: MEDIA_OWNERS[citySeed % MEDIA_OWNERS.length],
        contactName: CONTACTS[citySeed % CONTACTS.length][0],
        contactPhone: CONTACTS[citySeed % CONTACTS.length][1],
        brandName: brand.name,
        brandSlug: brand.slug,
        brandCategory: brand.category,
        campaignName: `${brand.name} ${cityKey} Pulse`,
        campaignSlogan: brand.slogan,
        campaignStatus: "active",
        installedAt,
        campaignStartDate,
        campaignEndDate,
        placementStatus: "CURRENT",
        dailyCost,
        weeklyCost: dailyCost * 7,
        monthlyCost: dailyCost * 30,
        currency: cityKey === "Karachi" ? "PKR" : "IQD",
        expectedDailyAudience: audienceBase,
        dailyVehicleVolume: vehicleBase,
        dailyPedestrianVolume: pedestrianBase,
        estimatedDailyImpressions,
        estimatedMonthlyReach,
        averageFrequency,
        dwellTimeSeconds,
        visibilityScore,
        nearbyPoiCount,
        audienceConfidence: "Demo estimate",
        resolutionWidth: isBillboard ? null : width,
        resolutionHeight: isBillboard ? null : height,
        brightnessNits: isBillboard ? null : seededInt(citySeed + 17, 4500, 6500),
        operatingStartTime: isBillboard ? null : "06:00",
        operatingEndTime: isBillboard ? null : "23:59",
        loopLengthSeconds: isBillboard ? null : 60,
        spotLengthSeconds: isBillboard ? null : 10,
        estimatedPlaysPerDay: isBillboard ? null : seededInt(citySeed + 18, 850, 1800),
        creativeImagePath: `/demo/ooh/creatives/${assetCode}.svg`,
        siteImagePath: `/demo/ooh/sites/${assetCode}.svg`,
        availabilityStartDate: "2026-07-20",
        availabilityEndDate: "2026-08-31",
        availabilityStatus: "BOOKED",
      });
    }
  });

  return assets;
}
