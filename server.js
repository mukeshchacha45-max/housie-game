const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

function generateRoomCode() {
  let code;

  do {
    code = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
  } while (rooms[code]);

  return code;
}

function getRoomBySocket(socketId) {
  for (const roomCode of Object.keys(rooms)) {
    const room = rooms[roomCode];

    if (
      room.players.some(
        (player) =>
          player.id === socketId
      )
    ) {
      return {
        roomCode,
        room,
      };
    }
  }

  return null;
}

function sendPlayers(roomCode) {
  const room = rooms[roomCode];

  if (!room) return;

  io.to(roomCode).emit(
    "playersUpdated",
    room.players
  );
}

function checkWinningClaim(
  type,
  ticket,
  calledNumbers
) {
  if (!Array.isArray(ticket)) {
    return false;
  }

  const called =
    new Set(calledNumbers);

  const numbers = ticket
    .flat()
    .filter(
      (number) =>
        typeof number === "number"
    );

  if (type === "Early 5") {
    return (
      numbers.filter((number) =>
        called.has(number)
      ).length >= 5
    );
  }

  if (
    type === "Top Line" ||
    type === "Middle Line" ||
    type === "Bottom Line"
  ) {
    let rowIndex = 0;

    if (type === "Middle Line") {
      rowIndex = 1;
    }

    if (type === "Bottom Line") {
      rowIndex = 2;
    }

    const row =
      ticket[rowIndex];

    if (!row) return false;

    return row
      .filter(
        (number) =>
          typeof number === "number"
      )
      .every((number) =>
        called.has(number)
      );
  }

  if (type === "Full House") {
    return numbers.every(
      (number) =>
        called.has(number)
    );
  }

  return false;
}

function completeGame(roomCode) {
  const room = rooms[roomCode];

  if (!room) return;

  room.gameStarted = false;

  io.to(roomCode).emit(
    "gameCompleted"
  );

  console.log(
    `🏁 Game completed in ${roomCode}`
  );
}

io.on("connection", (socket) => {
  console.log(
    `Client connected: ${socket.id}`
  );

  socket.on(
    "createRoom",
    (data, callback) => {
      const playerName =
        data?.playerName?.trim();

      if (!playerName) {
        callback?.({
          success: false,
          message:
            "Player name is required.",
        });

        return;
      }

      const roomCode =
        generateRoomCode();

      rooms[roomCode] = {
        host: socket.id,

        players: [
          {
            id: socket.id,
            name: playerName,
          },
        ],

        gameStarted: false,

        calledNumbers: [],

        winners: {},
      };

      socket.join(roomCode);

      callback?.({
        success: true,
        roomCode,
        hostId: socket.id,
        players:
          rooms[roomCode].players,
      });

      console.log(
        `Room ${roomCode} created`
      );
    }
  );

  socket.on(
    "joinRoom",
    (data, callback) => {
      const roomCode =
        data?.roomCode
          ?.trim()
          .toUpperCase();

      const playerName =
        data?.playerName?.trim();

      if (!roomCode || !playerName) {
        callback?.({
          success: false,
          message:
            "Room code and player name are required.",
        });

        return;
      }

      const room =
        rooms[roomCode];

      if (!room) {
        callback?.({
          success: false,
          message:
            "Room not found.",
        });

        return;
      }

      if (room.gameStarted) {
        callback?.({
          success: false,
          message:
            "Game has already started.",
        });

        return;
      }

      if (room.players.length >= 15) {
        callback?.({
          success: false,
          message:
            "Room is full.",
        });

        return;
      }

      room.players.push({
        id: socket.id,
        name: playerName,
      });

      socket.join(roomCode);

      callback?.({
        success: true,
        roomCode,
        hostId: room.host,
        players: room.players,
      });

      sendPlayers(roomCode);

      console.log(
        `${playerName} joined ${roomCode}`
      );
    }
  );

  socket.on(
    "startGame",
    (callback) => {
      const result =
        getRoomBySocket(
          socket.id
        );

      if (!result) {
        callback?.({
          success: false,
          message:
            "You are not inside a room.",
        });

        return;
      }

      const {
        roomCode,
        room,
      } = result;

      if (
        room.host !==
        socket.id
      ) {
        callback?.({
          success: false,
          message:
            "Only host can start the game.",
        });

        return;
      }

      room.gameStarted = true;
      room.calledNumbers = [];
      room.winners = {};

      io.to(roomCode).emit(
        "gameStarted"
      );

      callback?.({
        success: true,
      });

      console.log(
        `🎮 Game started in ${roomCode}`
      );
    }
  );

  socket.on(
    "callNumber",
    (callback) => {
      const result =
        getRoomBySocket(
          socket.id
        );

      if (!result) {
        callback?.({
          success: false,
          message:
            "You are not inside a room.",
        });

        return;
      }

      const {
        roomCode,
        room,
      } = result;

      if (
        room.host !==
        socket.id
      ) {
        callback?.({
          success: false,
          message:
            "Only host can call numbers.",
        });

        return;
      }

      if (!room.gameStarted) {
        callback?.({
          success: false,
          message:
            "Game has not started.",
        });

        return;
      }

      if (
        room.calledNumbers.length >=
        90
      ) {
        callback?.({
          success: false,
          message:
            "All 90 numbers have been called.",
        });

        completeGame(roomCode);

        return;
      }

      let number;

      do {
        number =
          Math.floor(
            Math.random() * 90
          ) + 1;
      } while (
        room.calledNumbers.includes(
          number
        )
      );

      room.calledNumbers.push(
        number
      );

      io.to(roomCode).emit(
        "numberCalled",
        number
      );

      callback?.({
        success: true,
        number,
      });

      console.log(
        `🔢 ${number} called in ${roomCode}`
      );

      if (
        room.calledNumbers.length ===
        90
      ) {
        completeGame(roomCode);
      }
    }
  );

  socket.on(
    "claimWin",
    (data, callback) => {
      const result =
        getRoomBySocket(
          socket.id
        );

      if (!result) {
        callback?.({
          success: false,
          message:
            "You are not inside a room.",
        });

        return;
      }

      const {
        roomCode,
        room,
      } = result;

      if (!room.gameStarted) {
        callback?.({
          success: false,
          message:
            "Game is not running.",
        });

        return;
      }

      const type =
        data?.type;

      const ticket =
        data?.ticket;

      const allowedTypes = [
        "Early 5",
        "Top Line",
        "Middle Line",
        "Bottom Line",
        "Full House",
      ];

      if (
        !allowedTypes.includes(
          type
        )
      ) {
        callback?.({
          success: false,
          message:
            "Invalid winning type.",
        });

        return;
      }

      if (room.winners[type]) {
        callback?.({
          success: false,
          message:
            `${type} already has a winner.`,
        });

        return;
      }

      const valid =
        checkWinningClaim(
          type,
          ticket,
          room.calledNumbers
        );

      if (!valid) {
        callback?.({
          success: false,
          message:
            "Claim is not valid yet.",
        });

        return;
      }

      const player =
        room.players.find(
          (item) =>
            item.id ===
            socket.id
        );

      if (!player) {
        callback?.({
          success: false,
          message:
            "Player not found.",
        });

        return;
      }

      const winner = {
        type,
        playerId:
          socket.id,
        playerName:
          player.name,
      };

      room.winners[type] =
        winner;

      io.to(roomCode).emit(
        "winClaimed",
        winner
      );

      callback?.({
        success: true,
      });

      console.log(
        `🏆 ${player.name} won ${type} in ${roomCode}`
      );

      /*
       * FULL HOUSE = GAME COMPLETE
       */
      if (
        type === "Full House"
      ) {
        setTimeout(() => {
          completeGame(
            roomCode
          );
        }, 700);

        return;
      }

      /*
       * If all five winning
       * categories are completed,
       * automatically finish game.
       */

      const totalWinners =
        Object.keys(
          room.winners
        ).length;

      if (totalWinners >= 5) {
        setTimeout(() => {
          completeGame(
            roomCode
          );
        }, 700);
      }
    }
  );

  socket.on(
    "leaveRoom",
    (callback) => {
      console.log(
        "LEAVE ROOM EVENT RECEIVED:",
        socket.id
      );

      const result =
        getRoomBySocket(
          socket.id
        );

      if (!result) {
        callback?.({
          success: false,
          message:
            "You are not inside a room.",
        });

        return;
      }

      const {
        roomCode,
        room,
      } = result;

      const wasHost =
        room.host ===
        socket.id;

      room.players =
        room.players.filter(
          (player) =>
            player.id !==
            socket.id
        );

      socket.leave(roomCode);

      if (
        room.players.length ===
        0
      ) {
        delete rooms[roomCode];

        callback?.({
          success: true,
        });

        console.log(
          `Room ${roomCode} deleted`
        );

        return;
      }

      if (wasHost) {
        room.host =
          room.players[0].id;

        io.to(roomCode).emit(
          "hostChanged",
          room.host
        );
      }

      sendPlayers(roomCode);

      callback?.({
        success: true,
      });

      console.log(
        `Player ${socket.id} left ${roomCode}`
      );
    }
  );

  socket.on(
    "resetGame",
    (callback) => {
      console.log(
        "RESET GAME EVENT RECEIVED:",
        socket.id
      );

      const result =
        getRoomBySocket(
          socket.id
        );

      if (!result) {
        callback?.({
          success: false,
          message:
            "You are not inside a room.",
        });

        return;
      }

      const {
        roomCode,
        room,
      } = result;

      if (
        room.host !==
        socket.id
      ) {
        callback?.({
          success: false,
          message:
            "Only host can start a new game.",
        });

        return;
      }

      room.gameStarted =
        false;

      room.calledNumbers =
        [];

      room.winners = {};

      io.to(roomCode).emit(
        "gameReset"
      );

      callback?.({
        success: true,
      });

      console.log(
        `🔄 Game reset in ${roomCode}`
      );
    }
  );

  socket.on(
    "disconnect",
    () => {
      console.log(
        `Client disconnected: ${socket.id}`
      );

      const result =
        getRoomBySocket(
          socket.id
        );

      if (!result) return;

      const {
        roomCode,
        room,
      } = result;

      const wasHost =
        room.host ===
        socket.id;

      room.players =
        room.players.filter(
          (player) =>
            player.id !==
            socket.id
        );

      if (
        room.players.length ===
        0
      ) {
        delete rooms[roomCode];

        return;
      }

      if (wasHost) {
        room.host =
          room.players[0].id;

        io.to(roomCode).emit(
          "hostChanged",
          room.host
        );
      }

      sendPlayers(roomCode);
    }
  );
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "Housie backend is running.",
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
