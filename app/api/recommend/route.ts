import { NextResponse } from "next/server";
import { gridDisk, latLngToCell } from "h3-js";
import { HINDSIGHT_MISSION } from "@/lib/hindsight";
import {
	ensureHindsightBank,
	getBankId,
	getGroqClient,
	getHindsightMemoryStats,
	recallFromHindsight,
	retainInHindsight,
} from "@/lib/server/intelligence";

type Dish = {
	name: string;
	rationale: string;
	nutrients: string[];
};

type Restaurant = {
	name: string;
	area: string;
	etaMins: number;
	matchScore: number;
	h3Cell: string;
	specialties: string[];
};

type Recommendation = {
	title: string;
	summary: string;
	dishes: Dish[];
	restaurants: Restaurant[];
	reasons: string[];
	swaps: string[];
	location: {
		label: string;
		latitude: number;
		longitude: number;
		h3Cell: string;
		nearbyCellCount: number;
	};
	mission: string;
};

type RequestBody = {
	craving?: string;
	diet?: string;
	allergies?: string;
	pantry?: string;
	latitude?: number | string;
	longitude?: number | string;
	locationLabel?: string;
	userId?: string;
	chosenSwaps?: string[];
};

const DEFAULT_LATITUDE = 12.9716;
const DEFAULT_LONGITUDE = 77.5946;
const DEFAULT_LOCATION_LABEL = "Central Bengaluru";
const H3_RESOLUTION = 8;

function normalize(value: string | undefined, fallback: string) {
	const trimmed = value?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function parseCoordinate(value: number | string | undefined, fallback: number) {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const parsed = Number.parseFloat(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return fallback;
}

function buildDishPlan(craving: string): Dish[] {
	const lowerCraving = craving.toLowerCase();

	if (lowerCraving.includes("butter chicken")) {
		return [
			{
				name: "Butter chicken with portion-aware gravy",
				rationale: "Keeps your craving front and center while reducing excess saturated fat load.",
				nutrients: ["Protein", "Iron", "B12"],
			},
			{
				name: "Chickpea-kachumber side salad",
				rationale: "Adds the fiber that butter chicken lacks and improves fullness.",
				nutrients: ["Fiber", "Folate", "Potassium"],
			},
			{
				name: "Whole-wheat roti or millet phulka",
				rationale: "Swaps refined carbs for slower-digesting grains with better micronutrient value.",
				nutrients: ["Complex carbs", "Magnesium", "Fiber"],
			},
		];
	}

	if (/salad|fresh|light|bright|crisp/.test(lowerCraving)) {
		return [
			{
				name: "Crunchy protein salad base",
				rationale: "Protects satiety by combining raw crunch with lean protein.",
				nutrients: ["Protein", "Fiber", "Vitamin C"],
			},
			{
				name: "Seeds and legumes topper",
				rationale: "Adds healthy fats and minerals that many light meals miss.",
				nutrients: ["Omega fats", "Zinc", "Magnesium"],
			},
			{
				name: "Greek yogurt and herb dressing",
				rationale: "Improves protein density without turning the meal heavy.",
				nutrients: ["Calcium", "Protein", "Probiotics"],
			},
		];
	}

	return [
		{
			name: "Spiced lean-protein main",
			rationale: "Anchors your craving with enough protein to stabilize post-meal energy.",
			nutrients: ["Protein", "Iron", "B vitamins"],
		},
		{
			name: "Fiber-forward vegetable side",
			rationale: "Closes the common fiber gap in comfort-oriented meals.",
			nutrients: ["Fiber", "Vitamin A", "Vitamin K"],
		},
		{
			name: "Fermented or yogurt-based cooling add-on",
			rationale: "Supports digestion and taste contrast while maintaining nutrient density.",
			nutrients: ["Probiotics", "Calcium", "Hydration"],
		},
	];
}

function buildRestaurants(baseCell: string, craving: string): Restaurant[] {
	const suffix = baseCell.slice(-5).toUpperCase();
	const lowerCraving = craving.toLowerCase();
	const fresh = /salad|fresh|light|bowl/.test(lowerCraving);
	const comfort = /comfort|butter|biryani|hearty|cozy/.test(lowerCraving);

	const templates = comfort
		? [
				{ name: "Copper Handi Kitchen", area: "Residency Road", specialties: ["Butter chicken", "Dal tadka", "Tandoori broccoli"] },
				{ name: "Metro Tiffin Collective", area: "Church Street", specialties: ["Millet khichdi", "Paneer tikka", "Sprout chaat"] },
				{ name: "Curry Compass", area: "Indiranagar", specialties: ["Chicken stew", "Brown rice pulao", "Beet raita"] },
			]
		: fresh
			? [
					{ name: "Bowl District", area: "Koramangala", specialties: ["Protein bowls", "Kefir smoothies", "Quinoa tabbouleh"] },
					{ name: "Lime Table", area: "HSR Layout", specialties: ["Grilled fish", "Seed salad", "Veg broth"] },
					{ name: "Leaf and Ladle", area: "Jayanagar", specialties: ["Chickpea wraps", "Tofu stir fry", "Yogurt parfait"] },
				]
			: [
					{ name: "Urban Tadka Lab", area: "MG Road", specialties: ["Balanced thali", "Grilled kebabs", "Lentil soup"] },
					{ name: "Hexa Plate", area: "Domlur", specialties: ["Macro bowls", "Millet roti", "Roasted veg"] },
					{ name: "Plate Theory", area: "Ulsoor", specialties: ["Paneer wraps", "Chicken salad", "Probiotic lassi"] },
				];

	return templates.map((restaurant, index) => ({
		name: restaurant.name,
		area: `${restaurant.area} cluster ${suffix}`,
		etaMins: 18 + index * 6,
		matchScore: 92 - index * 4,
		h3Cell: baseCell,
		specialties: restaurant.specialties,
	}));
}

function parseGroqRecommendation(raw: string) {
	try {
		const parsed = JSON.parse(raw) as {
			title?: string;
			summary?: string;
			dishes?: Dish[];
			reasons?: string[];
			swaps?: string[];
		};

		if (!parsed.title || !parsed.summary || !Array.isArray(parsed.dishes) || !Array.isArray(parsed.reasons) || !Array.isArray(parsed.swaps)) {
			return null;
		}

		return {
			title: parsed.title,
			summary: parsed.summary,
			dishes: parsed.dishes,
			reasons: parsed.reasons,
			swaps: parsed.swaps,
		};
	} catch {
		return null;
	}
}

async function enrichWithGroq(
	base: Recommendation,
	context: {
		craving: string;
		diet: string;
		allergies: string;
		pantry: string;
		recalledMemories: string[];
	},
) {
	const groq = getGroqClient();
	if (!groq) {
		return base;
	}

	try {
		const completion = await groq.chat.completions.create({
			model: "llama-3.3-70b-versatile",
			temperature: 0.35,
			messages: [
				{
					role: "system",
					content:
						"You are a nutrition intelligence engine for a food ordering app. Return strict JSON only with keys: title, summary, dishes, reasons, swaps. Dishes must be array of {name,rationale,nutrients:string[]}. Keep craving recognizable and patch nutrient gaps.",
				},
				{
					role: "user",
					content: JSON.stringify({
						craving: context.craving,
						diet: context.diet,
						allergies: context.allergies,
						pantry: context.pantry,
						location: base.location,
						recalledMemories: context.recalledMemories,
						currentSwaps: base.swaps,
					}),
				},
			],
		});

		const output = completion.choices[0]?.message?.content;
		if (!output) {
			return base;
		}

		const parsed = parseGroqRecommendation(output);
		if (!parsed) {
			return base;
		}

		return {
			...base,
			title: parsed.title,
			summary: parsed.summary,
			dishes: parsed.dishes,
			reasons: parsed.reasons,
			swaps: parsed.swaps,
		};
	} catch {
		return base;
	}
}

async function makeLocalRecommendation(body: RequestBody): Promise<Recommendation> {
	const craving = normalize(body.craving, "Savory comfort food");
	const diet = normalize(body.diet, "Balanced");
	const allergies = normalize(body.allergies, "None");
	const pantry = normalize(body.pantry, "Chicken, rice, garlic, spinach, yogurt");
	const locationLabel = normalize(body.locationLabel, DEFAULT_LOCATION_LABEL);
	const chosenSwaps = body.chosenSwaps ?? [];
	const bankId = getBankId(body.userId);

	const latitude = parseCoordinate(body.latitude, DEFAULT_LATITUDE);
	const longitude = parseCoordinate(body.longitude, DEFAULT_LONGITUDE);
	const h3Cell = latLngToCell(latitude, longitude, H3_RESOLUTION);
	const nearbyCellCount = gridDisk(h3Cell, 1).length;

	await ensureHindsightBank(bankId, HINDSIGHT_MISSION);
	const recalledMemories = await recallFromHindsight(
		bankId,
		`User asks for cart recommendation. Craving: ${craving}. Diet: ${diet}. Allergies: ${allergies}.`,
	);

	const dishes = buildDishPlan(craving);
	const restaurants = buildRestaurants(h3Cell, craving);

	const baseRecommendation: Recommendation = {
		title: `${craving} but nutritionally upgraded`,
		summary: `Built around ${craving.toLowerCase()} near ${locationLabel}. The plan keeps the craving intact and fills nutrient gaps with practical add-ons.${recalledMemories.length > 0 ? " Past preferences were reused." : ""}`,
		dishes,
		restaurants,
		reasons: [
			`Uses H3 location cell ${h3Cell} to prioritize realistic nearby picks.`,
			`Matches your ${diet.toLowerCase()} style without removing the core craving.`,
			`Balances pantry usage (${pantry.toLowerCase()}) while respecting ${allergies.toLowerCase()} preferences.`,
		],
		swaps: [
			"Add a fiber side (chickpeas, lentils, or veg) to rich mains",
			"Choose whole grains over refined breads when available",
			"Pair salty meals with a yogurt or cucumber side for hydration",
		],
		location: {
			label: locationLabel,
			latitude,
			longitude,
			h3Cell,
			nearbyCellCount,
		},
		mission: HINDSIGHT_MISSION,
	};

	const enrichedRecommendation = await enrichWithGroq(baseRecommendation, {
		craving,
		diet,
		allergies,
		pantry,
		recalledMemories,
	});

	await retainInHindsight(
		bankId,
		[
			`Diet: ${diet}`,
			`Allergies: ${allergies}`,
			`Cart items: ${craving}`,
			`H3 cell: ${h3Cell}`,
			`Chosen swaps: ${chosenSwaps.length > 0 ? chosenSwaps.join(", ") : "none"}`,
			`Recommended swaps: ${enrichedRecommendation.swaps.join(", ")}`,
		].join(" | "),
		["cart", "nutrition", "recommendation"],
	);

	const memoryStats = await getHindsightMemoryStats(bankId);
	return {
		...enrichedRecommendation,
		reasons: [
			...enrichedRecommendation.reasons,
			memoryStats.available
				? `Hindsight bank ${bankId} now has ${memoryStats.total} memories.`
				: `Hindsight memory stats unavailable for bank ${bankId}.`,
		],
	};
}

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as RequestBody | null;

	if (!body) {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	try {
		const recommendation = await makeLocalRecommendation(body);
		return NextResponse.json({ recommendation, fallback: true });
	} catch {
		return NextResponse.json({ error: "Failed to generate recommendation." }, { status: 500 });
	}
}
