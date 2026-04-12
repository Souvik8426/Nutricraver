import Groq from "groq-sdk";
import { HindsightClient } from "@vectorize-io/hindsight-client";

const DEFAULT_HINDSIGHT_URL = "https://api.hindsight.vectorize.io";

export function sanitizeBankId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 60);
}

export function getBankId(userId?: string) {
  const configured = process.env.HINDSIGHT_BANK_ID;
  if (configured && configured.trim().length > 0) {
    return sanitizeBankId(configured);
  }
  if (userId && userId.trim().length > 0) {
    return sanitizeBankId(`nutricraver-${userId}`);
  }
  return "nutricraver-main";
}

export function getGroqClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return null;
  }
  return new Groq({ apiKey: key });
}

export function getHindsightClient() {
  const apiKey = process.env.HINDSIGHT_API_KEY;
  if (!apiKey) {
    return null;
  }

  const baseUrl = process.env.HINDSIGHT_API_URL || DEFAULT_HINDSIGHT_URL;
  return new HindsightClient({ baseUrl, apiKey });
}

export async function ensureHindsightBank(bankId: string, reflectMission: string) {
  const client = getHindsightClient();
  if (!client) {
    return null;
  }

  try {
    await client.createBank(bankId, {
      reflectMission,
      retainMission:
        "Store user food ordering patterns, constraints, allergies, preferred swaps, and location context for future recommendations.",
      enableObservations: true,
    });
    return client;
  } catch {
    return client;
  }
}

export async function recallFromHindsight(bankId: string, query: string) {
  const client = getHindsightClient();
  if (!client) {
    return [] as string[];
  }

  try {
    const result = await client.recall(bankId, query, { budget: "low" });
    return result.results.map((entry) => entry.text).filter(Boolean).slice(0, 6);
  } catch {
    return [] as string[];
  }
}

export async function retainInHindsight(bankId: string, content: string, tags: string[] = []) {
  const client = getHindsightClient();
  if (!client) {
    return;
  }

  try {
    await client.retain(bankId, content, {
      tags,
      context: "NutriCraver cart recommendation session",
      metadata: { source: "recommendation-api" },
    });
  } catch {
    // Non-blocking memory write.
  }
}

export async function getHindsightMemoryStats(bankId: string) {
  const client = getHindsightClient();
  if (!client) {
    return { total: 0, available: false };
  }

  try {
    const listed = await client.listMemories(bankId, { limit: 1, offset: 0 });
    return { total: listed.total ?? 0, available: true };
  } catch {
    return { total: 0, available: false };
  }
}
