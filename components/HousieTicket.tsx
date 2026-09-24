"use client";

import { useEffect, useState } from "react";

type TicketCell = number | null;

type HousieTicketProps = {
  calledNumber?: number | null;
  onTicketReady?: (ticket: TicketCell[][]) => void;
};

const rowColumns = [
  [0, 1, 2, 4, 7],
  [0, 3, 5, 6, 8],
  [1, 2, 3, 5, 8],
];

function randomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTicket(): TicketCell[][] {
  const ticket: TicketCell[][] = [
    Array(9).fill(null),
    Array(9).fill(null),
    Array(9).fill(null),
  ];

  const used = new Set<number>();

  for (let row = 0; row < 3; row++) {
    for (const column of rowColumns[row]) {
      let number: number;

      do {
        const min = column === 0 ? 1 : column * 10;
        const max =
          column === 8 ? 90 : column * 10 + 9;

        number = randomNumber(min, max);
      } while (used.has(number));

      used.add(number);
      ticket[row][column] = number;
    }
  }

  return ticket;
}

export default function HousieTicket({
  calledNumber,
  onTicketReady,
}: HousieTicketProps) {
  const [ticket, setTicket] =
    useState<TicketCell[][] | null>(null);

  const [marked, setMarked] =
    useState<Set<number>>(new Set());

  const [lastMarked, setLastMarked] =
    useState<number | null>(null);

  useEffect(() => {
    const newTicket = generateTicket();

    setTicket(newTicket);
    onTicketReady?.(newTicket);

    // Ticket generate only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      typeof calledNumber !== "number" ||
      !ticket
    ) {
      return;
    }

    const exists = ticket.some((row) =>
      row.includes(calledNumber)
    );

    if (!exists) {
      return;
    }

    setMarked((previous) => {
      if (previous.has(calledNumber)) {
        return previous;
      }

      const next = new Set(previous);
      next.add(calledNumber);

      return next;
    });

    setLastMarked(calledNumber);

    const timer = setTimeout(() => {
      setLastMarked(null);
    }, 700);

    return () => clearTimeout(timer);
  }, [calledNumber, ticket]);

  const toggleNumber = (number: number) => {
    setMarked((previous) => {
      const next = new Set(previous);

      if (next.has(number)) {
        next.delete(number);
      } else {
        next.add(number);
      }

      return next;
    });
  };

  if (!ticket) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
          <p className="font-semibold text-slate-400">
            Generating your ticket...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-400">
            YOUR TICKET
          </p>

          <p className="text-xs text-slate-500">
            Click numbers to manually mark/unmark
          </p>
        </div>

        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
          ● LIVE
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl">
        <div className="mx-auto min-w-[520px] max-w-3xl overflow-hidden rounded-2xl border-4 border-slate-700 bg-slate-800 shadow-2xl">
          {ticket.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-9"
            >
              {row.map((number, columnIndex) => {
                const isMarked =
                  typeof number === "number" &&
                  marked.has(number);

                const isLatest =
                  typeof number === "number" &&
                  number === lastMarked;

                return (
                  <button
                    key={`${rowIndex}-${columnIndex}`}
                    type="button"
                    disabled={number === null}
                    onClick={() => {
                      if (
                        typeof number === "number"
                      ) {
                        toggleNumber(number);
                      }
                    }}
                    className={`
                      relative aspect-square
                      border border-slate-700
                      text-lg font-black
                      transition-all duration-200
                      ${
                        number === null
                          ? "cursor-default bg-slate-950"
                          : isMarked
                          ? "bg-emerald-500 text-white shadow-inner"
                          : "bg-slate-100 text-slate-900 hover:bg-blue-100"
                      }
                      ${
                        isLatest
                          ? "z-10 scale-105 ring-4 ring-yellow-400"
                          : ""
                      }
                    `}
                  >
                    {number ?? ""}

                    {isMarked &&
                      number !== null && (
                        <span className="absolute right-1 top-1 text-[9px] text-white">
                          ✓
                        </span>
                      )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-4 text-xs font-bold">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="h-3 w-3 rounded bg-slate-100" />
          Not Called
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="h-3 w-3 rounded bg-emerald-500" />
          Called
        </div>
      </div>
    </div>
  );
}