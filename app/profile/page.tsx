import Navbar from "@/app/components/Navbar";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(130deg,#fff4e7_0%,#fef9f3_45%,#f3fbf7_100%)] px-5 py-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Navbar />

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ff6b35] text-xl font-semibold text-white">M</div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-950">Max</h1>
                <p className="text-sm text-slate-600">max@example.com</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-[#ff6b35] hover:text-[#ff6b35]"
            >
              Edit Profile
            </button>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-semibold text-slate-950">Saved preferences</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p className="rounded-xl bg-slate-50 px-3 py-2">Diet style: High-protein balanced</p>
              <p className="rounded-xl bg-slate-50 px-3 py-2">Allergies: None</p>
              <p className="rounded-xl bg-slate-50 px-3 py-2">Delivery area: Central Bengaluru</p>
              <p className="rounded-xl bg-slate-50 px-3 py-2">Favorite cuisine: North Indian and healthy bowls</p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
