#!/usr/bin/env node

var http	= require('http');
var socketio	= require('socket.io');
var path 	= require('path');
var serialport = require("serialport");
var express	= require('express');

var debug = true;

//==========================================================
// Set default IP and used ports
//==========================================================
var IP = '127.0.0.1'; // used.. where?
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

if (BASE_OS == OSX)   ARDUINO = "/dev/tty.usbmodemfa141"; // Uno
//if (BASE_OS == OSX)   ARDUINO = "/dev/tty.usbserial-A600eBhm"; // Duemilanove
if (BASE_OS == LINUX) ARDUINO = "/dev/ttyATH0";

// this offset will me employed when sending serial data as a way to avoid accidentally sending the number 10 or 13 (ascii LF and CR)
var VALUES_OFFSET = 32;

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
//var io = socketio(server);
if(!debug) io.set('log level', 0);



//==========================================================
// Create Serial Port
// Set up eventhandlers
//==========================================================
var serialConnected = false;
var SerialPort = serialport.SerialPort;
var serialPort = "";
function startSerial(callback) {
  if(debug) console.log("f:startSerial >> opening serial port");

  // open serial port
  serialPort = new SerialPort(ARDUINO, {
    baudrate: BAUDRATE,

    // this parser will only trigger an event after a \n (newline)
    parser: serialport.parsers.readline("\n")
  }, function(error)
  {
    // Failed opening port (no arduino found)
    console.error(error);
  });
  if (callback != null) callback();

  // event handlers
  serialPort.on("open", function () {
    if(debug) console.log('Serial port opened >> system is ' + BASE_OS + ", portname '" + ARDUINO + "'");
    serialConnected = true;

    doArduinoHandshake();

    serialPort.on('data', function(data) {
      if(debug) console.log('serial data received: ' + data);
    });
  });
}
startSerial();


//==========================================================
// Start a handshake to the Arduino
//==========================================================
function doArduinoHandshake() {

  var toSend = new Buffer(6);
  toSend[0] = 250;                      // handshake var 1
  toSend[1] = 230;                      // handshake var 2
  toSend[2] = 210;                      // handshake var 3
  toSend[3] = 250;
  toSend[4] = 230;
  toSend[5] = 210;

  sendToArduino(toSend);
}


//==========================================================
// Send a Buffer object to Arduino via serial connection
//==========================================================
function sendToArduino(buffer) {
//  if(debug) console.log("f:sendToArduino()");

  if (serialConnected) serialPort.write(buffer, function(err) {
    if (err) if(debug) console.log("serial write err: " + err);
  });
}


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
//    if(debug) console.log("turn on led ", data);

    var toSend = new Buffer(6);
    toSend[0] = 250;                      // handshake var 1
    toSend[1] = 230;                      // handshake var 2
    toSend[2] = 210;                      // handshake var 3
    toSend[3] = 255;                      // 255 = turn on
    toSend[4] = data[0] + VALUES_OFFSET;  // column (anode) data
    toSend[5] = data[1] + VALUES_OFFSET;  // row (cathode) data

    sendToArduino(toSend);
  });

  socket.on('turnOff', function(data) {
//    if(debug) console.log("turn off led ", data);

    var toSend = new Buffer(6);
    toSend[0] = 250;                      // handshake var 1
    toSend[1] = 230;                      // handshake var 2
    toSend[2] = 210;                      // handshake var 3
    toSend[3] = 254;                      // 254 = turn off
    toSend[4] = data[0] + VALUES_OFFSET;  // column (anode) data
    toSend[5] = data[1] + VALUES_OFFSET;  // row (cathode) data

    sendToArduino(toSend);
  });

  socket.on("allOn", function(data) {
//    if (debug) console.log("turn all leds on");

    var toSend = new Buffer(6);
    toSend[0] = 250;                      // handshake var 1
    toSend[1] = 230;                      // handshake var 2
    toSend[2] = 210;                      // handshake var 3
    toSend[3] = 253; // 253 = all on
    toSend[4] = 0;   // void data
    toSend[5] = 0;   // void data

    sendToArduino(toSend);
  });

  socket.on("allOff", function(data) {
//    if (debug) console.log("turn all leds off");

    var toSend = new Buffer(6);
    toSend[0] = 250;                      // handshake var 1
    toSend[1] = 230;                      // handshake var 2
    toSend[2] = 210;                      // handshake var 3
    toSend[3] = 252;  // 252 = all on
    toSend[4] = 0;   // void data
    toSend[5] = 0;   // void data

    sendToArduino(toSend);
  });

  socket.on('reconnectSerial', function(data) {
		if(debug) console.log("socket trigger 'reconnectSerial'");

    if (serialConnected) {
      serialConnected = false;
      serialPort.close(function() {
        if(debug) console.log("opening Serial port");
        startSerial();
      });
    } else {
      if(debug) console.log("serial not connected so can't close...");
    }
    if(debug) console.log("closing Serial port");
	});

  /*
  socket.on('setLed', function(data) {
    if(debug) console.log("socket trigger 'setLed' >> data: ", data);

    // 'data' should be either '1' or '0'.
    // TODO check here if 'data' contains the correct content before blindly sending this off
    if (serialConnected) serialPort.write(data);
  });
  //*/

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
