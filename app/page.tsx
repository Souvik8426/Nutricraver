"use client";

import { useMemo, useState } from "react";
import Chatbot, { type ChatMessage } from "@/app/components/Chatbot";
import DishItem from "@/app/components/DishItem";
import Navbar from "@/app/components/Navbar";
import RestaurantList, { type MenuItem, type Restaurant } from "@/app/components/RestaurantList";

type Recommendation = {
  title: string;
  summary: string;
  dishes: {
    name: string;
    rationale: string;
    nutrients: string[];
  }[];
  restaurants: {
    name: string;
    area: string;
    etaMins: number;
    matchScore: number;
    h3Cell: string;
    specialties: string[];
  }[];
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

type ApiResponse = {
  recommendation: Recommendation;
  fallback: boolean;
};

type ChatApiResponse = {
  reply: string;
  parsed: {
    diet: string;
    allergies: string;
  };
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  restaurantName: string;
  quantity: number;
};

const MARKETPLACE_RESTAURANTS: Restaurant[] = [
  {
    id: "r-1",
    name: "Copper Handi Kitchen",
    area: "Indiranagar",
    etaMins: 28,
    rating: 4.5,
    cuisines: ["North Indian", "Mughlai", "Healthy Sides"],
    menu: [
      {
        id: "r-1-i-1",
        name: "Butter Chicken Bowl",
        description: "Classic butter chicken with portioned gravy and rice",
        price: 329,
      },
      {
        id: "r-1-i-2",
        name: "Tandoori Broccoli",
        description: "Charred broccoli with hung curd spice mix",
        price: 199,
      },
      {
        id: "r-1-i-3",
        name: "Chickpea Kachumber",
        description: "High-fiber chickpea salad with onions and lime",
        price: 169,
      },
    ],
  },
  {
    id: "r-2",
    name: "Bowl District",
    area: "Koramangala",
    etaMins: 24,
    rating: 4.6,
    cuisines: ["Bowls", "Salads", "Protein Meals"],
    menu: [
      {
        id: "r-2-i-1",
        name: "High Protein Chicken Bowl",
        description: "Grilled chicken, brown rice, sauteed greens and yogurt",
        price: 349,
      },
      {
        id: "r-2-i-2",
        name: "Tofu Quinoa Crunch",
        description: "Tofu, quinoa, slaw and seed mix",
        price: 319,
      },
      {
        id: "r-2-i-3",
        name: "Greek Yogurt Herb Dip",
        description: "Protein-rich dip with cucumber sticks",
        price: 149,
      },
    ],
  },
  {
    id: "r-3",
    name: "Metro Tiffin Collective",
    area: "Jayanagar",
    etaMins: 31,
    rating: 4.4,
    cuisines: ["South Indian", "Meal Boxes", "Comfort Food"],
    menu: [
      {
        id: "r-3-i-1",
        name: "Millet Khichdi Combo",
        description: "Millet-lentil khichdi with veg poriyal",
        price: 269,
      },
      {
        id: "r-3-i-2",
        name: "Paneer Tikka Wrap",
        description: "Whole wheat wrap with paneer and peppers",
        price: 239,
      },
      {
        id: "r-3-i-3",
        name: "Sprout Chaat Cup",
        description: "Sprouted legumes, cucumber and tangy dressing",
        price: 129,
      },
    ],
  },
];

function detectDiet(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("vegan")) return "Vegan";
  if (lower.includes("vegetarian")) return "Vegetarian";
  if (lower.includes("high protein") || lower.includes("high-protein")) return "High-protein";
  if (lower.includes("keto")) return "Keto";
  return "Balanced";
}

function detectAllergies(message: string) {
  const allergyMatch = message.match(/allergic to ([a-z\s-]+)/i);
  if (allergyMatch?.[1]) {
    return allergyMatch[1].trim();
  }
  return "None";
}

export default function Home() {
  const [userId] = useState("guest-user");
  const [diet, setDiet] = useState("Balanced");
  const [allergies, setAllergies] = useState("None");
  const [pantry, setPantry] = useState("Yogurt, chickpeas, greens");
  const [locationLabel, setLocationLabel] = useState("Central Bengaluru");
  const [latitude, setLatitude] = useState("12.9716");
  const [longitude, setLongitude] = useState("77.5946");
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Tell me your diet goals, allergies, and what nutrient balance you want. Add dishes to cart first, then I will optimize that cart.",
    },
  ]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [selectedSwaps, setSelectedSwaps] = useState<string[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const cartCraving = useMemo(
    () => cartItems.map((item) => `${item.name} x${item.quantity}`).join(", "),
    [cartItems],
  );

  function handleAddToCart(item: MenuItem, restaurant: Restaurant) {
    setCheckoutStatus(null);
    setResponse(null);
    setCartItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing) {
        return current.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
        );
      }

      return [
        ...current,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          restaurantName: restaurant.name,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(itemId: string, nextQuantity: number) {
    setCheckoutStatus(null);
    setResponse(null);
    setCartItems((current) => {
      if (nextQuantity <= 0) {
        return current.filter((item) => item.id !== itemId);
      }

      return current.map((item) =>
        item.id === itemId ? { ...item, quantity: nextQuantity } : item,
      );
    });
  }

  async function handleSendChat() {
    const trimmed = chatDraft.trim();
    if (!trimmed) {
      return;
    }

    setChatMessages((current) => [...current, { role: "user", text: trimmed }]);
    setChatDraft("");

    setChatLoading(true);
    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          message: trimmed,
          diet,
          allergies,
          pantry,
          locationLabel,
          latitude,
          longitude,
          cartItems: cartItems.map((item) => `${item.name} x${item.quantity}`),
        }),
      });

      if (!result.ok) {
        throw new Error(`Chat request failed with status ${result.status}`);
      }

      const data = (await result.json()) as ChatApiResponse;
      setDiet(data.parsed.diet || detectDiet(trimmed));
      setAllergies(data.parsed.allergies || detectAllergies(trimmed));

      const pantryMatch = trimmed.match(/pantry[:\-]\s*(.+)$/i);
      if (pantryMatch?.[1]) {
        setPantry(pantryMatch[1].trim());
      }

      setChatMessages((current) => [...current, { role: "assistant", text: data.reply }]);
    } catch {
      const nextDiet = detectDiet(trimmed);
      const nextAllergies = detectAllergies(trimmed);
      setDiet(nextDiet);
      setAllergies(nextAllergies);
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `Saved. Diet: ${nextDiet}. Allergies: ${nextAllergies}. Add items to cart and tap Smart Recommend in cart for suggestions.`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function toggleSwap(swap: string) {
    setSelectedSwaps((current) =>
      current.includes(swap)
        ? current.filter((entry) => entry !== swap)
        : [...current, swap],
    );
  }

  function handleCheckout() {
    if (cartItems.length === 0) {
      setError("Add items to cart before checkout.");
      return;
    }

    const checkoutId = `NC-${Math.floor(100000 + Math.random() * 900000)}`;
    setCheckoutStatus(`Order placed successfully. Tracking ID: ${checkoutId}`);
    setCartItems([]);
    setResponse(null);
    setError(null);
  }

  async function getCartRecommendation() {
    if (cartItems.length === 0) {
      setError("Add items to cart before requesting intelligent recommendations.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          craving: cartCraving,
          diet,
          allergies,
          pantry,
          locationLabel,
          latitude,
          longitude,
          chosenSwaps: selectedSwaps,
        }),
      });

      if (!result.ok) {
        throw new Error(`Request failed with status ${result.status}`);
      }

      const data = (await result.json()) as ApiResponse;
      setResponse(data);
      setSelectedSwaps([]);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to fetch recommendations.";
      setError(message);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(130deg,#fff3e4_0%,#fef8f1_45%,#eff9f4_100%)] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <Navbar cartCount={cartItems.length} />

        <header className="rounded-3xl border border-white/60 bg-[linear-gradient(120deg,#ff6b35_0%,#ff8f3f_34%,#ffa14a_100%)] p-6 text-white shadow-[0_24px_64px_rgba(208,89,0,0.3)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">NutriCraver</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">Zomato and Swiggy style flow with smart cart nutrition.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50 sm:text-base">
                Browse restaurants, add menu items to cart, and request recommendations only inside cart. Share preferences in AI chatbot.
              </p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-medium backdrop-blur">
              {cartItems.length > 0 ? `${cartItems.length} items in cart` : "Start by adding food items"}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
          <section className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_38px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
            <RestaurantList restaurants={MARKETPLACE_RESTAURANTS} onAddToCart={handleAddToCart} />
          </section>

          <section className="space-y-4">
            <Chatbot
              messages={chatMessages}
              draft={chatDraft}
              onDraftChange={setChatDraft}
              onSend={handleSendChat}
              locationLabel={locationLabel}
              onLocationLabelChange={setLocationLabel}
              latitude={latitude}
              onLatitudeChange={setLatitude}
              longitude={longitude}
              onLongitudeChange={setLongitude}
              sending={chatLoading}
            />

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_30px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950">Your Cart</h3>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  Rs {cartTotal}
                </span>
              </div>

              {cartItems.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">Add dishes from restaurants to start building your cart.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-600">{item.restaurantName}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">Rs {item.price * item.quantity}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="rounded-md border border-slate-300 px-2 py-0.5 text-sm"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="rounded-md border border-slate-300 px-2 py-0.5 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={getCartRecommendation}
                disabled={loading || cartItems.length === 0}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#111827] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Analyzing cart nutrition..." : "Smart Recommend in Cart"}
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
                className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-[#ff6b35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95e2a] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Checkout
              </button>

              {checkoutStatus ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {checkoutStatus}
                </div>
              ) : null}

              {error ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
              ) : null}

              {response ? (
                <div className="mt-5 space-y-4 rounded-2xl border border-emerald-200 bg-[#f2fcf7] p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0b7f5f]">Cart Intelligence</p>
                    <h4 className="mt-1 text-xl font-semibold text-slate-950">{response.recommendation.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{response.recommendation.summary}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Cell {response.recommendation.location.h3Cell} in {response.recommendation.location.label}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {response.recommendation.dishes.map((dish) => (
                      <DishItem key={dish.name} name={dish.name} rationale={dish.rationale} nutrients={dish.nutrients} />
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {response.recommendation.swaps.map((swap) => (
                      <button
                        key={swap}
                        type="button"
                        onClick={() => toggleSwap(swap)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          selectedSwaps.includes(swap)
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                        }`}
                      >
                        {swap}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
