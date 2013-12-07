'use strict';

var Utils = {
    degToRad: function(deg) {
	return deg * Math.PI / 180;
    },

    clone: function(obj) {
	var tmp = {};
	
	Object.keys(obj).forEach(function (elem) {
	    tmp[elem] = obj[elem];
	});

	return tmp;
    }
};

var Hex = function(x, y, grid) {
    this.inisideColor = null;
    this.id = Hex.prototype.countId++;
    this.played = null;
    this.grid = grid;
    this.x = x;
    this.y = y;
    this.borderColor = 'black';
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

Hex.prototype.countId = 0;

Hex.prototype.lengthSin = function() {
    return this.grid.lengthSin;
};

Hex.prototype.lengthCos = function() {
    return this.grid.lengthCos;
};

Hex.prototype.hexagonPosition = function() {
    var a = {
	x: this.x - this.lengthSin(),
	y: this.y + this.lengthCos()
    };
    var b = {
	x: a.x,
	y: a.y + this.grid.length
    };
    var c = {
	x: b.x + this.lengthSin(),
	y: b.y + this.lengthCos()
    };
    var d = {
	x: c.x + this.lengthSin(),
	y: c.y - this.lengthCos()
    };
    var e = {
	x: d.x,
	y: d.y - this.grid.length
    };

    return [{x: this.x, y: this.y}, a, b, c, d, e];
};

Hex.prototype.isInside = function(x, y) {
    var pos = this.hexagonPosition();
    
    if (x < pos[1].x || y < pos[0].y || y > pos[3].y || x > pos[4].x) {
	return false;
    }

    if ((x > pos[1].x) && (x < pos[5].x) && (y > pos[1].y) && (y < pos[2].y)) {
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
    pos.x = pos.x + 2 * this.lengthSin();
    return pos;
};

Hex.prototype.bottomStartPosition = function() {
    return this.hexagonPosition()[4];
};

Hex.prototype.draw = function(canvas) {
    var pos = this.hexagonPosition();
    var oldStrokeStyle = canvas.strokeStyle;
    var oldFillStyle = canvas.fillStyle;

    canvas.strokeStyle = this.borderColor;
    canvas.fillStyle = this.played ? 
	(this.played == 'A' ? 'black' : 'blue') :
    'white';

    canvas.beginPath();
    canvas.moveTo(pos[0].x, pos[0].y);
    pos = pos.splice(1);
    pos.forEach(function (pos) {
	canvas.lineTo(pos.x, pos.y);
    });

    canvas.closePath();
    canvas.fill();
    canvas.stroke();

    canvas.strokeStyle = oldStrokeStyle;
    canvas.fillStyle = oldFillStyle;
};

var Grid = function(lines, columns, length) { 
    this.lengthCos = Math.cos(Utils.degToRad(60.0)) * length;
    this.lengthSin = Math.sin(Utils.degToRad(60.0)) * length;
    this.length = length;
    this.lines = lines;
    this.columns = columns;
    this.grid = null;
    this.indexedGrid = {};
    this.notPlayed = {};
    this.played = {};
    this.border = {
	top: null,
	bottom: null,
	right: null,
	left: null
    };
};

Grid.prototype._buildGrid = function(x, y) {
    var lastHex = null;
    var start = new Hex(x, y, this);
    var currentHex = start;
    var pos = null;
    var firstElem = start;

    this.indexedGrid[start.id] = start;

    this.border.top = y;
    this.border.bottom = y + this.lines * (this.length + this.lengthCos);
    this.border.right = (x - this.lengthSin) + (2 * this.columns) * this.lengthSin + (this.lines - 1) * this.lengthSin;
    this.border.left = (x - this.lengthSin);

    for (var j = 0; j < this.lines; j++) {
	for (var i = 1; i < this.columns; i++) {
	    if (i == 1) {
		firstElem = currentHex;
	    }
	    lastHex = currentHex;
	    pos = lastHex.nextStartPosition();

	    currentHex = new Hex(pos.x, pos.y, this);
	    this.indexedGrid[currentHex.id] = currentHex;

	    lastHex.neighbours.right = currentHex;
	    currentHex.neighbours.left = lastHex;

	    if (lastHex.neighbours.topRight) {
		currentHex.neighbours.topLeft = lastHex.neighbours.topRight;
		currentHex.neighbours.topLeft.neighbours.bottomLeft = lastHex;
		currentHex.neighbours.topRight = currentHex.neighbours.topLeft.neighbours.right;
		lastHex.neighbours.topRight.neighbours.bottomRight = currentHex;
	    }
	}
	
	if ((j + 1) != this.lines) {
	    currentHex = new Hex(firstElem.bottomStartPosition().x,
				 firstElem.bottomStartPosition().y,
				 this);
	    this.indexedGrid[currentHex.id] = currentHex;

	    currentHex.neighbours.topLeft = firstElem;
	    firstElem.neighbours.bottomRight = currentHex;
	    currentHex.neighbours.topRight = firstElem.neighbours.right;
	    if (firstElem.neighbours.right) {
		firstElem.neighbours.right.bottomLeft = currentHex;
	    }
	}
    }
    
    this.notPlayed = Utils.clone(this.indexedGrid);
    
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

Grid.prototype.isWinnerA = function() {
    var currentCandidates = (function /*let*/ (start) {
	var currentCandidates = {};
	while (start) {
	    if (start.played == 'A') {
		currentCandidates[start.id] = true;
	    }
	    start = start.neighbours.right;
	}
	return currentCandidates;
    })(this.grid);

    var start = this.grid.neighbours.bottomRight;
    var nextCandidates = {};
    var that = this;
    while (start) {
	Object.keys(currentCandidates).forEach(function (elem) {
	    elem = that.indexedGrid[elem];
	    var br = elem.neighbours.bottomRight;
	    if (br !== null && br.played == 'A') {
		nextCandidates[br.id] = true;

		var r = br.neighbours.right;
		while (r !== null && r.played == 'A') {
	    	    nextCandidates[r.id] = true;
		    r = r.neighbours.right;
		}
	    }
	    var bl = elem.neighbours.bottomLeft;
	    if (bl !== null && bl.played == 'A') {
		nextCandidates[bl.id] = true;

		var l = bl.neighbours.left;
		while (l !== null && l.played == 'A') {
	    	    nextCandidates[l.id] = true;
		    l = l.neighbours.left;
		}
	    }

	});
	
	start = start.neighbours.bottomRight;
	if (Object.keys(nextCandidates).length === 0) {
	    return false;
	}
	currentCandidates = nextCandidates;
	nextCandidates = {};
    }

    return Object.keys(currentCandidates).length > 0;
};

Grid.prototype.isWinnerB = function() {
    var currentCandidates = (function /*let*/ (start) {
	var currentCandidates = {};
	while (start) {
	    if (start.played == 'B') {
		currentCandidates[start.id] = true;
	    }
	    start = start.neighbours.bottomRight;
	}
	return currentCandidates;
    })(this.grid);

    var start = this.grid.neighbours.right;
    var nextCandidates = {};
    var that = this;
    while (start) {
	Object.keys(currentCandidates).forEach(function (elem) {
	    elem = that.indexedGrid[elem];
	    var br = elem.neighbours.bottomRight;
	    if (br !== null && br.played == 'B') {
		nextCandidates[br.id] = true;

		var swap = true;
		var bottom = br.neighbours.bottomLeft;
		while (bottom !== null && bottom.played == 'B') {
		    nextCandidates[bottom.id] = true;
		    if (swap) {
			bottom = bottom.neighbours.bottomRight;
		    } else {
			bottom = bottom.neighbours.bottomLeft;
		    }
		    swap = !swap;
		}
	    }

	    var r = elem.neighbours.right;
	    if (r !== null && r.played == 'B') {
		nextCandidates[r.id] = true;
	    }
	    
	    var tr = elem.neighbours.topRight;
	    if (tr !== null && tr.played == 'B') {
		nextCandidates[tr.id] = true;

		swap = true;
		var top = tr.neighbours.topLeft;
		while (top !== null && top.played == 'B') {
		    nextCandidates[top.id] = true;
		    if (swap) {
			top = top.neighbours.topRight;
		    } else {
			top = top.neighbours.topLeft;
		    }
		    swap = !swap;
		}
	    }

	});
	
	start = start.neighbours.right;
	if (Object.keys(nextCandidates).length === 0) {
	    return false;
	}
	currentCandidates = nextCandidates;
	nextCandidates = {};
    }

    return Object.keys(currentCandidates).length > 0;
};

Grid.prototype.isWinner = function() {
    if (this.isWinnerA()) {
	return 'A';
    } else if (this.isWinnerB()) {
	return 'B';
    }

    return false;
};


var canvas = null;
var grid = null;

function cleanPosition(event) {
    var target = event.originalTarget;
    return {
	x: event.pageX - canvas.extra.clientLeft,
	y: event.pageY - canvas.extra.clientTop
    };
}

function startCanvas() {
    var dom = document.getElementById('board-canvas');
    window.canvas = dom.getContext('2d');

    var sumLeft = 0;
    var sumTop = 0;
    var rect = dom.getClientRects();
    for (var i = 0; i < rect.length; i++) {
	sumLeft += rect[i].left;
	sumTop += rect[i].top;
    }

    window.canvas.extra = {
	clientLeft: dom.clientLeft + sumLeft,
	clientTop: dom.clientTop + sumTop
    };
}

var state = {
    currentHexMouseOn: false,
    needToRedraw: false,
    player: 'A'
};

function state_play(hex) {
    hex.insideColor = state.player == 'A' ? 'black' : 'blue';

    grid.played[hex.id] = true;
    delete grid.notPlayed[hex.id];

    hex.played = state.player;
    state.player = state.player == 'A' ? 'B' : 'A';
    state.needToRedraw = true;

    var win = grid.isWinner();
    if (win) {
	var elem = document.getElementById('board-canvas');
	var parent = elem.parentNode;
	elem.remove();
	var message = document.createElement('div');
	message.textContent = 'Player ' + win + ' has won the crap.';
	parent.appendChild(message);
    }
}

window.addEventListener('load',
			function () {
			    startCanvas();
			    grid = new Grid(10,10,18);
			    grid._buildGrid(10,10);

			    document.getElementById('board-canvas').addEventListener(
				'mousemove',
				function(event) { 
				    var pos = cleanPosition(event);
				    if (state.currentHexMouseOn) {
					if (!state.currentHexMouseOn.isInside(pos.x, pos.y)) {
					    state.needToRedraw = true;
					    state.currentHexMouseOn.borderColor = 'black';
					    state.currentHexMouseOn = grid.hexUnderCursor(pos.x, pos.y);
					    state.currentHexMouseOn.borderColor = 'orange';
					}
				    } else {
					state.needToRedraw = true;
					state.currentHexMouseOn = grid.hexUnderCursor(pos.x, pos.y);
					state.currentHexMouseOn.borderColor = 'orange';
				    }
				});

			    document.getElementById('board-canvas').addEventListener(
				'click',
				function(event) {
				    if (state.currentHexMouseOn && state.currentHexMouseOn.played === null) {
					
					state_play(state.currentHexMouseOn);

					state_play(playIA());
			
				    }
				});
			    window.setInterval(
			    	function () {
				    if (state.needToRedraw) {
					canvas.fillStyle = 'white';
					canvas.fillRect(0,0,300,500);
			    		grid.draw(canvas);
					if (state.currentHexMouseOn) {
					    state.currentHexMouseOn.draw(canvas);
					}
				    }
				    state.needToRedraw = false;
			    	},
			    	1000/24
			    );
			},
			false);

function playIA() {
    var keys = Object.keys(grid.notPlayed);
    var elem = Math.trunc(Math.random() / (1.0 / keys.length));
    return grid.notPlayed[keys[elem]];;
}
