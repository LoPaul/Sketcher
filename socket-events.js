const v4 = require('uuid/v4');

let DEBUG = false;
const clients = {};

////////////////////////////////////////////
//             USER HELPERS               //
////////////////////////////////////////////

getCurrentUsers = (board) => {
  const currentUsers = [];
  for (let client in clients) {
    if (clients[client].boardId === board) {
      currentUsers.push({ [client]: clients[client] });
    }
  }
  return currentUsers;
}


////////////////////////////////////////////
//            CANVAS HELPERS              //
////////////////////////////////////////////

// update component history with incoming changes
// event-handler for new incoming connections
function updateboardHistory(boardHistory, changes) {
  history = boardHistory.find(each => each.id === changes.id);
  if (history) {
    history.left = changes.left;
    history.top = changes.top,
    history.height = changes.height;
    history.scaleX = changes.scaleX,
    history.scaleY = changes.scaleY,
    history.angle = changes.angle,
    history.text = changes.text
  }
}


// Export to server.js
module.exports = (io, boards) => {


  // SOCKET CONNECTION RECEIVED
  io.on('connection', function(socket) {
    console.log("client connected")

    const board = (socket.request.headers.referer).split('/').reverse()[0];
    socket.join(board);




  ////////////////////////////////////////////
  //              USER EVENTS               //
  ////////////////////////////////////////////

    const client = { id: v4(), boardId: board };
    clients[socket.id] = client;

    // Send connection message to client
    socket.emit('connected', {
      currentUsers: getCurrentUsers(board),
      data: boards.getBoard(board),
      notification: "You've successfully connected!"
    });

    // // Send connection message to other clients in the room
    // socket.to(board).emit('new connection', { currentUsers: getCurrentUsers(board), notification: "Someone has joined the room!" });

    socket.on('username selected', (username) => {
      clients[socket.id].name = username;
      io/*socket.broadcast.to(board)*/.emit('new connection', clients[socket.id]);
      // io/*socket.broadcast.to(board)*/.emit('new connection', getCurrentUsers(board));
      // console.log("username selected");
    });

    // Send disconnect message to everyone in the room
    socket.on('disconnect', (reason) => {
      delete clients[socket.id];
      io.in(board).emit('user disconnected', { disconnectedUser: socket.id, currentUsers: getCurrentUsers(board), notification: "Someone has left the room!" });
      // console.log("client disconnected")
    });
    // console.log(socket.id, board);
    // socket.broadcast.emit('user connected', socket.id);


  ////////////////////////////////////////////
  //             CAVAS EVENTS               //
  ////////////////////////////////////////////

    if (DEBUG) console.log(boards);
    // console.log("SOCKET", socket);

    var boardHistory = boards.getBoardHistory(board);


    function removeFromHistory(boardHistory, data) {

      return boardHistory.filter(each => each.id !== data.id)
    }

    // first send the history to the new client
    for (let data of boardHistory) {
      socket.emit('create_component', data);
    }

    // add handler for broadcast new component
    socket.on('create_component', function(objectData) {
      boardHistory = boards.getBoardHistory(board).push(objectData);
      boards.updateBoard(board, objectData, boardHistory);
      socket.to(board).emit('create_component', objectData);
    });

    // broadcast movements without saving to db
    socket.on('modify_component', function(objectData) {
      boardHistory = boards.getBoardHistory(board);
      updateboardHistory(boardHistory, objectData);
      socket.to(board).emit('modify_component', objectData);
    });

    // broadcast and update db when movement has stopped
    socket.on('modified_component', function(objectData) {
      boardHistory = boards.getBoardHistory(board);
      updateboardHistory(boardHistory, objectData);
      boards.updateBoard(board, objectData, boardHistory);
      socket.to(board).emit('modify_component', objectData);
    });

    // // TODO: REMOVE OBJECT FROM MEMORY AND DATABASE
    // // Remember to use a separate function for this... (not updateBoard)?
    socket.on('remove_component', function(objectData) {
      boardHistory = boards.getBoardHistory(board);
      boardHistory = boardHistory.filter(each => each.id !== objectData.id)
      boardHistory = removeFromHistory(boardHistory, objectData);
      boards.deleteBoardHistory(board, objectData, boardHistory);

      socket.to(board).emit('remove_component', objectData);
    });

    socket.on('path_created', function(objectData) {
      boardHistory = boards.getBoardHistory(board).push(objectData);
      boards.updateBoard(board, objectData, boardHistory);
      socket.to(board).emit('path_created', objectData);
    });

    socket.on('elevate_component', function(objectData) {
      socket.to(board).emit('elevate_component', objectData);
    });

    socket.on('user_position', function(objectData) {
      socket.to(board).emit('user_position', objectData);
    });
  });

  
}
