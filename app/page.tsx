"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import HousieTicket from "../components/HousieTicket";

type TicketCell = number | null;

type Player = {
  id: string;
  name: string;
};

type Winner = {
  type: string;
  playerId: string;
  playerName: string;
};

type ServerResponse = {
  success: boolean;
  message?: string;
};

const SERVER_URL = "https://housie-game-gyx3.onrender.com";

const winningTypes = [
  "Early 5",
  "Top Line",
  "Middle Line",
  "Bottom Line",
  "Full House",
];

export default function Home() {
  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [socketId, setSocketId] =
    useState("");

  const [playerName, setPlayerName] =
    useState("");

  const [roomCode, setRoomCode] =
    useState("");

  const [joinCode, setJoinCode] =
    useState("");

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [hostId, setHostId] =
    useState("");

  const [mode, setMode] =
    useState<"home" | "room">("home");

  const [gameStarted, setGameStarted] =
    useState(false);

  const [startingGame, setStartingGame] =
    useState(false);

  const [callingNumber, setCallingNumber] =
    useState(false);

  const [calledNumber, setCalledNumber] =
    useState<number | null>(null);

  const [calledNumbers, setCalledNumbers] =
    useState<number[]>([]);

  const [ticket, setTicket] =
    useState<TicketCell[][] | null>(null);

  const [claiming, setClaiming] =
    useState<string | null>(null);

  const [winners, setWinners] =
    useState<Winner[]>([]);

  const [latestWinner, setLatestWinner] =
    useState<Winner | null>(null);

  const [showCelebration, setShowCelebration] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const isHost =
    socketId !== "" &&
    socketId === hostId;

  useEffect(() => {
    const socket = io(SERVER_URL);

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setSocketId(socket.id || "");
      setMessage("🟢 Connected");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setSocketId("");
      setMessage("🔴 Server disconnected");
    });

    socket.on(
      "playersUpdated",
      (updatedPlayers: Player[]) => {
        setPlayers(updatedPlayers);
      }
    );

    socket.on(
      "hostChanged",
      (newHostId: string) => {
        setHostId(newHostId);
        setMessage("👑 New host assigned");
      }
    );

    socket.on("gameStarted", () => {
      setGameStarted(true);
      setStartingGame(false);
      setCallingNumber(false);
      setCalledNumber(null);
      setCalledNumbers([]);
      setWinners([]);
      setLatestWinner(null);
      setShowCelebration(false);
      setClaiming(null);

      setMessage("🎮 Game Started!");
    });

    socket.on("gameReset", () => {
      setGameStarted(false);
      setStartingGame(false);
      setCallingNumber(false);
      setCalledNumber(null);
      setCalledNumbers([]);
      setWinners([]);
      setLatestWinner(null);
      setShowCelebration(false);
      setClaiming(null);
      setTicket(null);

      setMessage(
        "🔄 New game ready!"
      );
    });

    socket.on(
      "numberCalled",
      (number: number) => {
        setCalledNumber(number);

        setCalledNumbers((previous) => {
          if (
            previous.includes(number)
          ) {
            return previous;
          }

          return [
            ...previous,
            number,
          ];
        });

        setCallingNumber(false);
      }
    );

    socket.on(
      "winClaimed",
      (winner: Winner) => {
        setWinners((previous) => {
          if (
            previous.some(
              (item) =>
                item.type === winner.type
            )
          ) {
            return previous;
          }

          return [
            ...previous,
            winner,
          ];
        });

        setLatestWinner(winner);
        setShowCelebration(true);
        setClaiming(null);

        setMessage(
          `🏆 ${winner.playerName} won ${winner.type}!`
        );

        setTimeout(() => {
          setShowCelebration(false);
        }, 5000);
      }
    );

    socket.on(
      "gameCompleted",
      () => {
        setGameStarted(false);
        setCallingNumber(false);

        setMessage(
          "🏁 Game Completed!"
        );

        setShowCelebration(true);
      }
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  const clearRoomState = () => {
    setRoomCode("");
    setJoinCode("");
    setPlayers([]);
    setHostId("");
    setGameStarted(false);
    setStartingGame(false);
    setCallingNumber(false);
    setCalledNumber(null);
    setCalledNumbers([]);
    setTicket(null);
    setClaiming(null);
    setWinners([]);
    setLatestWinner(null);
    setShowCelebration(false);
    setMode("home");
  };

  const createRoom = () => {
    const socket = socketRef.current;

    if (
      !socket ||
      !socket.connected
    ) {
      setMessage(
        "Server is not connected."
      );
      return;
    }

    if (!playerName.trim()) {
      setMessage(
        "Enter your name first."
      );
      return;
    }

    socket.emit(
      "createRoom",
      {
        playerName:
          playerName.trim(),
      },
      (response: any) => {
        if (!response?.success) {
          setMessage(
            response?.message ||
              "Unable to create room."
          );
          return;
        }

        setRoomCode(
          response.roomCode
        );

        setHostId(
          response.hostId
        );

        setPlayers(
          response.players || []
        );

        setMode("room");

        setMessage(
          `🎉 Room ${response.roomCode} created`
        );
      }
    );
  };

  const joinRoom = () => {
    const socket = socketRef.current;

    if (
      !socket ||
      !socket.connected
    ) {
      setMessage(
        "Server is not connected."
      );
      return;
    }

    if (!playerName.trim()) {
      setMessage(
        "Enter your name first."
      );
      return;
    }

    if (!joinCode.trim()) {
      setMessage(
        "Enter room code."
      );
      return;
    }

    socket.emit(
      "joinRoom",
      {
        roomCode:
          joinCode
            .trim()
            .toUpperCase(),

        playerName:
          playerName.trim(),
      },
      (response: any) => {
        if (!response?.success) {
          setMessage(
            response?.message ||
              "Unable to join room."
          );
          return;
        }

        setRoomCode(
          response.roomCode
        );

        setHostId(
          response.hostId
        );

        setPlayers(
          response.players || []
        );

        setMode("room");

        setMessage(
          "✅ Joined room"
        );
      }
    );
  };

  const startGame = () => {
    const socket = socketRef.current;

    if (
      !socket ||
      !socket.connected
    ) {
      return;
    }

    setStartingGame(true);

    socket.emit(
      "startGame",
      (response: ServerResponse) => {
        setStartingGame(false);

        if (!response.success) {
          setMessage(
            response.message ||
              "Unable to start game."
          );
        }
      }
    );
  };

  const callNumber = () => {
    const socket = socketRef.current;

    if (
      !socket ||
      !socket.connected ||
      !isHost
    ) {
      return;
    }

    setCallingNumber(true);

    socket.emit(
      "callNumber",
      (response: ServerResponse) => {
        if (!response.success) {
          setCallingNumber(false);

          setMessage(
            response.message ||
              "Unable to call number."
          );
        }
      }
    );
  };

  const claimWin = (
    type: string
  ) => {
    const socket = socketRef.current;

    if (
      !socket ||
      !socket.connected
    ) {
      return;
    }

    if (!ticket) {
      setMessage(
        "Ticket not ready."
      );
      return;
    }

    setClaiming(type);

    socket.emit(
      "claimWin",
      {
        type,
        ticket,
      },
      (response: ServerResponse) => {
        setClaiming(null);

        if (!response.success) {
          setMessage(
            response.message ||
              "Claim rejected."
          );
        }
      }
    );
  };

  const leaveRoom = () => {
    const socket =
      socketRef.current;

    if (
      !socket ||
      !socket.connected
    ) {
      return;
    }

    setMessage(
      "🚪 Leaving room..."
    );

    socket.emit(
      "leaveRoom",
      (response: ServerResponse) => {
        if (!response.success) {
          setMessage(
            response.message ||
              "Unable to leave room."
          );
          return;
        }

        clearRoomState();

        setMessage(
          "🚪 You left the room."
        );
      }
    );
  };

  const resetGame = () => {
    const socket =
      socketRef.current;

    if (
      !socket ||
      !socket.connected ||
      !isHost
    ) {
      return;
    }

    socket.emit(
      "resetGame",
      (response: ServerResponse) => {
        if (!response.success) {
          setMessage(
            response.message ||
              "Unable to reset game."
          );
        }
      }
    );
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(
        roomCode
      );

      setMessage(
        "📋 Room code copied!"
      );
    } catch {
      setMessage(
        "Unable to copy room code."
      );
    }
  };

  const getWinner = (
    type: string
  ) => {
    return winners.find(
      (winner) =>
        winner.type === type
    );
  };

  if (mode === "home") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#172554,#020617_60%)] px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl">

          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-4xl shadow-2xl shadow-blue-900/50">
              🎟️
            </div>

            <h1 className="text-5xl font-black tracking-tight md:text-7xl">
              HOUSIE
            </h1>

            <p className="mt-3 text-lg text-slate-400">
              Multiplayer Tambola Experience
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connected
                    ? "bg-emerald-400"
                    : "bg-red-400"
                }`}
              />

              {connected
                ? "Server Online"
                : "Server Offline"}
            </div>
          </div>

          <div className="mx-auto max-w-lg rounded-3xl border border-slate-700 bg-slate-900/90 p-7 shadow-2xl">

            <label className="mb-2 block text-sm font-bold text-slate-300">
              Player Name
            </label>

            <input
              value={playerName}
              onChange={(e) =>
                setPlayerName(
                  e.target.value
                )
              }
              placeholder="Enter your name"
              className="mb-5 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-4 text-white outline-none transition focus:border-blue-500"
            />

            <button
              type="button"
              onClick={createRoom}
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-black shadow-lg shadow-blue-900/30 transition hover:bg-blue-500"
            >
              🎮 CREATE ROOM
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-700" />

              <span className="text-xs font-bold text-slate-500">
                OR
              </span>

              <div className="h-px flex-1 bg-slate-700" />
            </div>

            <input
              value={joinCode}
              onChange={(e) =>
                setJoinCode(
                  e.target.value.toUpperCase()
                )
              }
              placeholder="ROOM CODE"
              className="mb-3 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-4 text-center font-black uppercase tracking-[0.3em] text-white outline-none focus:border-emerald-500"
            />

            <button
              type="button"
              onClick={joinRoom}
              className="w-full rounded-2xl bg-emerald-600 px-5 py-4 font-black transition hover:bg-emerald-500"
            >
              🚪 JOIN ROOM
            </button>

            {message && (
              <p className="mt-5 text-center text-sm font-bold text-slate-300">
                {message}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#172554,#020617_65%)] px-3 py-4 text-white md:px-6 md:py-6">

      {/* WINNER CELEBRATION */}

      {showCelebration &&
        latestWinner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-yellow-400/30 bg-slate-900 p-8 text-center shadow-2xl">

              <div className="absolute left-0 top-0 h-2 w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400" />

              <div className="mb-5 text-7xl animate-bounce">
                🏆
              </div>

              <p className="text-sm font-black uppercase tracking-[0.3em] text-yellow-400">
                Winner
              </p>

              <h2 className="mt-3 text-4xl font-black">
                {latestWinner.playerName}
              </h2>

              <p className="mt-3 text-xl font-bold text-emerald-400">
                {latestWinner.type}
              </p>

              <p className="mt-5 text-sm text-slate-400">
                Congratulations! 🎉
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowCelebration(false)
                }
                className="mt-6 rounded-xl bg-yellow-500 px-8 py-3 font-black text-slate-950 hover:bg-yellow-400"
              >
                CONTINUE
              </button>
            </div>
          </div>
        )}

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <header className="mb-5 rounded-3xl border border-slate-700 bg-slate-900/90 p-5 shadow-2xl">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl">
                  🎟️
                </div>

                <div>
                  <h1 className="text-2xl font-black">
                    HOUSIE
                  </h1>

                  <p className="text-xs font-semibold text-slate-500">
                    Multiplayer Game
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                  ROOM:{" "}
                  <span className="text-white">
                    {roomCode}
                  </span>
                </span>

                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  ● {connected
                    ? "ONLINE"
                    : "OFFLINE"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyRoomCode}
                className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-black hover:bg-slate-600"
              >
                📋 COPY CODE
              </button>

              <button
                type="button"
                onClick={leaveRoom}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black hover:bg-red-500"
              >
                🚪 LEAVE
              </button>
            </div>
          </div>
        </header>

        {message && (
          <div className="mb-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-center text-sm font-bold text-blue-300">
            {message}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_310px]">

          <section className="space-y-5">

            {/* GAME CONTROL */}

            <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 shadow-2xl">

              <div className="grid gap-5 md:grid-cols-[220px_1fr]">

                <div className="flex flex-col items-center justify-center">

                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Last Called
                  </p>

                  <div className="mt-3 flex h-36 w-36 items-center justify-center rounded-full border-8 border-blue-500/20 bg-blue-600 text-6xl font-black shadow-2xl shadow-blue-900/40">
                    {calledNumber ?? "—"}
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-500">
                    {calledNumbers.length} / 90 numbers called
                  </p>
                </div>

                <div className="flex flex-col justify-center">

                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Game Status
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    {gameStarted
                      ? "GAME RUNNING"
                      : "WAITING"}
                  </h2>

                  <div className="mt-3">
                    {gameStarted ? (
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">
                        🟢 LIVE GAME
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-400">
                        🟡 WAITING FOR HOST
                      </span>
                    )}
                  </div>

                  {isHost && (
                    <div className="mt-6 flex flex-wrap gap-3">

                      {!gameStarted && (
                        <button
                          type="button"
                          onClick={startGame}
                          disabled={startingGame}
                          className="rounded-2xl bg-emerald-600 px-6 py-3 font-black hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {startingGame
                            ? "STARTING..."
                            : "▶ START GAME"}
                        </button>
                      )}

                      {gameStarted && (
                        <button
                          type="button"
                          onClick={callNumber}
                          disabled={callingNumber}
                          className="rounded-2xl bg-blue-600 px-6 py-3 font-black hover:bg-blue-500 disabled:opacity-50"
                        >
                          {callingNumber
                            ? "CALLING..."
                            : "🔢 CALL NUMBER"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={resetGame}
                        className="rounded-2xl bg-purple-600 px-6 py-3 font-black hover:bg-purple-500"
                      >
                        🔄 NEW GAME
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* TICKET */}

            <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 shadow-2xl">
              <HousieTicket
                calledNumber={
                  calledNumber
                }
                onTicketReady={
                  setTicket
                }
              />
            </div>

            {/* WINNING ZONE */}

            <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 shadow-2xl">

              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Winning Zone
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  🏆 Claim Your Prize
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

                {winningTypes.map(
                  (type) => {
                    const winner =
                      getWinner(type);

                    return (
                      <div
                        key={type}
                        className={`rounded-2xl border p-4 transition ${
                          winner
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : "border-slate-700 bg-slate-800"
                        }`}
                      >
                        <p className="font-black">
                          {type}
                        </p>

                        {winner ? (
                          <div className="mt-3">
                            <p className="text-xs font-bold text-slate-500">
                              WINNER
                            </p>

                            <p className="mt-1 font-black text-emerald-400">
                              🏆{" "}
                              {winner.playerName}
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              claimWin(type)
                            }
                            disabled={
                              !gameStarted ||
                              claiming === type
                            }
                            className="mt-4 w-full rounded-xl bg-yellow-500 px-3 py-2.5 text-sm font-black text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            {claiming ===
                            type
                              ? "CHECKING..."
                              : "CLAIM WIN"}
                          </button>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* NUMBER BOARD */}

            <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 shadow-2xl">

              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Number Board
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  🔢 1 — 90
                </h2>
              </div>

              <div className="grid grid-cols-10 gap-2 sm:grid-cols-15">

                {Array.from(
                  { length: 90 },
                  (_, index) =>
                    index + 1
                ).map(
                  (number) => {
                    const called =
                      calledNumbers.includes(
                        number
                      );

                    return (
                      <div
                        key={number}
                        className={`flex aspect-square items-center justify-center rounded-xl text-xs font-black transition ${
                          called
                            ? "scale-105 bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {number}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          {/* PLAYERS */}

          <aside className="h-fit rounded-3xl border border-slate-700 bg-slate-900/90 p-5 shadow-2xl lg:sticky lg:top-5">

            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Room Players
              </p>

              <h2 className="mt-1 text-2xl font-black">
                👥 {players.length} Players
              </h2>
            </div>

            <div className="space-y-2">
              {players.map(
                (player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700 text-sm font-black">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {player.name}
                      </p>

                      {player.id ===
                        socketId && (
                        <p className="text-[10px] font-bold text-blue-400">
                          YOU
                        </p>
                      )}
                    </div>

                    {player.id ===
                      hostId && (
                      <span className="text-lg">
                        👑
                      </span>
                    )}
                  </div>
                )
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-xs font-black text-slate-500">
                HOST
              </p>

              <p className="mt-1 font-black">
                {players.find(
                  (player) =>
                    player.id ===
                    hostId
                )?.name ||
                  "Unknown"}
              </p>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-xs font-black text-slate-500">
                GAME
              </p>

              <p className="mt-1 font-black">
                {gameStarted
                  ? "🟢 Running"
                  : "🟡 Waiting"}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
