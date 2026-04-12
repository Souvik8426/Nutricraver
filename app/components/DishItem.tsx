type DishItemProps = {
  name: string;
  rationale: string;
  nutrients: string[];
};

export default function DishItem({ name, rationale, nutrients }: DishItemProps) {
  return (
    <article className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-base font-semibold text-slate-950">{name}</h4>
        <span className="rounded-full bg-[#fff1db] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a65b00]">
          Nutrient fit
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{rationale}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {nutrients.map((nutrient) => (
          <span
            key={nutrient}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
          >
            {nutrient}
          </span>
        ))}
      </div>
    </article>
  );
}
