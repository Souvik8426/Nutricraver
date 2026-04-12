"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavbarProps = {
  cartCount?: number;
};

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/orders", label: "Order History" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar({ cartCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  return (
    <nav className="sticky top-0 z-20 rounded-2xl border border-orange-100 bg-white/90 px-4 py-3 shadow-[0_10px_28px_rgba(17,24,39,0.08)] backdrop-blur sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="rounded-lg bg-[#ff6b35] px-2.5 py-1 text-sm font-semibold text-white">NC</span>
          <p className="text-sm font-semibold text-slate-900 sm:text-base">NutriCraver</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? "bg-[#ff6b35] text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-[#ff6b35] hover:text-[#ff6b35]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            Cart {cartCount}
          </span>
          <button
            type="button"
            onClick={() => setIsLoggedIn((current) => !current)}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black sm:text-sm"
          >
            {isLoggedIn ? "Logout" : "Login"}
          </button>
        </div>
      </div>
    </nav>
  );
}
