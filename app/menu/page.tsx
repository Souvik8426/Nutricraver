import Navbar from "@/app/components/Navbar";

const MENU_CATEGORIES = [
  {
    title: "Comfort Picks",
    items: ["Butter Chicken Bowl", "Millet Khichdi Combo", "Paneer Tikka Wrap"],
  },
  {
    title: "Healthy Add-ons",
    items: ["Chickpea Kachumber", "Tandoori Broccoli", "Sprout Chaat Cup"],
  },
  {
    title: "Protein Rich",
    items: ["High Protein Chicken Bowl", "Tofu Quinoa Crunch", "Greek Yogurt Herb Dip"],
  },
];

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(130deg,#fff4e7_0%,#fef9f3_45%,#f3fbf7_100%)] px-5 py-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Navbar />

        <section className="rounded-3xl border border-white/60 bg-[linear-gradient(120deg,#ff6b35_0%,#ff9952_100%)] p-6 text-white shadow-[0_20px_42px_rgba(208,89,0,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-100">Menu</p>
          <h1 className="mt-2 text-3xl font-semibold">Explore curated dishes</h1>
          <p className="mt-2 max-w-2xl text-sm text-orange-50">
            Pick signature meals and add nutrient-friendly sides from our category-first menu view.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {MENU_CATEGORIES.map((category) => (
            <article key={category.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_26px_rgba(15,23,42,0.07)]">
              <h2 className="text-lg font-semibold text-slate-900">{category.title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {category.items.map((item) => (
                  <li key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
