var app = {
  window: {width:0, height:0},
  
  image: {
    width : 0,
    height : 0,
    src: null,
    img_object: null,
  },
  
  canvas_context: null,
  
  state: "none",
  
  mosaic_size: 0,
  
  step_time_ms: 1000,
  
  step_size_rule: function(current_size) {
    return current_size * 4 / 5 | 0;
  },

  change_state: function(state) {
    this.state = state;
    var self = this;
    var btn = document.getElementById("action_button");
    var btn2= document.getElementById("action_button2");
    if (this.state === "image-loaded") {
      btn.style.display = "";
      btn.innerHTML = "この画像で出題";
      btn.onclick = function() {
        self.mosaic_size = self.get_mosaic_start_size();
        console.log("start" + self.mosaic_size);
        self.draw_mosaic();
        self.change_state("ready");
      };
      btn2.style.display = "none";
    }
    else if (this.state === "ready") {
      btn.innerHTML = "スタート";
      btn.onclick = function() {
        self.change_state("quiz-running");
        self.step_mosaic();
      };
      btn2.innerHTML = "モザイク再生成";
      btn2.style.display = "";
      btn2.onclick = function() {
        self.mosaic_size = self.get_mosaic_start_size();
        self.draw_mosaic();
      };
    }
    else if (this.state === "quiz-running") {
      btn.innerHTML = "ストップ";
      btn.onclick = function() {
        // self.stop-mosaic();
      };
      btn2.style.display = "none";
    }
  },
  
  draw_mosaic: function() {
    var src    = this.image.src;
    var image_obj = this.canvas_context.getImageData(0, 0, this.image.width, this.image.height);
    var row_width = this.image.width;

    function draw_cell(x, y, width, height) {
      var num_area = height * width;
      var r = 0;
      var g = 0;
      var b = 0;
      for (var yy = 0; yy < height; yy++) {
        for (var xx = 0; xx < width; xx++) {
          var idx = ((y + yy) * row_width + (x + xx)) * 4;
          r += src[idx];
          g += src[idx + 1];
          b += src[idx + 2];
        }
      }
      r = r / num_area | 0;
      g = g / num_area | 0;
      b = b / num_area | 0;
      for (var yy = 0; yy < height; yy++) {
        for (var xx = 0; xx < width; xx++) {
          var idx = ((y + yy) * row_width + (x + xx)) * 4;
          image_obj.data[idx]     = r; 
          image_obj.data[idx + 1] = g; 
          image_obj.data[idx + 2] = b;
        }
      }
    };

    var x, y;
    for (y = 0; y < this.image.height - this.mosaic_size; y += this.mosaic_size) {
      for (x = 0; x < this.image.width - this.mosaic_size; x += this.mosaic_size) {
        var width  = this.mosaic_size;
        var height = this.mosaic_size;
        draw_cell(x, y, width, height);
      }
      { // edge width
        var width  = this.image.width - x;
        var height = this.mosaic_size;
        draw_cell(x, y, width, height);
      }
    }
    { // edge height
      for (x = 0; x < this.image.width - this.mosaic_size; x += this.mosaic_size) {
        var width  = this.mosaic_size;
        var height = this.image.height - y;
        draw_cell(x, y, width, height);
      }
      { // edge width
        var width  = this.image.width  - x;
        var height = this.image.height - y;
        draw_cell(x, y, width, height);
      }
    }
    
    this.canvas_context.putImageData(image_obj, 0, 0);
  },

  step_mosaic : function() {
    this.draw_mosaic();
    var self = this;
    if (this.mosaic_size > 1) {
      this.mosaic_size = this.step_size_rule(this.mosaic_size);
      if (this.mosaic_size < 1) { this.mosaic_size = 1; }
      setTimeout(function() {
        self.step_mosaic()
      }, this.step_time_ms);
    }
    else {
      this.change_state("image-loaded");
    }
  },
  
  get_mosaic_start_size : function () {
    var elem = document.getElementById("start_mosaic_size_input");
    var size = 128;
    if (elem) {
      size = parseInt(elem.value);
      if (isNaN(size) || size <= 0) {
        // start-mosaic has at least 2 cells
        size = Math.min(app.image.width, app.image.height);
        size = size / 2 | 0;   
      }
      else {
        var max = Math.max(app.image.width, app.image.height);
        if (size > max) { size = max; }
      } 
    }
    return size;
  }
};

function load_file(elem) {
  if (!elem.files.length) return;
  
  var file = elem.files[0];
  var message = document.getElementById("message");
  if (!file.type.match("image.*")) {
    message.innerHTML = "不正なファイルです(" + file.type + ")";
    return;
  }
  
  message.innerHTML = "読み込み中";
  // check window size
  app.window.width = window.innerWidth;
  app.window.height = window.innerHeight;
  // setup canvas
  var canvas = document.getElementById("mosaic_canvas");
  var context = canvas.getContext("2d");
  app.canvas_context = context;

  var reader = new FileReader(); 
  reader.onload = function() {
    var img = new Image();
    img.onload = function() {
      var width = img.width;
      var height = img.height;
      // scaling
      var limit_width = app.window.width;
      var limit_height = app.window.height;
      if (width > limit_width) {
        var scale = limit_width / width;
        width = limit_width;
        height = scale * height | 0;
      }
      if (height > limit_height) {
        var scale = limit_height / height;
        height = limit_height;
        width = scale * width | 0;
      }
      
      canvas.setAttribute("width", width);
      canvas.setAttribute("height", height);
      app.image.width  = width;
      app.image.height = height;
      
      console.log("img onload");
      app.image.img_object = img;
      
      context.drawImage(app.image.img_object, 0, 0, width, height);
      var image_obj = context.getImageData(0, 0, width, height);
      app.image.src = new Uint8ClampedArray(image_obj.data);
      
      app.change_state("image-loaded");
      message.innerHTML = "";
    }; // img.onload

    img.src = reader.result;
  }; // reader.onload
  
  reader.readAsDataURL(file);
} 

function click_proxy(selector) {
  var dom = document.querySelector(selector);
  var e = document.createEvent("MouseEvents");
  e.initEvent("click", false, true);
  dom.dispatchEvent(e);
}

window.addEventListener("load", function() {
  var elem = document.getElementById("start_mosaic_size_input");
  elem.addEventListener("keyup", function (e) {
    if (e.keyCode === 13) { elem.blur(); }
  }, false);
}, false);

