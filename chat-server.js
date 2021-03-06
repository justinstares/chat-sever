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
//holds user and socket id
var users = {};
//holds room and creator of the room!
var rooms = {"public1": "", "public2": ""};
//holds private rooms and passwords
var privateRooms = {};
//holds all rooms and the useres with an array
var roomsList = {"public1":[], "public2":[]};
//holds room and array of bannes users
var bannedUsers = {"public1": [], "public2": []};



var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.

	socket.on('message_to_server', function(data){
		// This callback runs when the server receives a new message from the client.
    if(data["message"] == "/banned"){
    socket.emit("banned_users",{bannedUsersArray:bannedUsers, currentroom:data["currentroom"] })
    return;
    }
    if(data["message"] == "/activeusers"){
    socket.emit("active_users",{usersArray:users })
    return;
    }
    if(data["message"] == "/admin"){
    socket.emit("find_admin",{roomsArray:rooms, currentroom:data["currentroom"]})
    return;
    }
    io.sockets.to(data["currentroom"]).emit("message_to_client",{message:data["message"], username:data["username"], currentroom:data["currentroom"] }) // broadcast the message to other users
	});

  socket.on('login_success', function(data){
    //from stack. checks if username is already in the users arrau
    if (data["username"] in users) {
    //username exists already
    //maybe emit something in future
    } else {
    //Not in the array
    users[data["username"]] = data["userid"];
    }
    console.log("username: "+ data["username"]); // log it to the Node.JS output
    io.sockets.emit("login_info",{username:data["username"], usersArray:users, roomsLArray:roomsList}) // broadcast the message to other users
  });
  socket.on('logout_success', function(data){
    data['usersArray'][data["username"]] = "";
    console.log("username deleted: "+ data["username"]); // log it to the Node.JS output
    io.sockets.emit("logout_info",{username:data["username"], usersArray:users, roomsLArray:roomsList}) // broadcast the message to other users
  });
  socket.on('room_create', function(data){

    if (data["newroom"] in rooms) {
    //room exists already
    //maybe emit something in future
    } else {
    //Not in the array
    roomsList[data["newroom"]] = [];
    rooms[data["newroom"]] = data["username"];
    bannedUsers[data["newroom"]] = [];

    }
    console.log(socket.id);
    console.log("test: " + data["username"]);
    console.log("newroom: "+ data["newroom"]); // log it to the Node.JS output
    io.sockets.emit("newroom_info",{newroom:data["newroom"], roomsLArray:roomsList, username:data["username"]}) // broadcast the message to other users
  });
  socket.on('privateroom_create', function(data){

    if (data["newprivateroom"] in rooms) {
    //room exists already
    //maybe emit something in future
    } else {
    //Not in the array
    roomsList[data["newprivateroom"]] = [];
    privateRooms[data["newprivateroom"]] = [];
    privateRooms[data["newprivateroom"]].push(data["password"]);
    rooms[data["newprivateroom"]] = data["username"];
    bannedUsers[data["newprivateroom"]] = [];

    }
    io.sockets.emit("newroom_info",{newroom:data["newprivateroom"], roomsLArray:roomsList, username:data["username"], privateRoomsArray:privateRooms}) // broadcast the message to other users
  });
  socket.on('room_access', function(data){
    //banned user check
    if(bannedUsers[data["currentroom"]] != null){
      for (var i=bannedUsers[data["currentroom"]].length-1; i>=0; i--) {
        if(bannedUsers[data["currentroom"]][i] == data["username"]){
          socket.emit("permanent_ban",{currentroom:data["currentroom"] })
          return;
        }
      }
    }

    //private room check
    if (data["currentroom"] in privateRooms) {
      socket.emit("private_room_entry",{currentroom:data["currentroom"], username:data["username"], roomsLArray:roomsList, privateRoomsArray: privateRooms })
      console.log("attempt to enter private room");
      return;
    }

    //exists check
    if (data["currentroom"] in roomsList) {
        console.log("room exists")

        if (roomsList[data["currentroom"]].indexOf(data["username"]) > -1) {
        //already in room
        console.log("you have joined the room already!!");
        socket.emit("already_in_room",{currentroom:data["currentroom"] })

        } else {
        //Not in the room so add user to roomsList

          if(rooms[data["currentroom"]] == data["username"]){
          socket.emit("admin_confirmed",{currentroom:data["currentroom"], username:data["username"], roomsLArray:roomsList, admins:rooms })
          }
          roomsList[data["currentroom"]].push(data["username"]);
          socket.join(data["currentroom"]);
          io.sockets.to(data["currentroom"]).emit("room_joined",{currentroom:data["currentroom"], username:data["username"], roomsLArray:roomsList })
          socket.emit("room_joined2",{currentroom:data["currentroom"], username:data["username"], roomsLArray:roomsList })


        }

    } else {
      console.log("room does not exist!");
      socket.emit("room_dne",{currentroom:data["currentroom"] })
  }

  });
  socket.on('private_room_access', function(data){
    var check = false;
    for (var i=privateRooms[data["currentroom"]].length-1; i>=0; i--) {
      if (privateRooms[data["currentroom"]][i] === data["passwordAttempt"]) {
        roomsList[data["currentroom"]].push(data["username"]);
        socket.join(data["currentroom"]);
        if(rooms[data["currentroom"]] == data["username"]){
        socket.emit("admin_confirmed",{currentroom:data["currentroom"], username:data["username"], roomsLArray:roomsList, admins:rooms })
        }
        check = true;
      }
    }
    if(check == false){
    socket.emit("password_incorrect",{currentroom:data["currentroom"], username:data["username"], roomsLArray:roomsList })
    return;
    }
    io.sockets.to(data["currentroom"]).emit("room_joined",{currentroom:data["currentroom"], username:data["username"], roomsLArray:roomsList })
    socket.emit("room_joined2",{currentroom:data["currentroom"], username:data["username"], roomsLArray:roomsList })

  });
  socket.on('room_leave', function(data){
    for (var i=roomsList[data["currentroom"]].length-1; i>=0; i--) {
      if (roomsList[data["currentroom"]][i] === data["username"]) {
        roomsList[data["currentroom"]].splice(i, 1);
      }
    }
    //emit an update users function?
    socket.leave(data["currentroom"]);
    io.sockets.to(data["currentroom"]).emit("room_left_message",{username:data["username"], currentroom:data["currentroom"], roomsLArray:roomsList }) // broadcast the message to other users
    socket.emit("room_left_message2",{username:data["username"], currentroom:data["currentroom"] }) // broadcast the message to other users
  });
  socket.on('direct_message', function(data){
    var check2 = false;
    for (var i=roomsList[data["currentroom"]].length-1; i>=0; i--) {
      if (roomsList[data["currentroom"]][i] === data["username2"]) {
        io.sockets.to(users[data["username2"]]).emit("new_private_message",{username:data["username"], currentroom:data["currentroom"], message:data["message"], usersArray:users})
        check2 = true;
      }
    }
    if(check2 == false){
      socket.emit("user_dne",{username:data["username"], currentroom:data["currentroom"] }) // broadcast the message to other users
    }
  });
  socket.on('kick_user', function(data){
    var check3 = false;
    for (var i=roomsList[data["currentroom"]].length-1; i>=0; i--) {
      if (roomsList[data["currentroom"]][i] === data["kickedUser"]) {
        socket.to(users[data["kickedUser"]]).emit("kicked_alert",{username:data["username"], currentroom:data["currentroom"], kickedUser:data["kickedUser"]})
        check3 = true;
      }
    }
    if(check3 == false){
      socket.emit("user_dne",{username:data["username"], currentroom:data["currentroom"] }) // broadcast the message to other users
    }
  });
  socket.on('ban_user', function(data){
    var check4 = false;
    for (var i=roomsList[data["currentroom"]].length-1; i>=0; i--) {
      if (roomsList[data["currentroom"]][i] === data["bannedUser"]) {
        socket.to(users[data["bannedUser"]]).emit("banned_alert",{username:data["username"], currentroom:data["currentroom"], bannedUser:data["bannedUser"]})
        bannedUsers[data["currentroom"]].push(data["bannedUser"]);
        check4 = true;
      }
    }
    if(check4 == false){
      socket.emit("user_dne",{username:data["username"], currentroom:data["currentroom"] }) // broadcast the message to other users
    }
  });
	socket.on('new_admin', function(data){
		if (data["newAdmin"] in users) {
			rooms[data["currentroom"]] = data["newAdmin"];
			socket.emit("switch",{currentroom:data["currentroom"] }) // broadcast the message to other users
			socket.to(users[data["newAdmin"]]).emit("switch2",{currentroom:data["currentroom"] })
		}else{
			socket.emit("user_dne",{username:data["username"], currentroom:data["currentroom"] }) // broadcast the message to other users

		}

	});



});
