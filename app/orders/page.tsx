"use client";

import { useEffect, useState } from "react";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import AuthGuard from "@/app/components/AuthGuard";
import { useAuth } from "@/app/context/AuthContext";
import { subscribeToOrders, type Order } from "@/lib/firestore";

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToOrders(user.uid, (data) => {
      setOrders(data);
      setLoadingOrders(false);
    });

    return unsubscribe;
  }, [user]);

  function formatDate(date: Date) {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <>
      <Navbar />
      <AuthGuard>
        <main className="w-full flex-1 max-w-screen-2xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
          <section className="mb-16 border-l-4 border-secondary pl-6 md:pl-10">
            <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-secondary font-bold">Order History</p>
            <h1 className="mt-2 text-4xl font-serif italic text-primary">Your Culinary Journey</h1>
          </section>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-stone-400">
                  Loading your orders...
                </p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <section className="max-w-4xl">
              <div className="bg-surface-container-low p-12 editorial-shadow flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-outline-variant mb-4 text-5xl">receipt_long</span>
                <h2 className="text-xl font-serif italic text-primary mb-2">No orders yet</h2>
                <p className="text-sm text-stone-500 font-body max-w-md">
                  Your culinary journey begins with a single selection. Browse our artisans and curate your first order.
                </p>
                <a
                  href="/"
                  className="mt-6 text-[10px] font-sans font-bold uppercase tracking-widest border border-primary text-primary px-6 py-3 hover:bg-primary hover:text-on-primary transition-all"
                >
                  Start Curating
                </a>
              </div>
            </section>
          ) : (
            <section className="max-w-4xl grid gap-6">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="bg-surface-container-low p-6 editorial-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <p className="text-lg font-serif text-primary">{order.trackingId || order.id}</p>
                      <span
                        className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 ${
                          order.status === "Delivered"
                            ? "bg-primary-fixed-dim/30 text-primary"
                            : order.status === "Cancelled"
                              ? "bg-error-container text-error"
                              : "bg-secondary-fixed/30 text-secondary"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 font-body">
                      {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                    </p>
                  </div>
                  <div className="sm:text-right sm:min-w-[120px] mt-2 sm:mt-0">
                    <p className="font-serif italic text-secondary text-lg">Rs {order.total}</p>
                    <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-1">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </article>
              ))}
            </section>
          )}
        </main>
      </AuthGuard>
      <Footer />
    </>
  );
}
