var socket = io.connect(window.location.hostname + ":1337");

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
	 
		// console.log("conversion["+(j)+"]["+(i)+ "] = " + conversion[j][i]);
	 
	  var _class = (conversion[j][i]? "ledbtn" : "ledbtn small");

      var $div = $("<div id='"+i+"_"+j+"'  class='" + _class + "'><span class='debug'>" + i + "," + j + "</span></div>");
      $div.data("position", { x:i, y:j });
      $row.append($div);
    }
    $("#buttonsContainer").append($row);
  }
}


$(function () {
  console.log("ready");

  // generate matrix
  generateButtons(62, 40);


  $("#led_on").on('mousedown', function (e) {
    $("#led_off").removeClass("active");
    $(this).addClass("active");
  });

  $("#led_off").on('mousedown', function (e) {
    $("#led_on").removeClass("active");
    $(this).addClass("active");
  });

  $("#all_off").on('mousedown', function (e) {
    $(".ledbtn.on").removeClass("on");//addClass("transmit");
    socket.emit("allOff");
  });

  $("#all_on").on('mousedown', function (e) {
    $(".ledbtn").not(".on").addClass("on");//.addClass("transmit");
    socket.emit("allOn");
  });

//  $("#get_ping").on('click tap', function (e) {
//    e.preventDefault();
//    socket.emit('getPing', '');
//    console.log("clicked on 'get ping'");
//  });

  // Turn touches into drawing
  $(document).on('touchmove',function(e){

    for(var i = 0; i < Math.min(e.originalEvent.touches.length, 2); i++)
    {
      var t = e.originalEvent.touches[i];
      var pos = {
                x: 1 + Math.floor((t.clientX - 6)/26),
                y: 1 + Math.floor((t.clientY - 112)/26)
              };
      var $btn = $("#" + pos.x + "_" + pos.y);
//    console.log(t.target);

      if ($("#led_on").hasClass("active")) $btn.addClass('on').addClass("transmit");
      else $btn.removeClass('on').addClass("transmit");
    }
    // don't scroll the page
    e.preventDefault();
  });


  // Transmit the data
  var transmit = setInterval(function()
  {
    $(".ledbtn.transmit").each(function()
    {
      $(this).removeClass("transmit");
      socket.emit(($(this).hasClass("on") ? 'turnOn' : 'turnOff'), [$(this).data("position").x, $(this).data("position").y]);
    })
  }, 100); //transmit at 10fps

});
