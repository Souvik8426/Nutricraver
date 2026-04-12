import { NextResponse } from "next/server";
import { HINDSIGHT_MISSION } from "@/lib/hindsight";
import {
  ensureHindsightBank,
  getBankId,
  getGroqClient,
  getHindsightMemoryStats,
  recallFromHindsight,
  retainInHindsight,
} from "@/lib/server/intelligence";

type RequestBody = {
  message?: string;
  userId?: string;
  diet?: string;
  allergies?: string;
  pantry?: string;
  locationLabel?: string;
  latitude?: string;
  longitude?: string;
  cartItems?: string[];
};

function normalize(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function parseDiet(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("vegan")) return "Vegan";
  if (lower.includes("vegetarian")) return "Vegetarian";
  if (lower.includes("high protein") || lower.includes("high-protein")) return "High-protein";
  if (lower.includes("keto")) return "Keto";
  return "Balanced";
}

function parseAllergies(message: string) {
  const allergyMatch = message.match(/allergic to ([a-z\s-]+)/i);
  if (allergyMatch?.[1]) {
    return allergyMatch[1].trim();
  }
  return "None";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = normalize(body.message, "");
  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  const bankId = getBankId(body.userId);
  await ensureHindsightBank(bankId, HINDSIGHT_MISSION);

  const recalledMemories = await recallFromHindsight(
    bankId,
    `User nutrition chat context for message: ${message}`,
  );

  const inferredDiet = parseDiet(message);
  const inferredAllergies = parseAllergies(message);

  const groq = getGroqClient();
  let reply = `Saved. Diet: ${inferredDiet}. Allergies: ${inferredAllergies}. Add items to cart and tap Smart Recommend in cart.`;

  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.45,
        messages: [
          {
            role: "system",
            content:
              "You are NutriCraver AI chatbot. Give concise and practical nutrition guidance for food ordering. Keep response under 90 words.",
          },
          {
            role: "user",
            content: JSON.stringify({
              message,
              knownContext: {
                diet: body.diet,
                allergies: body.allergies,
                pantry: body.pantry,
                locationLabel: body.locationLabel,
                latitude: body.latitude,
                longitude: body.longitude,
                cartItems: body.cartItems ?? [],
              },
              recalledMemories,
            }),
          },
        ],
      });

      const modelReply = completion.choices[0]?.message?.content;
      if (modelReply) {
        reply = modelReply;
      }
    } catch {
      // Use fallback response.
    }
  }

  await retainInHindsight(
    bankId,
    [
      `Chat message: ${message}`,
      `Diet inferred: ${inferredDiet}`,
      `Allergies inferred: ${inferredAllergies}`,
      `Cart snapshot: ${(body.cartItems ?? []).join(", ") || "empty"}`,
      `Location: ${normalize(body.locationLabel, "unknown")}`,
    ].join(" | "),
    ["chat", "preference"],
  );

  const memoryStats = await getHindsightMemoryStats(bankId);

  return NextResponse.json({
    reply,
    parsed: {
      diet: inferredDiet,
      allergies: inferredAllergies,
    },
    hindsight: {
      bankId,
      memoryTotal: memoryStats.total,
      available: memoryStats.available,
    },
  });
}
