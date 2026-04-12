export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type ChatbotProps = {
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  locationLabel: string;
  onLocationLabelChange: (value: string) => void;
  latitude: string;
  onLatitudeChange: (value: string) => void;
  longitude: string;
  onLongitudeChange: (value: string) => void;
};

export default function Chatbot({
  messages,
  draft,
  onDraftChange,
  onSend,
  sending = false,
  locationLabel,
  onLocationLabelChange,
  latitude,
  onLatitudeChange,
  longitude,
  onLongitudeChange,
}: ChatbotProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#ffd2b2] bg-[linear-gradient(145deg,#fff6ec_0%,#ffe8d2_100%)] p-5 shadow-[0_18px_36px_rgba(180,89,0,0.15)]">
      <div className="absolute -right-7 -top-7 h-28 w-28 rounded-full bg-[#ffc48d]/40 blur-2xl" />
      <div className="relative space-y-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8e4d00]">
            AI Nutrition Chatbot
          </span>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">Share your dietary requirements here</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-700 sm:col-span-3">
            Location label
            <input
              value={locationLabel}
              onChange={(event) => onLocationLabelChange(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-[#ff6b35]"
              placeholder="Indiranagar, Bengaluru"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Lat
            <input
              value={latitude}
              onChange={(event) => onLatitudeChange(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-[#ff6b35]"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Lng
            <input
              value={longitude}
              onChange={(event) => onLongitudeChange(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-orange-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-[#ff6b35]"
            />
          </label>
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-orange-200/70 bg-white/70 p-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-xl px-3 py-2 text-sm leading-6 ${
                message.role === "user" ? "bg-slate-900 text-white" : "bg-orange-100 text-slate-800"
              }`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff6b35]"
            placeholder="Example: I am vegetarian and allergic to peanuts"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}
