#!/usr/bin/env node

var socketio	= require('socket.io');
var http	= require('http');
var path 	= require('path');
var express	= require('express');

var debug = true;

//==========================================================
// Set default IP and used ports
//==========================================================
var IP = '127.0.0.1';
var HTTP_PORT = 1337;
var BAUDRATE = 57600;
var ARDUINO = "/dev/tty.usbmodemfa131";

var app = express();
app.use(express.static(__dirname));


//==========================================================
// Create http server
// Set up paths to identify different devices
// Attach socket.io
//==========================================================
var server = http.createServer(app);
server.listen(HTTP_PORT);
// if(debug){
var io = socketio.listen(server);
//var io = socketio.listen(server, {'log level': 1});
// }else{
//	socketio = socketio.listen(server, {log: false});
//}

if(debug) console.log("server listening at port " + HTTP_PORT); 

//==========================================================
// Create Socket.io instance
// Set up eventhandlers
//==========================================================
var isConnected = false;
var connectedSocket = '';
io.sockets.on('connection', function (socket) {
  if(debug) console.log("a user connected");

	connectedSocket = socket;
	isConnected = true;
	
	socket.emit('connected', '');

	socket.on('getPing', function(data) {
		if(debug) console.log("socket trigger 'getPing' >> data: ", data);

    // '2' will be the code for sending back the current internal counter value
//    serialPort.write("2");
	});

  socket.on('setLed', function(data) {
    if(debug) console.log("socket trigger 'setLed' >> data: ", data);

    // 'data' should be either '1' or '0'.
    // TODO check here if 'data' contains the correct content before blindly sending this off
//    serialPort.write(data);
  });

	//==========================================================
	// Device disconnected
	//==========================================================
	io.sockets.on('disconnect', function () {
		var numRemaining = Object.keys(connection.manager.roomClients).length - 1;
		if(debug) console.log("Disconnected " + connection.id);
		if (numRemaining < 1) {
			connectedSocket = null;
			isConnected = false;
			if(debug) console.log("all clients disconnected");
		}
	});
});


//==========================================================
// Handle how Node exits 
//==========================================================
process.on('exit', function(){
  if(debug) console.log("exit handler");
  serialPort.close();
});
process.on('SIGINT', function () {
  process.exit();
});
