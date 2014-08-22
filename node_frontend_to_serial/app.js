#!/usr/bin/env node

var socketio	= require('socket.io');
var http	= require('http');
var path 	= require('path');
var serialport = require("serialport");
var express	= require('express');


var debug = true;

//==========================================================
// Set default IP and used ports
//==========================================================
var IP = '127.0.0.1';
var HTTP_PORT = 1337;
var BAUDRATE = 57600;
var ARDUINO = "";

//==========================================================
// Check out on which system we're running. Between OSX
// and Linux (ie Yun) we may take different approaches
//==========================================================
var OSX = 'osx';
var LINUX = 'linux';
var BASE_OS = '';
if (process.platform == 'darwin') {
  BASE_OS = OSX;    // OSX
}
if (process.platform == 'linux') {
  BASE_OS = LINUX;  // LINUX (and with that we're assuming it's the Yun)
}
if(debug) console.log("Detected system is " + BASE_OS);

if (BASE_OS == OSX)   ARDUINO = "/dev/tty.usbmodemfa141";
if (BASE_OS == LINUX) ARDUINO = "/dev/ttyATH0";

//==========================================================
// Initiate Express
// Don't do anything 'fancy' with renderers, just
// make it allow acces to this root folder as the root
// of the webserver
//==========================================================
var app = express();
app.use(express.static(__dirname));

//==========================================================
// Create http server
// Set up paths to identify different devices
// Attach socket.io
//==========================================================
var server = http.createServer(app);
server.listen(HTTP_PORT);
if(debug) console.log("server listening at port " + HTTP_PORT);

var io = socketio.listen(server);
if(!debug) io.set('log level', 0);



//==========================================================
// Create Serial Port
// Set up eventhandlers
//==========================================================
var serialConnected = false;
var SerialPort = serialport.SerialPort;
var serialPort = new SerialPort(ARDUINO, {
  baudrate: BAUDRATE,

  // this parser will only trigger an event after a \n (newline)
  parser: serialport.parsers.readline("\n")
}, function(error)
{
	// Failed opening port (no arduino found)
	console.error(error);
});
serialPort.on("open", function () {
  serialConnected = true;
  if(debug) console.log('Serial port opened >> system is ' + BASE_OS + ", portname '" + ARDUINO + "'");

  serialPort.on('data', function(data) {
    if(debug) console.log('serial data received: ' + data);
    if (data.split(" ")[0] == 'ping') {
      var count = data.split(" ")[1];
      console.log('	From arduino: ping count = ' + count);
      if (isConnected) {
        // alternative: io.sockets.emit()....
        connectedSocket.emit('pingBack', count);
      }

      var ledState = count % 2;
//      console.log('	ledState: ' + ledState);
      serialPort.write(ledState, function(err, results) {
        // console.log('err ' + err);
        // console.log('results ' + results);
      });
    } else {
      // console.log(data);
    }
  });

  // Test that serialport is working.
  // For now that entails requesting the Arduino's current ping count
  console.log("  Serial test >> writing a 1-byte buffer containing the number 33 to Arduino");
  var b = new Buffer(1);
  b[0] = 33;
  serialPort.write(b, function(err, results) {
    console.log('    err ' + err);
    console.log('    results ' + results);
  });
});


// this offset is so we don't accidentally send the number 10 or 13 (ascii LR and CR)
var LedNumberOffset = 32;

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

  socket.on('turnOn', function(data) {
    if(debug) console.log("turn on led ", data);

    var toSend = new Buffer(3);
    toSend[0] = 255;
    toSend[1] = data[0] + 32;
    toSend[2] = data[1] + 32;

    if (serialConnected) serialPort.write(toSend, function(err) {
      if (err) if(debug) console.log("serial write err: " + err);
    });
  });

  socket.on('turnOff', function(data) {
    if(debug) console.log("turn off led ", data);

    var toSend = new Buffer(3);
    toSend[0] = 254;
    toSend[1] = data[0] + 32;
    toSend[2] = data[1] + 32;

    if (serialConnected) serialPort.write(toSend, function(err) {
      if (err) if(debug) console.log("serial write err: " + err);
    });
  });


  socket.on('getPing', function(data) {
		if(debug) console.log("socket trigger 'getPing' >> data: ", data);

    // '2' will be the code for sending back the current internal counter value
    if(debug) console.log("requesting pingcount to Arduino >> serialConnected = " + serialConnected);
    if (serialConnected) serialPort.write("2");
	});

  socket.on('setLed', function(data) {
    if(debug) console.log("socket trigger 'setLed' >> data: ", data);

    // 'data' should be either '1' or '0'.
    // TODO check here if 'data' contains the correct content before blindly sending this off
    if (serialConnected) serialPort.write(data);
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
  if (debug) console.log("exit handler");
  if (serialConnected) {
    if (debug) console.log("  closing serial port..");
    serialPort.close();
  }
});
process.on('SIGINT', function () {
  process.exit();
});
