import Navbar from "@/app/components/Navbar";

const ORDERS = [
  {
    id: "ORD-1029",
    date: "12 Apr 2026",
    status: "Delivered",
    total: 578,
    items: "Butter Chicken Bowl, Chickpea Kachumber",
  },
  {
    id: "ORD-1024",
    date: "10 Apr 2026",
    status: "Delivered",
    total: 349,
    items: "High Protein Chicken Bowl",
  },
  {
    id: "ORD-1017",
    date: "06 Apr 2026",
    status: "Cancelled",
    total: 239,
    items: "Paneer Tikka Wrap",
  },
];

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(130deg,#fff4e7_0%,#fef9f3_45%,#f3fbf7_100%)] px-5 py-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Navbar />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Order History</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Your recent orders</h1>

          <div className="mt-5 grid gap-3">
            {ORDERS.map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{order.id}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${order.status === "Delivered" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                    {order.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{order.items}</p>
                <p className="mt-1 text-xs text-slate-600">{order.date} • Rs {order.total}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
