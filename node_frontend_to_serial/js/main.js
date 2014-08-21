var socket = io.connect(window.location.hostname + ":1337");
//var socket = io();

socket.on('pingBack', function (msg) {
  console.log("socket.io >> testback() >>  got a reply: " + msg);
  $("span.counterHolder").text(msg);
});

socket.on('connected', function (msg) {
  console.log("node says I'm connected");
});

// some debugging statements concerning socket.io
socket.on('disconnect', function () {
  console.log('disconnected');
});
socket.on('reconnecting', function (seconds) {
  console.log('reconnecting in ' + seconds + ' seconds');
});
socket.on('reconnect', function () {
  console.log('reconnected');
});
socket.on('reconnect_failed', function () {
  console.log('failed to reconnect');
});
socket.on('connect', function () {
  console.log('connected');
});

var buttonStates = [
  []
];
function generateButtons(numX, numY) {
  console.log("f:generateButtons() >> numX: " + numX + ", numY: " + numY);
  // or a different approach..
  /*
   for (var i = 0; i < numX; i++) {
   for (var j = 0; j < numY; j++) {
   buttonStates [x][y] = 0;
   }
   }
   //*/

  for (var j = 0; j < numY; j++) {
    var $row = $("<div class='row clearfix'></div>");
    for (var i = 0; i < numX; i++) {
      var $div = $("<div class='ledbtn'>" + i + "," + j + "</div>");
      $div.data("position", { x:i, y:j });
      $row.append($div);
    }
    $("#buttonsContainer").append($row);
  }
}


$(function () {
  console.log("ready");

  // generate matrix
  generateButtons(14, 14);

  $('.body').hammer( {
    prevent_default: true,
    no_mouseevents: true
  });

  // add click events to the generated led buttons
  $(".ledbtn").hammer().on("tap press", function (e) {
    console.log("got tapped >> e = ", e);
    console.log("got tapped at position " + $(this).data("position").x + "," + $(this).data("position").y);

    if ($(this).hasClass('on')) {
      $(this).removeClass('on');
      socket.emit('turnOff', [$(this).data("position").x, $(this).data("position").y]);
    } else {
      $(this).addClass('on');
      socket.emit('turnOn', [$(this).data("position").x, $(this).data("position").y]);
    }
    console.log("tap");
  });

  $("#led_on").on('click tap', function (e) {
    e.preventDefault();
    socket.emit('setLed', '1');
    console.log("clicked on 'led on'");
  });
  $("#led_off").on('click tap', function (e) {
    e.preventDefault();
    socket.emit('setLed', '0');
    console.log("clicked on 'led off'");
  });
  $("#get_ping").on('click tap', function (e) {
    e.preventDefault();
    socket.emit('getPing', '');
    console.log("clicked on 'get ping'");
  });


});
