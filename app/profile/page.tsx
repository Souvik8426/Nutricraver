"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import AuthGuard from "@/app/components/AuthGuard";
import { useAuth } from "@/app/context/AuthContext";
import {
  updateUserProfile,
  subscribeToUserProfile,
  subscribeToChatHistory,
  type UserProfile,
  type ChatHistoryMessage,
} from "@/lib/firestore";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatHistoryMessage[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Editable fields
  const [diet, setDiet] = useState("");
  const [allergies, setAllergies] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("");
  const [favoriteCuisines, setFavoriteCuisines] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Subscribe to profile — serves from Firestore cache instantly
    const unsubProfile = subscribeToUserProfile(user.uid, (data) => {
      if (data) {
        setProfile(data);
        setDiet(data.diet || "Balanced");
        setAllergies(data.allergies || "None");
        setDeliveryArea(data.deliveryArea || "Central Bengaluru");
        setFavoriteCuisines(
          (data.favoriteCuisines || []).join(", ") || "North Indian, healthy bowls"
        );
      }
      setLoadingProfile(false);
    });

    // Subscribe to chat history
    const unsubChat = subscribeToChatHistory(user.uid, (messages) => {
      setChatHistory(messages);
    });

    return () => {
      unsubProfile();
      unsubChat();
    };
  }, [user]);

  // Scroll chat to bottom when history loads
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updateUserProfile(user.uid, {
        diet,
        allergies,
        deliveryArea,
        favoriteCuisines: favoriteCuisines
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // Error handling
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/");
    } finally {
      setLoggingOut(false);
    }
  }

  function formatTime(date: Date) {
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <Navbar />
      <AuthGuard>
        <main className="w-full flex-1 max-w-screen-2xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
          {/* Header */}
          <section className="mb-16 border-l-4 border-secondary pl-6 md:pl-10 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-secondary font-bold">
                The Journal
              </p>
              <h1 className="mt-2 text-4xl font-serif italic text-primary">
                Your Sanctuary
              </h1>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest border border-stone-300 text-stone-500 px-5 py-3 hover:border-error hover:text-error transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </section>

          {loadingProfile ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-stone-400">
                  Loading your profile...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Profile cards */}
              <section className="grid gap-8 lg:grid-cols-2 max-w-5xl">
                <article className="bg-surface-container-low p-8 editorial-shadow flex flex-col justify-between">
                  <div className="flex items-center gap-6 mb-8">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="h-20 w-20 rounded-full border-2 border-surface-container object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-serif text-on-primary">
                        {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-serif text-primary">
                        {user?.displayName || "User"}
                      </h2>
                      <p className="text-sm text-stone-500 font-sans tracking-wide">
                        {user?.email || ""}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="bg-secondary-fixed text-on-secondary-fixed-variant px-4 py-1 inline-flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                      <span className="text-[9px] font-sans font-bold uppercase tracking-widest">
                        Google Verified
                      </span>
                    </div>
                  </div>
                </article>

                <article className="bg-surface-container-low p-8 editorial-shadow">
                  <div className="flex justify-between items-center border-b border-surface-container pb-4 mb-6">
                    <h2 className="text-xl font-serif text-primary">
                      Biometric Preferences
                    </h2>
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-[10px] font-sans font-bold uppercase tracking-widest border border-primary text-primary px-4 py-2 hover:bg-primary hover:text-on-primary transition-all"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {saveSuccess && (
                    <div className="mb-4 p-3 bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs border-l-2 border-primary tracking-wide">
                      Preferences saved successfully.
                    </div>
                  )}

                  {editing ? (
                    <div className="space-y-5">
                      <div>
                        <label className="text-stone-500 uppercase text-[10px] tracking-widest block mb-1">
                          Diet Style
                        </label>
                        <input
                          value={diet}
                          onChange={(e) => setDiet(e.target.value)}
                          className="w-full border border-outline-variant/50 bg-transparent px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-stone-500 uppercase text-[10px] tracking-widest block mb-1">
                          Allergies
                        </label>
                        <input
                          value={allergies}
                          onChange={(e) => setAllergies(e.target.value)}
                          className="w-full border border-outline-variant/50 bg-transparent px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-stone-500 uppercase text-[10px] tracking-widest block mb-1">
                          Delivery Area
                        </label>
                        <input
                          value={deliveryArea}
                          onChange={(e) => setDeliveryArea(e.target.value)}
                          className="w-full border border-outline-variant/50 bg-transparent px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-stone-500 uppercase text-[10px] tracking-widest block mb-1">
                          Favorite Cuisines (comma-separated)
                        </label>
                        <input
                          value={favoriteCuisines}
                          onChange={(e) => setFavoriteCuisines(e.target.value)}
                          className="w-full border border-outline-variant/50 bg-transparent px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="text-[10px] font-sans font-bold uppercase tracking-widest bg-primary text-on-primary px-6 py-3 hover:bg-primary-container transition-all disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          className="text-[10px] font-sans font-bold uppercase tracking-widest border border-outline-variant text-stone-500 px-6 py-3 hover:text-primary hover:border-primary transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm text-stone-700 font-body">
                      <div className="flex justify-between items-center border-b border-surface-container/50 pb-2">
                        <span className="text-stone-500 uppercase text-[10px] tracking-widest">
                          Diet Style
                        </span>
                        <span className="font-semibold text-primary">
                          {profile?.diet || "Balanced"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-surface-container/50 pb-2">
                        <span className="text-stone-500 uppercase text-[10px] tracking-widest">
                          Allergies
                        </span>
                        <span className="font-semibold text-primary">
                          {profile?.allergies || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-surface-container/50 pb-2">
                        <span className="text-stone-500 uppercase text-[10px] tracking-widest">
                          Delivery Area
                        </span>
                        <span className="font-semibold text-primary">
                          {profile?.deliveryArea || "Central Bengaluru"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-surface-container/50 pb-2">
                        <span className="text-stone-500 uppercase text-[10px] tracking-widest">
                          Favorite Cuisine
                        </span>
                        <span className="font-semibold text-primary text-right max-w-[200px]">
                          {(profile?.favoriteCuisines || []).join(", ") ||
                            "North Indian, healthy bowls"}
                        </span>
                      </div>
                    </div>
                  )}
                </article>
              </section>

              {/* AI Concierge Chat History */}
              <section className="max-w-5xl">
                <div className="border-l-4 border-secondary pl-6 mb-6">
                  <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-secondary font-bold">
                    AI Wellness Concierge
                  </p>
                  <h2 className="mt-1 text-2xl font-serif italic text-primary">
                    Conversation History
                  </h2>
                </div>

                {chatHistory.length === 0 ? (
                  <div className="bg-surface-container-low p-10 editorial-shadow flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-outline-variant mb-4 text-5xl">
                      chat
                    </span>
                    <p className="text-sm text-stone-500 font-body max-w-md">
                      No conversations yet. Share your dietary needs on the home
                      page to get started.
                    </p>
                  </div>
                ) : (
                  <div className="bg-primary p-6 md:p-8 editorial-shadow">
                    <div className="max-h-[480px] overflow-y-auto space-y-3 pr-2 no-scrollbar">
                      {chatHistory.map((msg) => (
                        <div
                          key={msg.id}
                          className={`px-4 py-3 text-sm leading-relaxed border-l-2 ${
                            msg.role === "user"
                              ? "border-secondary bg-surface/10 text-on-primary"
                              : "border-primary-fixed-dim bg-surface-container-lowest/5 text-on-primary"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-sans font-bold uppercase tracking-widest opacity-60">
                              {msg.role === "user" ? "You" : "Concierge"}
                            </span>
                            <span className="text-[9px] opacity-40">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                          {msg.text}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </AuthGuard>
      <Footer />
    </>
  );
}
