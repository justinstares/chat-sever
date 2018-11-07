// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function (request, response) {
  if (request.url === "/style.css") {
    fs.readFile("style.css", function(err, data){
      if (err) return response.writeHead(500);
      response.writeHead(200, {"Content-Type": "text/css"});
      response.end(data);
    })
  }
  else {
    response.writeHead(200, {"Content-Type": "text/html"});
    fs.readFile("client.html", function(err, data){
      if(err) return response.writeHead(500);
      response.writeHead(200);
      response.end(data);
    });
  }
})
app.listen(3456);

// Do the Socket.IO magic:
var users = ["admin"];
var rooms = ["public1", "public2"];
var usersInRoom = [""];
//var privateRoomList = ["private1", "private2"];

var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.

	socket.on('message_to_server', function(data){
		// This callback runs when the server receives a new message from the client.
    console.log("message: "+data["message"]); // log it to the Node.JS output
    console.log("user test!: "+data["username"]);
    console.log("currentroom: "+data["currentroom"]);
    io.sockets.to(data["currentroom"]).emit("message_to_client",{message:data["message"], username:data["username"], currentroom:data["currentroom"] }) // broadcast the message to other users
	});

  socket.on('login_success', function(data){
    // This callback runs when the server receives a new message from the client.
    //from stack. checks if username is already in the users arrau
    if (users.indexOf(data["username"]) > -1) {
    //username exists already
    //maybe emit something in future
    } else {
    //Not in the array
    users.push(data["username"]);
    }
    console.log("username: "+ data["username"]); // log it to the Node.JS output
    io.sockets.emit("login_info",{username:data["username"], usersArray:users, roomsArray:rooms}) // broadcast the message to other users
  });
  socket.on('logout_success', function(data){
    // This callback runs when the server receives a new message from the client.
    //from stack. checks if username is already in the users arrau

    for (var i=users.length-1; i>=0; i--) {
      if (users[i] === data["username"]) {
        users.splice(i, 1);
      }
    }

    console.log("username deleted: "+ data["username"]); // log it to the Node.JS output
    io.sockets.emit("logout_info",{username:data["username"], usersArray:users, roomsArray:rooms}) // broadcast the message to other users
  });
  socket.on('room_create', function(data){
    // This callback runs when the server receives a new message from the client.

    if (rooms.indexOf(data["newroom"]) > -1) {
    //room exists already
    //maybe emit something in future
    } else {
    //Not in the array
    rooms.push(data["newroom"]);
    }
    console.log(socket.id);
    console.log("test: " + data["username"]);
    console.log("newroom: "+ data["newroom"]); // log it to the Node.JS output
    io.sockets.emit("newroom_info",{newroom:data["newroom"], roomsArray:rooms, username:data["username"]}) // broadcast the message to other users
  });
  socket.on('room_access', function(data){
    // This callback runs when the server receives a new message from the client.
    console.log("made it here");
    if (rooms.indexOf(data["room"]) > -1) {
    // //room exists
    // //maybe emit something in future
    socket.join(data["room"]);
    usersInRoom.push(data["username"]);
    console.log(usersInRoom);
    io.sockets.to(data["room"]).emit("room_joined",{room:data["room"], username:data["username"], usersInRoomArray:usersInRoom })
    //
    console.log("room exists")
    } else {
    // //Not in the array
    console.log("does not exist!");
    io.sockets.emit("room_dne",{room:data["room"] }) // broadcast the message to other users

    }
    // console.log("room: "+ data["room"]); // log it to the Node.JS output
    // io.sockets.emit("room_info",{room:data["room"] }) // broadcast the message to other users
  });
  socket.on('room_leave', function(data){
    // This callback runs when the server receives a new message from the client.
    for (var i=usersInRoom.length-1; i>=0; i--) {
      if (usersInRoom[i] === data["username"]) {
        usersInRoom.splice(i, 1);
      }
    }
    io.sockets.to(data["currentroom"]).emit("room_left_message",{username:data["username"], currentroom:data["currentroom"] }) // broadcast the message to other users
    //emit an update users function?
    socket.leave(data["currentroom"]);
    io.sockets.emit("room_left_message2",{username:data["username"], currentroom:data["currentroom"] }) // broadcast the message to other users


  });
});
