var socket = io();
socket.on('pingBack', function(msg) {
  console.log("socket.io >> testback() >>  got a reply: " + msg);
  $("span.counterHolder").text(msg);
});

$(function() {
  console.log("ready");

  $("#led_on").on('click tap', function(e) {
    e.preventDefault();
    socket.emit('setLed', '1');
  });
  $("#led_off").on('click tap', function(e) {
    e.preventDefault();
    socket.emit('setLed', '0');
  });
  $("#get_ping").on('click tap', function(e) {
    e.preventDefault();
    socket.emit('getPing', '');
  });


});
