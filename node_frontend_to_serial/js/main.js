console.log("connection socketio to '" + window.location.hostname + ":1337" + "'");
var socket = io.connect(window.location.hostname + ":1337");
// var socket = io();

socket.on('pingBack', function(msg) {
  console.log("socket.io >> testback() >>  got a reply: " + msg);
  $("span.counterHolder").text(msg);
});

socket.on('connected', function(msg) {
	console.log("node says I'm connected");
});

// some debugging statements concerning socket.io
socket.on('disconnect', function(){
	console.log('disconnected');
});
socket.on('reconnecting', function(seconds){
	console.log('reconnecting in ' + seconds + ' seconds');
});
socket.on('reconnect', function(){
	console.log('reconnected');
});
socket.on('reconnect_failed', function(){
console.log('failed to reconnect');
});
socket.on('connect', function() {
	console.log('connected');
});

$(function() {
  console.log("ready");

  $("#led_on").on('click tap', function(e) {
    e.preventDefault();
    socket.emit('setLed', '1');
    console.log("clicked on 'led on'");
  });
  $("#led_off").on('click tap', function(e) {
    e.preventDefault();
    socket.emit('setLed', '0');
    console.log("clicked on 'led off'");
  });
  $("#get_ping").on('click tap', function(e) {
    e.preventDefault();
    socket.emit('getPing', '');
    console.log("clicked on 'get ping'");
  });


});
