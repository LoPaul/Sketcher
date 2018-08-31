$(document).ready(() => {

  let canvas = new fabric.Canvas('whiteboard');
  let templateId = $('#template-id').text();
  let templates = ['','/img/weekly-cal.png','/img/background.jpg','/img/background.jpg'];
  canvas.setHeight(1600);
  canvas.setWidth(2400);
  if (templateId !== 0) {
    canvas.setBackgroundImage(templates[templateId], canvas.renderAll.bind(canvas));
  }
  // Set default canvas values
  const ERASE = 0;
  const LINE = 1;
  const RECT = 2;
  const CIRCLE = 3;
  const HAND = 4;
  const SELECT = 5;
  const TEXTBOX = 6;
  const DRAW = 7
  let mode = SELECT;
  enableSelectMode();
  canvas.freeDrawingBrush.color = '#000000';
  let currentWidth = canvas.freeDrawingBrush.width = 15;
  let currentColor = '#000000';
  let borderSize = 4;
  canvas.freeDrawingBrush.width = borderSize;

  const socket = io.connect();
  let DEBUG = false;

  canvas.on('mouse:down', function(event) {
    $('body').append('<p>Aaron</p>');
  });
  ////////////////////////////////////////////
  //             CLIENT INFO                //
  ////////////////////////////////////////////

  let selectedUsername = null;

  function listUsers(users) {
    // console.log("LIST USERS FUNCTION", users);
    $users = $('#users');
    $users.empty(); // improve this by removing user by id?
    users.forEach(function(user) {
      userId = Object.keys(user)[0];
      user = user[Object.keys(user)[0]];
      $('<span style="margin: 0 .25em;">').text(user.name).appendTo($users);
    });
  }

  // On connection, user is prompted to select a username
  (function() {
    $(`<div id="username-form" style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; z-index:100; position:fixed;">
        <div style="opacity:1; padding: 1em; background-color:lightgrey; border-radius:1em;">
          <form id="select-username">
            <p>Select a username:</p>
            <input type="text" style="outline: none;" autofocus onfocus="this.select()" />
            <button>GO</button>
          </form>
        </div>
      </div>`).prependTo(document.body);

    // Once username is selected, the username is sent to the server and the username form/div is removed
    $("#select-username").on('submit', (e) => {
      e.preventDefault();
      $username = $('#select-username input').val();
      if ($username.trim().length < 1) return;

      // Save username for reconnection
      selectedUsername = $username;
      console.log(selectedUsername);

      // Send username to server
      socket.emit('username selected', $username);
      $('#username-form').remove();

      console.log('Username submitted:', $username)
    });
  })();

  socket.on('connected', (msg) => {
    console.log("CONNECTED", msg.currentUsers);
    listUsers(msg.currentUsers);
  });

  socket.on('new connection', (msg) => {
    console.log("NEW CONNECTION", msg);
    listUsers(msg);
  });

  socket.on('user disconnected', (msg) => {
    console.log("USER DISCONNECTED", msg);
    listUsers(msg.currentUsers);
  });


  // boardId = (window.location.pathname).split('/').reverse()[0];
  // console.log(boardId);


  ////////////////////////////////////////////
  //             TOOL BUTTONS               //
  ////////////////////////////////////////////

  // Select Tool
  $('#select').on('click', function(e) { enableSelectMode() });

  // Hand Tool (Move canvas)
  $('#hand').on('click', function(e) { enableHandMode() });

  // Draw Tool
  $('#draw').on('click', function(e) { enableDrawingMode() });

  // Line Tool
  $('#line').on('click', function(e) { enableLineMode() });

  // Circle Tool
  $('#circle').on('click', function(e) { enableCircleMode() });

  // Draw Rectangle Tool
  $('#draw-rect').on('click', function(e) { enableRectMode() });

  // Text box
  $('#textbox').on('click', function(e) { enableTxtBoxMode() });

  // Delete Tool
  $('#delete').on('click', function(e) { enableEraserMode() });

  $('#brush-size').on('click', function(e) {
    let pixelSize = parseInt($('#brush-size').val(), 10) * 2
    borderSize = pixelSize;
    canvas.freeDrawingBrush.width = pixelSize;
  });

  // Add Image Tool
  $('#add-image').on('change', function(e) {
    let reader = new FileReader();
    reader.onload = function(event) {
      let imgObj = new Image();
      imgObj.src = event.target.result;
      imgObj.onload = function() {
        let image = new fabric.Image(imgObj);
        image.set({
          left: 50,
          top: 50,
        }).scale(0.5);
        addComponent(image);
      };
    };
    reader.readAsDataURL(e.target.files[0]);
    $("#add-image").val("");
    enableSelectMode();
  });

  // Color Picker
  $("#colorPicker").spectrum({
    color: currentColor,
    showPalette: true,
    palette: [
      ['#000000', '#ffffff'],
      ['#FF4136', '#0074D9'],
      ['#2ECC40', '#f9f878'],
      ['#be50b7', '#FF851B'],
      ['#39CCCC', '#AAAAAA'],
    ],
    change: function(color) {
      currentColor = color.toHexString()
      canvas.freeDrawingBrush.color = currentColor;
    }
  });

  // Change brush sizes
  $('#small-brush').on('click', function(e) {
    canvas.freeDrawingBrush.width = 3
    canvas.isDrawingMode = true;
    enableDrawingMode();
  });
  $('#medium-brush').on('click', function(e) {
    canvas.freeDrawingBrush.width = 15
    canvas.isDrawingMode = true;
    enableDrawingMode();
  });
  $('#large-brush').on('click', function(e) {
    canvas.freeDrawingBrush.width = 30
    enableDrawingMode();
  });

  // Save canvas to image
  $('#save-image').on('click', function(e) {
    canvas.discardActiveObject();
    $('#whiteboard').get(0).toBlob(function(blob) {
      saveAs(blob, 'whiteboard.png');
    });
  });


  // Drag and drop to add image
  $('.board').on('drop', function(e) {
    if (DEBUG) console.log(e);

    let xpos = e.offsetX;
    let ypos = e.offsetY;
    e = e || window.event;
    if (e.preventDefault) {
      e.preventDefault();
    }
    let dt = e.dataTransfer || (e.originalEvent && e.originalEvent.dataTransfer);
    let files = e.target.files || (dt && dt.files);
    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      let reader = new FileReader();

      //attach event handlers here...
      reader.onload = function(e) {
        if (DEBUG) console.log('second event:', e);
        let img = new Image();
        img.src = e.target.result;

        let image = new fabric.Image(img);
        image.set({
          left: xpos,
          top: ypos,
        }).scale(0.5);
        canvas.add(image);
      }
      reader.readAsDataURL(file);
    }

    return false;
  });
  $('.main').on('dragover', cancel);
  $('.main').on('dragenter', cancel);

  function cancel(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    return false;
  }

  $('#add-background').on('change', function(e) {
    var file = e.target.files[0];
    var reader = new FileReader();
    reader.onload = function(f) {
      var data = f.target.result;
      fabric.Image.fromURL(data, function(img) {
        // add background image
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: canvas.width / img.width,
          scaleY: canvas.height / img.height
        });
      });
    };
    reader.readAsDataURL(file);
    $("#add-background").val("");
    enableSelectMode();
  });

  ////////////////////////////////////////////
  //             TOOL MODES                 //
  ////////////////////////////////////////////

  // Make Objects Selectable
  function makeObjectsSelectable(boolean) {
    canvas.forEachObject(function(object) {
      object.set({
        selectable: boolean
      }).setCoords();
    })
  }

  function orderCanvas() {
    canvas.getObjects().forEach(each => {
      if(each.type === "i-text")
        canvas.bringToFront(each)
    })
  }
  // CLEAR ALL MODES
  function clearModes() {
    $(".selected").removeClass("selected");
    canvas.isDrawingMode = false;
    canvas.selection = true;
    makeObjectsSelectable(true);
    orderCanvas();
  }

  // DRAWING MODE
  function enableDrawingMode() {
    clearModes();
    canvas.isDrawingMode = true;
    mode = DRAW;
    $('#draw').addClass('selected');
  }

  // LINE MODE
  function enableLineMode() {
    clearModes();
    mode = LINE;
    makeObjectsSelectable(false);
    $('#line').addClass('selected');
  }

  // TEXTBOX MODE
  function enableTxtBoxMode() {
    clearModes();
    mode = TEXTBOX;
    makeObjectsSelectable(false);
    $('#textbox').addClass('selected');
  }

  // SELECT MODE
  function enableSelectMode() {
    clearModes();
    mode = SELECT;
    $('#select').addClass('selected');
  }

  // HAND MODE
  function enableHandMode() {
    clearModes();
    mode = HAND;
    canvas.discardActiveObject();
    $('#hand').addClass('selected');
    makeObjectsSelectable(false);
  }

  // ERASER MODE
  function enableEraserMode() {
    clearModes();
    mode = ERASE;
    canvas.discardActiveObject();
    $('#delete').addClass('selected');
    }

  // CIRCLE MODE
  function enableCircleMode() {
    clearModes()
    mode = CIRCLE;
    canvas.discardActiveObject();
    $('#circle').addClass('selected');
    makeObjectsSelectable(false);
  }

  // RECTANGLE MODE
  function enableRectMode() {
    clearModes()
    mode = RECT;
    canvas.discardActiveObject();
    $('#draw-rect').addClass('selected');
    makeObjectsSelectable(false);
  }

  ////////////////////////////////////////////
  //             CANVAS EVENTS              //
  ////////////////////////////////////////////
  ['object:modified'].forEach(function(eventType) {
    canvas.on(eventType, function(event) {
      // debouncing/throtling not required.
      componentChanged(event, true)
    });
  });

  canvas.on('text:changed', function(event) {
    // debouncing/throtling not required.
    modifyingComponent(event.target)
  });

  canvas.on('mouse:up', function(event) {
    if (mode === ERASE) {
      removeComponent();
    }
  });

  ['object:rotating', 'object:moving', 'object:scaling']
    .forEach(function(eventType) {
      canvas.on(eventType, function(event) {
        throttled(25, componentChanged(event, false))
      });
    })

  canvas.on('path:created', function(event) {
    let path = event.path;
    path.toObject = (function(toObject) {
      return function() {
        return fabric.util.object.extend(toObject.call(this), {
          id: this.id
        });
      };
    })(path.toObject);

    path.id = uuidv4();
    socket.emit("path_created", path.toJSON())
  });

  let rect, line, circle, isMouseDown, origX, origY;
  // TOOLS EVENT HANDLING
  ['mouse:down', 'mouse:move', 'mouse:up', 'dragenter', 'dragleave', 'drop', 'dragover']
    .forEach(function(eventType) {
      canvas.on(eventType, function(event) {
        handleDrawRect(event);
        handleDrawCircle(event);
        handleDrawLine(event);
        handleDropTextBox(event);
        handlePanning(event, this);
    });
  })

  // throttle async functions
  function throttled(delay, fn) {
    let lastCall = 0;
    return function (...args) {
      const now = (new Date).getTime();
      if (now - lastCall < delay) {
        return;
      }
      lastCall = now;
      return fn(...args);
    }
  }

  // debuounce async functions
  function debounced(delay, fn) {
    let timerId;
    return function (...args) {
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        fn(...args);
        timerId = null;
      }, delay);
    }
  }
  ///////////////////
  // TOUCH EVENTS //
  ///////////////////
// canvas.addEventListener("touchstart", function (e) {
//   e.preventDefault();
//   var mousePos = getTouchPos(canvas, e);
//   var touch = e.touches[0];
//   console.log("touchstart", mousePos)
//   // do_mouse_click_logic(mousePos.x, mousePos.y, touch.clientX, touch.clientY);
// }, false);

// canvas.addEventListener("touchend", function (e) {
//   e.preventDefault();
//   var mousePos = getTouchPos(canvas, e);
//   console.log("touchend", mousePos)
//   // do_mouse_up_logic(mousePos.x, mousePos.y);
// }, false);

// canvas.addEventListener("touchmove", function (e) {
//   e.preventDefault();
//   var mousePos = getTouchPos(canvas, e);
//   var touch = e.touches[0];
//   console.log("touchmove", mousePos)
//   // do_mouse_move_logic(mousePos.x, mousePos.y, touch.clientX, touch.clientY);
// }, false);

// function getTouchPos(canvasDom, touchEvent) {
//   var rect = canvasDom.getBoundingClientRect();
//   return {
//     x: touchEvent.touches[0].clientX - rect.left,
//     y: touchEvent.touches[0].clientY - rect.top
//   };
// }
//  //////////////////////////

//   canvas.on('object:added', function(event) {
// console.log("Object Created", event)
// //   });

  //
  canvas.on('mouse:over', function(event) {
    if(event.target) {
      event.target.set('opacity', 0.7);
      canvas.renderAll();
    }
  });
  canvas.on('mouse:out', function(event) {
    if(event.target) {
      event.target.set('opacity', 1);
      canvas.renderAll();
    }
  });


  /// MOUSE DOWN EVENT
  canvas.on('mouse:down', function(event) {
    if(event.e.metaKey && mode === SELECT) {
      elevateComponent(canvas.getActiveObject())
    }
    isMouseDown = true;

  });

  // Elevate Components to the top
  function elevateComponent(component) {
    if(component === "activeSelection") {
      component.getObjects().forEach(each => {
        canvas.bringToFront(each);
        socket.emit("elevate_component", { id: each.id })
      });
    }
    else {
      canvas.bringToFront(component);
      socket.emit("elevate_component", { id: component.id } )
    }
    orderCanvas();
  }

  /// KEYBOARD EVENTS
  document.addEventListener('keydown', function(event){
    var char = event.keyCode;
    var ctrlMetaDown = event.ctrlKey || event.metaKey;
    if(char == 27) enableSelectMode();         // ESC KEY
    if(ctrlMetaDown && char === 67) Copy();   // CMD/CTR C
    if(ctrlMetaDown && char === 86) Paste();  // CMD/CTRL V

    // DELETE KEY
    if(!ctrlMetaDown && char === 8 && !isEditingText()) {
      let currentSelection = canvas.getActiveObjects();
      if (currentSelection.length > 0) {
        removeComponent();
      }
    }

    // ELEVATE COMPONENT
    if(ctrlMetaDown && char === 38) {
      elevateComponent(canvas.getActiveObject());  // CMD/CTRL UPARROW
    }

    // return true if current selection is text and in "text mode"
    function isEditingText() {
      var objects = canvas.getActiveObjects();
      return objects.length === 1 && objects[0].type === "i-text" && objects[0].isEditing === true
    }

  });

  // MOUSE UP EVENT
  canvas.on('mouse:up', function(event) {
    isMouseDown = false;
    if (mode === ERASE) {
      removeComponent();
    }
  });

  /////////////
  /// Tools ///
  /////////////

  // DRAW RECTANGLE
  function handleDrawRect(event) {
    if(mode !== RECT) return;

    if(event.e.type === "mousedown" || event.e.type === "touchstart") {
      canvas.selection = false;
      let pointer = canvas.getPointer(event.e);
      origX = pointer.x;
      origY = pointer.y;
      pointer = canvas.getPointer(event.e);
      rect = new fabric.Rect({
        selectable: false,
        hasControls: true,
        left: origX,
        top: origY,
        originX: 'left',
        originY: 'top',
        width: pointer.x - origX,
        height: pointer.y - origY,
        angle: 0,
        fill: currentColor,
        stroke: "black",
        strokeWidth: borderSize,
        transparentCorners: false
      });
      canvas.add(rect)
    }
    if(event.e.type === "mousemove" || event.e.type === "touchmove") {
      if (!isMouseDown) return;

      let pointer = canvas.getPointer(event.e);
      if (origX > pointer.x) {
        rect.set({ left: Math.abs(pointer.x) });
      }
      if (origY > pointer.y) {
        rect.set({ top: Math.abs(pointer.y) });
      }
      rect.set({ width: Math.abs(origX - pointer.x) });
      rect.set({ height: Math.abs(origY - pointer.y) });
      canvas.renderAll();
    }
    if(event.e.type === "mouseup" || event.e.type === "touchend") {
      addComponent(rect, true);
    }
  }

   // DRAW CIRCLE
   function handleDrawCircle(event) {
    if(mode !== CIRCLE) return;

    if(event.e.type === "mousedown" || event.e.type === "touchstart") {
      canvas.selection = false;
      isDown = true;
      let pointer = canvas.getPointer(event.e);
      origX = pointer.x;
      origY = pointer.y;
      circle = new fabric.Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 1,
        strokeWidth: borderSize,
        stroke: 'black',
        fill: currentColor,
        transparentCorners: false,
        selectable: false,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(circle);
    }
    if(event.e.type === "mousemove" || event.e.type === "touchmove") {
      if (!isMouseDown) return;
      let pointer = canvas.getPointer(event.e);
      circle.set({
        radius: Math.abs(origX - pointer.x)
      });
      canvas.renderAll();
    }
    if(event.e.type === "mouseup" || event.e.type === "touchend") {
      addComponent(circle, true);
      enableSelectMode();
    }
  }

  // DRAW LINE
  function handleDrawLine(event) {
    if(mode !== LINE) return;

    if(event.e.type === "mousedown" || event.e.type === "touchstart") {
      canvas.selection = false;
      var pointer = canvas.getPointer(event.e);
      var points = [pointer.x, pointer.y, pointer.x, pointer.y];
      line = new fabric.Line(points, {
        strokeWidth: borderSize,
        stroke: currentColor,
        originX: 'center',
        originY: 'center',
        selectable: false
      });
      canvas.add(line);
    };
    if(event.e.type === "mousemove" || event.e.type === "touchmove") {
      if (!isMouseDown) return;
      var pointer = canvas.getPointer(event.e);
      line.set({
        x2: pointer.x,
        y2: pointer.y
      });
      canvas.renderAll();
    }
    if(event.e.type === "mouseup" || event.e.type === "touchend") {
      addComponent(line, true);
    }
  }

  // TEXTBOX
  function handleDropTextBox(event) {
    if(mode !== TEXTBOX) return;

    if(event.e.type === "mousedown" || event.e.type === "touchstart") {
      var pointer = canvas.getPointer(event.e);
      var textbox = new fabric.IText('MyText', {
        width: 300,
        height: 300,
        top: pointer.y,
        left: pointer.x,
        hasControls: false,
        fontSize: 30,
        fixedWidth: 300,
        fixedFontSize: 30,
        fill: currentColor
      });
      canvas.add(textbox).setActiveObject(textbox);
      addComponent(textbox, true);
      enableSelectMode();
    }
  }

    // HANDLE PANNING
    function handlePanning(event, context) {
      if(mode !== HAND) return;

      if(event.e.type === "mousedown" || event.e.type === "touchstart") {
        canvas.selection = false;
        let evt = event.e;
        context.isDragging = true;
        context.selection = false;
        context.lastPosX = evt.clientX;
        context.lastPosY = evt.clientY;
      }
      if(event.e.type === "mousemove" || event.e.type === "touchmove") {
        if (context.isDragging) {
          var e = event.e;
          context.viewportTransform[4] += e.clientX - context.lastPosX;
          context.viewportTransform[5] += e.clientY - context.lastPosY;
          context.requestRenderAll();
          context.lastPosX = e.clientX;
          context.lastPosY = e.clientY;

          // panning code added by Aaron:
          // let delta = new fabric.Point(event.e.movementX, event.e.movementY);
          // canvas.relativePan(delta);

          // let canvasViewPort = canvas.viewportTransform;

          // let imageHeight = canvas.height * canvasViewPort[0];
          // let imageWidth = canvas.width * canvasViewPort[0];

          // let bottomEndPoint = canvas.height * (canvasViewPort[0] - 1);
          // if (canvasViewPort[5] >= 0 || -bottomEndPoint > canvasViewPort[5]) {
          //   canvasViewPort[5] = (canvasViewPort[5] >= 0) ? 0 : -bottomEndPoint;
          // }

          // let rightEndPoint = canvas.width * (canvasViewPort[0] - 1);
          // if (canvasViewPort[4] >= 0 || -rightEndPoint > canvasViewPort[4]) {
          //   canvasViewPort[4] = (canvasViewPort[4] >= 0) ? 0 : -rightEndPoint;
          // }
          /// End of code added by Aaron

        }
      }
      if(event.e.type === "mouseup") {
        context.isDragging = false;
        context.selection = true;
      }
    }

  // Zoom in/out with mousewheel
  canvas.on('mouse:wheel', function(opt) {
    var delta = opt.e.deltaY;
    var pointer = canvas.getPointer(opt.e);
    var zoom = canvas.getZoom();
    zoom = zoom - delta / 400;
    if (zoom > 3) zoom = 3;
    if (zoom < 0.2) zoom = 0.2;
    canvas.zoomToPoint({
      x: opt.e.offsetX,
      y: opt.e.offsetY
    }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });

  // component changed
  function componentChanged(event, isFinal) {
    // tbd debounce instead of trottling
    if (event.target.type === "activeSelection") {
      groupUpdate(event.target, "modify", isFinal)
      } else {
      modifyingComponent(event.target, isFinal)
    }
  }

  function groupUpdate(group, method, isFinal) {
    var ids = group.getObjects().map(e => e.id);
    group.clone(function(clonedObj) {
      clonedObj._restoreObjectsState();
      clonedObj.getObjects().forEach(function(each, i) {
        let cloned = each;
        cloned.id = ids[i];   // restore custom IDs
        if(method === "modify") modifyingComponent(cloned, isFinal);
        if(method === "create") addComponent(cloned, true);
      })
    })
  }

  //////////////////////////////////////////
  //              SOCKET IO               //
  //////////////////////////////////////////
  function addComponent(component, ignoreCanvas) {
    component.toObject = (function(toObject) {
      return function() {
        return fabric.util.object.extend(toObject.call(this), {
          id: this.id
        });
      };
    })(component.toObject);
    if(!component.id) component.id = uuidv4();
    component.setCoords();
    if(DEBUG) console.log("Create Component", component)
    if (!ignoreCanvas) canvas.add(component);
    socket.emit('create_component', component.toJSON());
  };

  // Remove component
  function removeComponent() {
    let currentSelection = canvas.getActiveObjects();
    canvas.getActiveObjects().forEach(obj => {
      canvas.remove(obj);
      socket.emit("remove_component", { id: obj.id })
    });
  }

  function componentParams(component) {
    return {  id: component.id,
              type: component.type,
              left: component.left,
              top: component.top,
              height: component.height,
              scaleX: component.scaleX,
              scaleY: component.scaleY,
              angle: component.angle,
              text: component.text
    }
  }

  // notify component that is being modified
  // ie: mouse continuous movement
  function modifyingComponent(component, isFinal) {
    let msg_type = isFinal ? "modified_component" : "modify_component";
    socket.emit(msg_type, componentParams(component))
  };

  // path created received from server
  socket.on('path_created', function(path) {
    if (DEBUG) console.log('incoming', path);
    fabric.util.enlivenObjects([path], function(objects) {
      objects.forEach(function(p) {
        canvas.add(p);
      });
    });
  });

  // draw component received from server
  socket.on('create_component', function(data) {
    if (DEBUG) console.log("incomding add", data)
    fabric.util.enlivenObjects([data], function(objects) {
      objects.forEach(function(p) {
        canvas.add(p);
      })
    })
  });

  // delete component request from server
  socket.on('remove_component', function(data) {
    if (DEBUG) console.log("receiving data", data)
    let component = findComonent(data.id)
    if (component) {
      canvas.remove(component);
    }
  });

  function findComonent(id) {
    return canvas.getObjects().find((each) => each.id === id)
  }

  // modify component received from server
  socket.on('modify_component', function(data) {
    if (DEBUG) console.log("receiving modifying data", data)
    let targetComponent = findComonent(data.id)
    if (targetComponent) {
      targetComponent.left = data.left;
      targetComponent.top = data.top;
      targetComponent.scaleX = data.scaleX;
      targetComponent.scaleY = data.scaleY;
      targetComponent.angle = data.angle;
      targetComponent.set("text",data.text);
      canvas.renderAll();
      if(mode === SELECT)
        targetComponent.set({ selectable: true }).setCoords();
    } else {
      if (DEBUG) console.log("Unknown Component Modified.", data)
    }
  });

  // delete component request from server
  socket.on('elevate_component', function(data) {
    let component = findComonent(data.id)
    if (component) {
      canvas.bringToFront(component);
      orderCanvas();
    }
  });


  //////////////////////////////////////////
  //              COPY PASTE              //
  //////////////////////////////////////////

  $('#duplicate').on('click', function(e) {
    if (canvas.getActiveObject())
      Copy();
    Paste();
  });

  function Copy() {
    canvas.getActiveObject().clone(function(cloned) {
      _clipboard = cloned;
    });
  }

  function Paste() {
    // clone again, so you can do multiple copies.
    if (!_clipboard) return

    _clipboard.clone(function(clonedObj) {
      canvas.discardActiveObject();
      clonedObj.set({
        left: clonedObj.left + 10,
        top: clonedObj.top + 10,
        evented: true,
      });
      if (clonedObj.type === 'activeSelection') {
        // active selection needs a reference to the canvas.
        clonedObj.canvas = canvas;
        clonedObj.forEachObject(function(obj) {
          obj.id = uuidv4();
          canvas.add(obj);
        });
        // this should solve the unselectability
        clonedObj.setCoords();
      } else {
        addComponent(clonedObj);
      }
      _clipboard.top += 10;
      _clipboard.left += 10;
      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();
      if (clonedObj.type === 'activeSelection') {
        groupUpdate(clonedObj, "create")
      }
    });
  }

});
