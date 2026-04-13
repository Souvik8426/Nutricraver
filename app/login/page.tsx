"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  async function handleGoogleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      // Don't show error for user-cancelled popups
      if (!message.includes("popup-closed-by-user")) {
        setError(message);
      }
    } finally {
      setSigningIn(false);
    }
  }

  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Decorative top bar */}
      <div className="w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Brand header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif italic text-primary mb-3">
              NutriCraver
            </h1>
            <div className="w-16 h-px bg-secondary mx-auto mb-4" />
            <p className="text-[10px] font-sans uppercase tracking-[0.3em] text-stone-400">
              Exquisite Culinary Curation
            </p>
          </div>

          {/* Sign-in card */}
          <div className="bg-surface-container-lowest p-10 editorial-shadow border border-surface-container/30">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif text-primary mb-2">
                Welcome
              </h2>
              <p className="text-sm text-stone-500 font-body leading-relaxed">
                Sign in to access your curated culinary journey, personalized
                recommendations, and order history.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 bg-surface border border-outline-variant/50 py-4 px-6 hover:bg-surface-container-low hover:border-primary/30 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingIn ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span className="text-xs font-sans font-bold uppercase tracking-[0.15em] text-primary group-hover:text-secondary transition-colors">
                {signingIn ? "Signing in..." : "Continue with Google"}
              </span>
            </button>

            {error && (
              <div className="mt-4 p-3 bg-error-container text-error text-xs border-l-2 border-error tracking-wide">
                {error}
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-surface-container text-center">
              <p className="text-[10px] text-stone-400 font-sans tracking-wide leading-relaxed">
                By signing in, you agree to NutriCraver's Terms of Service and
                Privacy Policy. Your culinary preferences are stored securely.
              </p>
            </div>
          </div>

          {/* Bottom flourish */}
          <div className="mt-8 flex justify-center">
            <div className="bg-secondary-fixed text-on-secondary-fixed-variant px-4 py-1 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
              <span className="text-[9px] font-sans font-bold uppercase tracking-widest">
                Secured by Firebase
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
