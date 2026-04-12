export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
};

export type Restaurant = {
  id: string;
  name: string;
  area: string;
  etaMins: number;
  rating: number;
  cuisines: string[];
  menu: MenuItem[];
};

type RestaurantListProps = {
  restaurants: Restaurant[];
  onAddToCart: (item: MenuItem, restaurant: Restaurant) => void;
};

export default function RestaurantList({ restaurants, onAddToCart }: RestaurantListProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-950">Top Restaurants Near You</h3>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          {restaurants.length} live
        </span>
      </div>

      <div className="grid gap-3">
        {restaurants.map((restaurant) => (
          <article
            key={restaurant.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)] sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-950">{restaurant.name}</h4>
                <p className="mt-1 text-sm text-slate-600">{restaurant.area}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                {restaurant.rating.toFixed(1)} stars
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                ETA {restaurant.etaMins} min
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {restaurant.cuisines.map((cuisine) => (
                <span key={cuisine} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700">
                  {cuisine}
                </span>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
              {restaurant.menu.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{item.description}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">Rs {item.price}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddToCart(item, restaurant)}
                    className="rounded-lg bg-[#ff6b35] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#e95e2a]"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
