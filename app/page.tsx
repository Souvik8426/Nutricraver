"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chatbot, { type ChatMessage } from "@/app/components/Chatbot";
import DishItem from "@/app/components/DishItem";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import RestaurantList, { type MenuItem, type Restaurant } from "@/app/components/RestaurantList";
import { useAuth } from "@/app/context/AuthContext";
import {
  createOrder,
  getCart,
  getUserProfile,
  saveCart,
  clearCart,
  saveChatMessage,
  getChatHistory,
  type CartItemDoc,
} from "@/lib/firestore";

type Recommendation = {
  title: string;
  summary: string;
  optimal: boolean;
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
  const { user } = useAuth();
  const userId = user?.uid ?? "guest-user";

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
  const [cartLoaded, setCartLoaded] = useState(false);

  // Debounce timer for cart persistence
  const cartSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user profile + cart from Firestore on login
  useEffect(() => {
    if (!user) {
      setCartLoaded(true);
      return;
    }

    let cancelled = false;

    async function loadUserData() {
      try {
        const [profile, savedCart, history] = await Promise.all([
          getUserProfile(user!.uid),
          getCart(user!.uid),
          getChatHistory(user!.uid),
        ]);

        if (cancelled) return;

        if (profile) {
          if (profile.diet) setDiet(profile.diet);
          if (profile.allergies) setAllergies(profile.allergies);
          if (profile.deliveryArea) setLocationLabel(profile.deliveryArea);
        }

        if (savedCart.length > 0) {
          setCartItems(
            savedCart.map((item: CartItemDoc) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              restaurantName: item.restaurantName,
              quantity: item.quantity,
            }))
          );
        }

        if (history.length > 0) {
          setChatMessages(
            history.map((msg) => ({ role: msg.role, text: msg.text }))
          );
        }
      } catch {
        // Non-blocking — use defaults
      } finally {
        if (!cancelled) setCartLoaded(true);
      }
    }

    loadUserData();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Persist cart to Firestore (debounced) when logged in
  const persistCart = useCallback(
    (items: CartItem[]) => {
      if (!user || !cartLoaded) return;

      if (cartSaveTimer.current) {
        clearTimeout(cartSaveTimer.current);
      }

      cartSaveTimer.current = setTimeout(() => {
        saveCart(user.uid, items).catch(() => {
          // Non-blocking
        });
      }, 800);
    },
    [user, cartLoaded]
  );

  function slugify(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const cartCraving = useMemo(
    () => cartItems.map((item) => `${item.name} x${item.quantity}`).join(", "),
    [cartItems]
  );

  function handleAddToCart(item: MenuItem, restaurant: Restaurant) {
    setCheckoutStatus(null);
    setResponse(null);
    setCartItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      let next: CartItem[];
      if (existing) {
        next = current.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      } else {
        next = [
          ...current,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            restaurantName: restaurant.name,
            quantity: 1,
          },
        ];
      }
      persistCart(next);
      return next;
    });
  }

  function updateQuantity(itemId: string, nextQuantity: number) {
    setCheckoutStatus(null);
    setResponse(null);
    setCartItems((current) => {
      let next: CartItem[];
      if (nextQuantity <= 0) {
        next = current.filter((item) => item.id !== itemId);
      } else {
        next = current.map((item) =>
          item.id === itemId ? { ...item, quantity: nextQuantity } : item
        );
      }
      persistCart(next);
      return next;
    });
  }

  async function handleSendChat() {
    const trimmed = chatDraft.trim();
    if (!trimmed) {
      return;
    }

    setChatMessages((current) => [...current, { role: "user", text: trimmed }]);
    setChatDraft("");

    // Persist user message to Firestore (non-blocking)
    if (user) {
      saveChatMessage(user.uid, "user", trimmed).catch(() => {});
    }

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

      const reply = data.reply;
      setChatMessages((current) => [...current, { role: "assistant", text: reply }]);

      // Persist assistant reply to Firestore (non-blocking)
      if (user) {
        saveChatMessage(user.uid, "assistant", reply).catch(() => {});
      }
    } catch {
      const nextDiet = detectDiet(trimmed);
      const nextAllergies = detectAllergies(trimmed);
      setDiet(nextDiet);
      setAllergies(nextAllergies);
      const fallbackReply = `Saved. Diet: ${nextDiet}. Allergies: ${nextAllergies}. Add items to cart and tap Smart Recommend in cart for suggestions.`;
      setChatMessages((current) => [
        ...current,
        { role: "assistant", text: fallbackReply },
      ]);

      // Persist fallback reply too
      if (user) {
        saveChatMessage(user.uid, "assistant", fallbackReply).catch(() => {});
      }
    } finally {
      setChatLoading(false);
    }
  }

  function toggleSwap(swap: string) {
    setSelectedSwaps((current) =>
      current.includes(swap)
        ? current.filter((entry) => entry !== swap)
        : [...current, swap]
    );
  }

  function addSmartItemToCart(itemName: string, source: "dish" | "swap") {
    const id = `smart-${slugify(itemName)}`;
    const price = source === "dish" ? 179 : 99;

    setCartItems((current) => {
      const existing = current.find((item) => item.id === id);
      let next: CartItem[];
      if (existing) {
        next = current.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        next = [
          ...current,
          {
            id,
            name: itemName,
            price,
            restaurantName: "NutriCraver Smart Add-on",
            quantity: 1,
          },
        ];
      }
      persistCart(next);
      return next;
    });

    if (source === "swap") {
      toggleSwap(itemName);
    }
  }

  async function handleCheckout() {
    if (cartItems.length === 0) {
      setError("Add items to cart before checkout.");
      return;
    }

    const checkoutId = `NC-${Math.floor(100000 + Math.random() * 900000)}`;

    // Save order to Firestore if logged in
    if (user) {
      try {
        await createOrder(user.uid, {
          items: cartItems.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            restaurantName: item.restaurantName,
          })),
          total: cartTotal,
          trackingId: checkoutId,
        });
        await clearCart(user.uid);
      } catch {
        // Non-blocking — order still proceeds locally
      }
    }

    setCheckoutStatus(`Proceeding to provenance... Order placed. Tracking ID: ${checkoutId}`);
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
          cartItems: cartItems.map((item) => item.name),
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
    <>
      <Navbar cartCount={cartItems.length} />

      <main className="w-full max-w-screen-2xl mx-auto px-6 lg:px-8 py-10 lg:grid lg:grid-cols-12 lg:gap-16 lg:items-start">
        <div className="lg:col-span-8 space-y-16">
          {/* Hero Section */}
          <section className="relative h-[480px] flex items-center overflow-hidden bg-stone-900 border border-surface-container/50">
            <img
              className="absolute inset-0 w-full h-full object-cover brightness-[0.85]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbStGGCIesP1j5p_ONda6CngXfdWNpmzWCPU99wLK0B_2BuubyZIUyKQ-G3T48wsUQGBFetLx44kmD_6QfbEGgYCxaAxvfJrbq6x-HKFtWKAuHG39yDuHmltTvWLB0LD0VftnwHGANALozTKWwsjWZP6UZsNHxhFfVJ4n29J2IKHgVwn1fVWpQvfemR2zeYB-ObaLmbC9rnQj8GpAWsYkDyYG2IHA3q_xty5P8FryJf9IN01pmHSw2oBgg6m9XY1rUNFRvs0E4yvgl"
              alt="Fresh ingredients"
            />
            <div className="relative z-10 p-8 md:p-12 border-l-4 border-secondary bg-surface/95 backdrop-blur-md max-w-xl mx-8 shadow-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tighter leading-tight mb-4">
                The Art of <br />
                <span className="italic font-normal">Conscious Dining</span>
              </h1>
              <p className="text-stone-600 font-body mb-6 text-sm md:text-base leading-relaxed">
                Experience a tailored culinary journey. Browse our artisans, curate your selection, and let our intelligence optimize your body's biometric needs.
              </p>
            </div>
          </section>

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

          <RestaurantList restaurants={MARKETPLACE_RESTAURANTS} onAddToCart={handleAddToCart} />
        </div>

        <aside className="lg:col-span-4 mt-16 lg:mt-0 relative">
          <div className="sticky top-28 bg-surface-container-lowest p-8 editorial-shadow border border-surface-container/30">
            <h3 className="text-2xl font-serif italic text-primary mb-6 border-b border-surface-container pb-4">
              Your Curated Cart
            </h3>

            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="material-symbols-outlined text-outline-variant mb-4 text-4xl">shopping_cart</span>
                <p className="text-[10px] uppercase tracking-widest text-stone-400">The cart is currently silent</p>
              </div>
            ) : (
              <div className="space-y-6 mb-8">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-serif font-bold text-primary">{item.name}</h3>
                        <p className="text-[9px] font-sans uppercase tracking-[0.2em] text-stone-500 mt-1">
                          {item.restaurantName}
                        </p>
                      </div>
                      <span className="text-sm font-serif text-primary">Rs {item.price * item.quantity}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-outline-variant/50 px-2 py-0.5 gap-3">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="material-symbols-outlined text-sm text-stone-400 hover:text-primary transition-colors"
                        >
                          remove
                        </button>
                        <span className="text-xs font-medium w-3 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="material-symbols-outlined text-sm text-stone-400 hover:text-primary transition-colors"
                        >
                          add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-surface-container flex justify-between items-baseline mb-6">
              <span className="text-sm font-sans uppercase tracking-widest text-primary">Subtotal</span>
              <span className="text-xl font-serif text-primary">Rs {cartTotal}</span>
            </div>

            <button
              type="button"
              onClick={getCartRecommendation}
              disabled={loading || cartItems.length === 0}
              className="w-full bg-surface text-primary border border-primary py-4 text-xs uppercase tracking-[0.15em] font-bold hover:bg-primary-container hover:text-on-primary transition-all mb-4 disabled:opacity-50"
            >
              {loading ? "Analyzing Curations..." : "Smart Recommend"}
            </button>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
              className="w-full bg-primary text-on-primary py-4 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-primary-container transition-all shadow-lg active:opacity-80 disabled:opacity-50"
            >
              Proceed to Provenance
            </button>

            {checkoutStatus && (
              <div className="mt-4 p-3 bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs border-l-2 border-primary tracking-wide">
                {checkoutStatus}
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 bg-error-container text-error text-xs border-l-2 border-error tracking-wide">
                {error}
              </div>
            )}

            {response && (
              <div className="mt-8 border-t border-surface-container pt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    eco
                  </span>
                  <div>
                    <h4 className="text-[10px] font-sans uppercase tracking-[0.2em] text-secondary font-bold">
                      Cart Intelligence
                    </h4>
                    <p className="text-sm font-serif italic text-primary mt-1">{response.recommendation.title}</p>
                  </div>
                </div>
                <p className="text-xs text-stone-600 mb-6 leading-relaxed bg-surface px-3 py-2 border-l-2 border-secondary">
                  {response.recommendation.summary}
                </p>

                <div className="grid gap-2">
                  {response.recommendation.dishes.map((dish) => (
                    <DishItem
                      key={dish.name}
                      name={dish.name}
                      rationale={dish.rationale}
                      nutrients={dish.nutrients}
                      onAddToCart={() => addSmartItemToCart(dish.name, "dish")}
                    />
                  ))}
                </div>

                {!response.recommendation.optimal ? (
                  <div className="mt-6">
                    <p className="font-serif italic text-primary text-sm border-b border-surface-container pb-2 mb-4">
                      Suggested Curations
                    </p>
                    <div className="space-y-3">
                      {response.recommendation.swaps.map((swap) => (
                        <div key={swap} className="flex items-center justify-between gap-4 p-2 bg-surface hover:bg-surface-container-low transition-colors">
                          <p className="text-xs text-stone-700 font-medium">{swap}</p>
                          <button
                            type="button"
                            onClick={() => addSmartItemToCart(swap, "swap")}
                            className="bg-primary text-on-primary px-3 py-1.5 text-[9px] uppercase tracking-widest font-bold hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-colors whitespace-nowrap"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 p-3 bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs text-center border border-primary/20">
                    Your selection is nutritionally optimal.
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-8 pt-4 border-t border-surface-container flex justify-center">
              <div className="bg-secondary-fixed text-on-secondary-fixed-variant px-4 py-1 flex items-center gap-2 max-w-fit mx-auto">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
                <span className="text-[9px] font-sans font-bold uppercase tracking-widest">Sustainably Sourced</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <Footer />
    </>
  );
}
