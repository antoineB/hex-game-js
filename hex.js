var Utils = {
    degToRad: function(deg) {
	return deg * Math.PI / 180;
    }
}

var Hex = function(x, y, length) {
    this.length = length;
    this.lengthCos = Math.cos(Utils.degToRad(60.0)) * length;
    this.lengthSin = Math.sin(Utils.degToRad(60.0)) * length;
    this.x = x;
    this.y = y;
    this.neighbours = { left: null, 
			right: null, 
			topLeft: null,
			topRight: null,
			bottomLeft: null,
			bottomRight: null };
    // topLeft     / \  topRight
    // left        | |  right
    // bottomLeft  \ /  bottomRight
};

Hex.prototype.hexagonPosition = function() {
    var a = {
	x: this.x - this.lengthSin,
	y: this.y + this.lengthCos
    };
    var b = {
	x: a.x,
	y: a.y + this.length
    };
    var c = {
	x: b.x + this.lengthSin,
	y: b.y + this.lengthCos
    };
    var d = {
	x: c.x + this.lengthSin,
	y: c.y - this.lengthCos
    };
    var e = {
	x: d.x,
	y: d.y - this.length
    };

    return [{x: this.x, y: this.y}, a, b, c, d, e];
};

Hex.prototype.isInside = function(x, y) {
    var pos = this.hexagonPosition();
    
    if (x < pos[1].x || y < pos[0].y || y > pos[3].y || x > pos[4].x) {
	return false;
    }

    if (x > pos[1].x && x < pos[2].x && y > pos[1].y && y < pos[4].y) {
	return true;
    }

    //find in which triangle we are
    if (x < pos[0].x) {
	if (y < pos[1].y) {
	    //top left
	    return ((pos[0].y - y) / (x - pos[1].x)) <= 1.0;

	} else {
	    //bottom left
	    return ((pos[3].y - y) / (pos[3].x - x)) <= 1.0;
	}

    } else {
	if (y < pos[1].y) {
	    //top right
	    return ((pos[5].y - y) / (x - pos[0].x)) <= 1.0;
	    
	} else {
	    //bottom right
	    return ((pos[3].y - y) / (pos[4].x - x)) <= 1.0;
	}
    }

    return false;
};

Hex.prototype.nextStartPosition = function() {
    var pos = this.hexagonPosition()[0];
    pos.x = pos.x + 2 * this.lengthSin;
    return pos;
};

Hex.prototype.bottomStartPosition = function() {
    return this.hexagonPosition()[4];
};

Hex.prototype.draw = function(canvas) {
    var pos = this.hexagonPosition();

    canvas.beginPath();
    canvas.moveTo(pos[0].x, pos[0].y);
    pos = pos.splice(1);
    pos.forEach(function (pos) {
	canvas.lineTo(pos.x, pos.y);
    });

    canvas.closePath();
    canvas.stroke();
};

var Grid = function(lines, columns, length) { 
    this.length = length;
    this.lines = lines;
    this.columns = columns;
    this.grid = null;
    this.border = {
	top: null,
	bottom: null,
	right: null,
	left: null
    };
};

Grid.prototype._buildGrid = function(x, y) {
    var lastHex = null;
    var start = new Hex(x, y, this.length);
    var currentHex = start;
    var pos = null;
    var firstElem = null;

    this.border.top = y;
    this.border.bottom = y + this.lines * (this.length + start.lengthCos);
    this.border.right = (x - start.lengthSin) + (2 * this.columns) * start.lengthSin + (this.lines - 1) * start.lengthSin;
    this.border.left = (x - start.lengthSin);

    for (var j = 0; j < this.lines; j++) {
	for (var i = 1; i < this.columns; i++) {
	    if (i == 1) {
		firstElem = currentHex;
	    }
	    lastHex = currentHex;
	    pos = lastHex.nextStartPosition();
	    currentHex = new Hex(pos.x, pos.y, this.length);
	    lastHex.neighbours.right = currentHex;
	    currentHex.neighbours.left = lastHex;
	    if (lastHex.neighbours.topRight) {
		currentHex.neighbours.leftTop = lastHex.neighbours.topRight;
		currentHex.neighbours.leftTop.neighbours.bottomLeft = currentHex;
	    }
	}
	
	if ((j + 1) != this.lines) {
	    currentHex = new Hex(firstElem.bottomStartPosition().x,
				 firstElem.bottomStartPosition().y,
				 this.length);
	    currentHex.neighbours.topLeft = firstElem;
	    firstElem.neighbours.bottomRight = currentHex;
	}
    }
    
    this.grid = start;
    return start;
};

Grid.prototype.eachUntil = (function () {
    var stopFlag = false;
    var recColumn = function(column, func, stop) {
	if (column !== null && stopFlag == false) {
	    func(column);
	    stopFlag = stop(column);
	    recColumn(column.neighbours.right, func, stop);
	}
    };
    
    var recLine = function(line, func, stop) {
	if (line !== null && stopFlag == false) {
	    recColumn(line, func, stop);
	    recLine(line.neighbours.bottomRight, func, stop);
	}
    };
    
    return (function(func, stop) {
	stopFlag = false;
	recLine(this.grid, func, stop);
    });
})();

Grid.prototype.hexUnderCursor = function(x, y) {
    var result = false;
    var inside = true;
    if (x >= this.border.left && x <= this.border.right && y >= this.border.top && y <= this.border.bottom) {
	this.eachUntil(function (hex) { result = hex; }, function (hex) { inside = hex.isInside(x, y); return inside; });
    }
    return inside && result;
};


Grid.prototype.draw = function(canvas) {
    var recColumn = function(column) {
	if (column !== null) {
	    column.draw(canvas);
	    recColumn(column.neighbours.right);
	}
    };
    
    var recLine = function(line) {
	if (line !== null) {
	    recColumn(line);
	    recLine(line.neighbours.bottomRight);
	}
    };

    recLine(this.grid);
};


var canvas = null;
var grid = null;

function cleanPosition(event) {
    var target = event.originalTarget;
    return {
	x: event.clientX - target.clientLeft,
	y: event.clientY - target.clientTop
    };
}

window.addEventListener('load',
			function () {
			    window.canvas = document.getElementById('board-canvas').getContext('2d');
			    grid = new Grid(7,7,15);
			    grid._buildGrid(10,10);
			    grid.draw(canvas);

			    document.getElementById('board-canvas').addEventListener(
				'mousemove',
				function(event) { 
				    var pos = cleanPosition(event);
				    console.log(grid.hexUnderCursor(pos.x, pos.y));
				});
			    // window.setInterval(
			    // 	function () {
			    // 	    grid.draw(canvas);
			    // 	},
			    // 	1000/24
			    // );
			},
			false);
