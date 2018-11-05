// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.

	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.

		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);

// Do the Socket.IO magic:
var users = ["admin"];
var rooms = ["public1", "public2"];
//var privateRoomList = ["private1", "private2"];

var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.

	socket.on('message_to_server', function(data){
		// This callback runs when the server receives a new message from the client.
    console.log("message: "+data["message"]); // log it to the Node.JS output
    console.log("user test!: "+data["username"]);
    io.sockets.emit("message_to_client",{message:data["message"], username:data["username"] }) // broadcast the message to other users
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

    if (rooms.indexOf(data["room"]) > -1) {
    //room exists
    //maybe emit something in future




    } else {
    //Not in the array
    alert("error this room doesnt exist!");
    }
    console.log("room: "+ data["room"]); // log it to the Node.JS output
    io.sockets.emit("room_info",{room:data["room"] }) // broadcast the message to other users
  });
});
