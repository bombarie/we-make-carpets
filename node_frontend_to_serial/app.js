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

if (BASE_OS == OSX)   ARDUINO = "/dev/tty.usbmodemfa141";
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
//  console.log("  Serial test >> writing a 1-byte buffer containing the number 33 to Arduino");
//  var b = new Buffer(1);
//  b[0] = 33;
//  serialPort.write(b, function(err, results) {
//    console.log('    err ' + err);
//    console.log('    results ' + results);
//  });
});


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
    toSend[0] = 255;                      // 255 = turn on
    toSend[1] = data[0] + VALUES_OFFSET;  // column (anode) data
    toSend[2] = data[1] + VALUES_OFFSET;  // row (cathode) data

    if (serialConnected) serialPort.write(toSend, function(err) {
      if (err) if(debug) console.log("serial write err: " + err);
    });
  });

  socket.on('turnOff', function(data) {
    if(debug) console.log("turn off led ", data);

    var toSend = new Buffer(3);
    toSend[0] = 254;                      // 254 = turn off
    toSend[1] = data[0] + VALUES_OFFSET;  // column (anode) data
    toSend[2] = data[1] + VALUES_OFFSET;  // row (cathode) data

    if (serialConnected) serialPort.write(toSend, function(err) {
      if (err) if(debug) console.log("serial write err: " + err);
    });
  });

  socket.on("allOn", function(data) {
    if (debug) console.log("TODO: All leds should turn ON now");

    var toSend = new Buffer(3);
    toSend[0] = 253; // 253 = all on
    toSend[1] = 0;   // void data
    toSend[2] = 0;   // void data

  });

  socket.on("allOff", function(data) {
    if (debug) console.log("TODO: All leds should turn OFF now");

    var toSend = new Buffer(3);
    toSend[0] = 252;  // 252 = all on
    toSend[1] = 32;   // void data
    toSend[2] = 32;   // void data

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
