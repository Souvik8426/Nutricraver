"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type NavbarProps = {
  cartCount?: number;
};

const NAV_ITEMS_PUBLIC = [
  { href: "/", label: "Cuisine" },
  { href: "/menu", label: "Artisans" },
];

const NAV_ITEMS_AUTH = [
  { href: "/orders", label: "Order History" },
  { href: "/profile", label: "The Journal" },
];

export default function Navbar({ cartCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const navItems = user
    ? [...NAV_ITEMS_PUBLIC, ...NAV_ITEMS_AUTH]
    : NAV_ITEMS_PUBLIC;

  return (
    <header className="w-full sticky top-0 z-50 bg-[#f9f9f7] shadow-sm shadow-stone-200/50">
      <div className="max-w-screen-2xl mx-auto flex justify-between items-center px-6 md:px-8 py-6">
        <div className="flex items-center gap-12">
          <Link href="/" className="text-2xl font-serif italic text-primary">
            NutriCraver
          </Link>
          <nav className="hidden md:flex gap-8 items-center">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-sans uppercase text-xs tracking-widest transition-colors duration-300 ${
                    active
                      ? "text-primary border-b-2 border-secondary pb-1"
                      : "text-stone-500 hover:text-secondary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative flex items-center gap-2 text-stone-500 hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined">shopping_bag</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-secondary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </div>

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-surface-container animate-pulse" />
          ) : user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 text-stone-500 hover:text-primary transition-colors cursor-pointer group"
              title={`Signed in as ${user.displayName || user.email}`}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full border border-surface-container group-hover:border-primary transition-colors"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="material-symbols-outlined">
                  account_circle
                </span>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 text-stone-500 hover:text-primary transition-colors cursor-pointer"
              title="Sign In"
            >
              <span className="material-symbols-outlined">login</span>
              <span className="hidden sm:inline text-[10px] font-sans uppercase tracking-widest font-bold">
                Sign In
              </span>
            </Link>
          )}
        </div>
      </div>
      <div className="bg-[#f4f4f2] h-px w-full"></div>
    </header>
  );
}
