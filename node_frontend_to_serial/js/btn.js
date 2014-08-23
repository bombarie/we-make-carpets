var Btn = function(data)
{
  this.init(data);
}

Btn.prototype = {

  init: function(data)
  {
    var _this = this;
    _this.settings = data;

    console.log("Btn init");
  }
}