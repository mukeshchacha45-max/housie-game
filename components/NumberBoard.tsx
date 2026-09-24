"use client";

type NumberBoardProps = {
  calledNumbers: number[];
};

export default function NumberBoard({
  calledNumbers,
}: NumberBoardProps) {
  const calledSet = new Set(calledNumbers);

  return (
    <section className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Tambola Board
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            🔢 Numbers 1–90
          </h2>
        </div>

        <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
          {calledNumbers.length}/90 Called
        </div>
      </div>

      <div className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-9">
        {Array.from({ length: 90 }, (_, index) => {
          const number = index + 1;
          const isCalled = calledSet.has(number);

          return (
            <div
              key={number}
              className={`flex aspect-square items-center justify-center rounded-xl text-sm font-black transition-all ${
                isCalled
                  ? "scale-105 bg-blue-600 text-white shadow-lg ring-2 ring-blue-300"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {number}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-center gap-5 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-slate-200" />
          <span className="text-slate-500">
            Not Called
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-600" />
          <span className="text-blue-700">
            Called
          </span>
        </div>
      </div>
    </section>
  );
}