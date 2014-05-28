var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
  io = socketio.listen(server);
  io.set('log level', 2);

  io.sockets.on('connection', function (socket) {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
    joinRoom(socket, 'Lobby');

    handleMessageBroadcasting(socket, nickNames);
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    handleRoomJoining(socket);

    socket.on('rooms', function(){
      socket.emit('rooms', io.sockets.manager.rooms);
    });

    handleClientDisconnection(socket, nickNames, namesUsed);
  });

};


function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  var name = 'Guest' + guestNumber;
  nickNames[socket.id] = name;
  socket.emit('nameResult', {
    success : true,
    name : name
  });
  namesUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room) {
  var usersInRoom = io.sockets.clients(room);
  nickNamesInRoom = [];
  usersInRoom.forEach(function(s){
    nickNamesInRoom.push(nickNames[s.id]);
  });

  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', {room : room});
  socket.broadcast.to(room).emit('message', {
    text : nickNames[socket.id] + ' has joined ' + room + '.'
  });

  var usersInRoomSummary = 'Users currently in ' + room + ': ' + 
    nickNamesInRoom.join(', ') + '.';

  socket.emit('message', {text : usersInRoomSummary});

}

function handleMessageBroadcasting(socket, nickNames){
  socket.on('message', function(message){
    socket.broadcast.to(currentRoom[socket.id]).emit('message', {
      text : nickNames[socket.id] + ': ' + message.text
    });
  });
}

function handleNameChangeAttempts(socket, nickNames, namesUsed){
  socket.on('nameAttempt', function(name){
    console.log('nameAttempt: ' + name);
    if(name.indexOf('Guest') == 0) {
      socket.emit('nameResult', {
        success : false,
        message : 'Names cannot begin with "Guest".'
      });
    } else {
      if(namesUsed.indexOf(name) == -1) {
        var prevName = nickNames[socket.id];
        var prevNameIdx = namesUsed.indexOf(prevName);
        console.log('Previous name: ' + prevName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[prevNameIdx];
        console.log('Name change success');
        socket.emit('nameResult', {
          success : true, 
          name : name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text : prevName + ' is now known as ' + name + '.'
        });
      } else {
        socket.emit('nameResult', {
          success : false,
          message : 'Name "' +name+ '" is already in use.'
        })
      }
    }
  });
}

function handleRoomJoining(socket){
  socket.on('join', function(room){
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnection(socket, nickNames, namesUsed){
  socket.on('disconnect', function() {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}
