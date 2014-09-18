/*

 SOCKETIO STUFF

 */

var socket = null;
function connectSocketIO() {
  console.log("f:connectSocketIO");

  if (socket != null) {
    socket.disconnect();
    socket = null;
  }

  socket = io.connect(window.location.hostname + ":1337");

//  socket.on('pingBack', function (msg) {
//    console.log("socket.io >> testback() >>  got a reply: " + msg);
//    $("span.counterHolder").text(msg);
//  });

  socket.on('connected', function (msg) {
    console.log("node says I'm connected");
  });

  // some debugging statements concerning socket.io
  socket.on('disconnect', function () {
    console.log('disconnected');
    $errorContainer.fadeIn();
  });
  socket.on('reconnecting', function (seconds) {
    console.log('reconnecting in ' + seconds + ' seconds');
  });
  socket.on('reconnect', function () {
    console.log('reconnected');
    $errorContainer.fadeOut();
  });
  socket.on('reconnect_failed', function () {
    console.log('failed to reconnect');
  });
  socket.on('connect', function () {
    console.log('connected');
    $errorContainer.fadeOut();
  });

}


/*

 GENERATE MATRIX

 */

function generateButtons(numX, numY) {
  console.log("f:generateButtons() >> numX: " + numX + ", numY: " + numY);

  for (var j = 0; j < numY; j++) {

    // create a new row
    var $row = $("<div class='row clearfix'></div>");

    for (var i = 0; i < numX; i++) {

      // choose the class of the element according to the design of the led matrix (see conversion.js)
      var _class = (conversion[j][i] ? "ledbtn" : "ledbtn small");

      var $div = $("<div id='" + i + "_" + j + "'  class='" + _class + "'><span class='debug'>" + i + "," + j + "</span></div>");
      $div.data("position", { x:i, y:j });

      // append new element to the row
      $row.append($div);
    }

    // append the filled row to the button container div
    $("#buttonsContainer").append($row);
  }
}

/*

 JQUERY INIT

 */

var hammerOptions = {
  drag:false,
  transform:false,
  rotate:false
};

var hammerTouchHoldOptions = {
  drag:false,
  transform:false,
  rotate:false
};


function textureBtnEventsHandler(ev){
  console.log("f:textureBtnEventsHandler()");
  ev.preventDefault();

//    console.log("ev: ", ev);
//    console.log("ev.type: ", ev.type);
  if(!ev.gesture) {
//    console.log(" !ev.gesture.....");
    return;
  }
  switch(ev.type){
    case 'tap': // Ask to delete (flag) a texture
      console.log("f:textureBtnEventsHandler() >> tap gesture");

      connectSocketIO();
      break;
    case 'hold': // Ask to delete (flag) a texture
      console.log("f:textureBtnEventsHandler() >> hold gesture");
      var reply = confirm("reset connection to LED Carpet?");
      console.log("reply = " + reply);
      if (reply) connectSocketIO();
//      var reply = prompt("Voer pin in om afbeelding te verwijderen.", "");
//      if(reply == 'abba'){
//        $(ev.currentTarget).slideUp("slow", function(){$(this).remove();});
//        var flagTexture = $(ev.currentTarget).find('img').attr('src');
//        socket.emit('flagTexture', {'textureName':flagTexture});
//      }
      break;
  }
}

var $errorContainer = null;
$(function () {
  console.log("ready");

  $errorContainer = $(".secretContainer");

  // connect to SocketIO (node.js backend);
  connectSocketIO();

  // generate matrix
  console.log("begin generating buttons...");
  generateButtons(62, 40);
  console.log("...end generating buttons");

  //* als je happy bent met de Hammer oplossing dan mag deze weg.
  // buttons event handlers
//  $("#led_on2").on('click', function (e) {
//    $("#led_off2").removeClass("active");
//    $(this).addClass("active");
//  });
//
//  $("#led_off2").on('click', function (e) {
//    $("#led_on2").removeClass("active");
//    $(this).addClass("active");
//  });
//
  $("#led_on").on('mouseover touchend', function (e) {
    $("#led_off").removeClass("active");
    $(this).addClass("active");
  });

  $("#led_off").on('mouseover touchend', function (e) {
    $("#led_on").removeClass("active");
    $(this).addClass("active");
  });

  $("#all_off").on('mouseover touchend', function (e) {
    console.log("btn pressed: turn all off");

    $(".ledbtn.on").removeClass("on");
    socket.emit("allOff");
  });

  $("#all_on").on('mouseover touchend', function (e) {
    console.log("btn pressed: turn all on");

    $('.ledbtn').each(function () {
      $(this).addClass("on");
    });
    socket.emit("allOn");
  });
  $("#reconnect_serial").on('click', function (e) {
    console.log("btn pressed: tell node.js to reconnect serial connection");

    socket.emit("reconnectSerial");
  });

  var textureBtnEvents = 'tap hold';
  var hammertime = Hammer($('#resetSocketIO')[0], {
    prevent_default: true,
//    no_mouseevents: true,
    hold_timeout: 1500,
    hold_threshold: 30,
    tap_max_touchtime: 2000
  })
    .on(textureBtnEvents, textureBtnEventsHandler);

  //*/

  /*
   // buttons event handlers
   Hammer($("#led_on")[0], hammerOptions).on("tap", function (e) {
   //   $("#led_on").on('mouseover touchend', function (e) {
   console.log("drawing mode activated");
   $("#led_off").removeClass("active");
   $(e.target).addClass("active");
   });

   Hammer($("#led_off")[0], hammerOptions).on("tap", function (e) {
   //   $("#led_off").on('mouseover touchend', function (e) {
   console.log("erasing mode activated");
   $("#led_on").removeClass("active");
   $(e.target).addClass("active");
   });

   Hammer($("#all_off")[0], hammerOptions).on("tap", function (e) {
   //   $("#all_off").on('mouseover touchend', function (e) {
   console.log("btn pressed: turn all off");

   $(".ledbtn.on").removeClass("on");
   socket.emit("allOff");
   });

   Hammer($("#all_on")[0], hammerOptions).on("tap", function (e) {
   //   $("#all_on").on('mouseover touchend', function (e) {
   console.log("btn pressed: turn all on");

   $('.ledbtn').each(function () {
   $(this).addClass("on");
   });
   socket.emit("allOn");
   });
   //*/

  /*
   Hammer($("#all_on")[0], hammerOptions).on("tap", function(event) {
   console.log('allon');
   });
   //*/


  // Turn touches into drawing
  $(document).on('touchmove', function (e) {

    for (var i = 0; i < Math.min(e.originalEvent.touches.length, 2); i++) {

      var t = e.originalEvent.touches[i];
      var pos = {
        x:1 + Math.floor((t.clientX - 18) / 27), // 6 = left-offset of #buttonsContainer
        y:1 + Math.floor((t.clientY - 135) / 27) // 112 = top-offset of #buttonsContainer
      };
      var $btn = $("#" + pos.x + "_" + pos.y);

      // TODO check if necessary to flag as transmit
      // eg. if a field already was on/off, no need to turn on/off *again*
      // btw -> for now leaving as-is because it *does* allow to really really make sure that something is on/off
      if ($("#led_on").hasClass("active")) $btn.addClass('on').addClass("transmit"); else $btn.removeClass('on').addClass("transmit");
    }

    // don't scroll the page
    e.preventDefault();

  });


  /**
   * Transmit the data
   *
   * looks for elements with the class 'transmit'. These elements will not have been updated to the Node backend yet
   * returns false after the first run to only process one of these elements at a time. This way we can control the speed
   * of sending, which is probably a good thing w.r.t. the serial bandwidth between Node.js and the Arduino
   */
  var transmit = setInterval(function () {
    $(".ledbtn.transmit").each(function () {
      //      console.log("transmit interval... ");
      $(this).removeClass("transmit");
      socket.emit(($(this).hasClass("on") ? 'turnOff' : 'turnOn'), [ 62 - $(this).data("position").x, $(this).data("position").y]);
      return false;
    })
  }, 1000 / 100); //transmit at 50fps


  // at end if init turn everything off
  socket.emit("allOff");


});
