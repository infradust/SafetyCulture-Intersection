'use strict';
(function(module){
	var utils = require('./utils');
	var noop = utils.noop;
	
	var sim = require('./sim');
	var TimedObject = sim.TimedObject;
	var Request = sim.Request;
	
	var keyCounter = 0;
	var COLORS = {
		STOP: "red",
		TRANSITION: "yellow",
		GO: "green"
	};
	var DIRECTIONS = {
		IN:0,
		OUT:1
	};
	
	function directionToString(v) {
		for (let k in DIRECTIONS) {
			if (DIRECTIONS[k] === v) {
				return k;
			}
		}
		return undefined;
	}
	
	function nextKey() {
	    return 'k'+keyCounter++;
	}

	function genKey(key) {
		return (key === undefined ? nextKey() : key.toString());	
	}	
	
	function Keyable(data) {
		this.key = genKey(data.key);
	}	
		
	function Lane(data) {
		Keyable.call(this,data);
	    if (data.placement === undefined) {
		    throw "Lane placement cannot be undefined";
	    }
	    this.placement = data.placement;
	    this.direction = data.direction === undefined ? DIRECTIONS.IN : data.direction;
	}
	
	(function(p){
		p.toString = function () {
			return this.key + ": (" + this.placement + "," + directionToString(this.direction) + ")";	
		};
	})(Lane.prototype);
	
	function lanesIntersect(s1,d1,s2,d2) {
		if ( (s2.placement <= s1.placement && d2.placement >= s1.placement && (d1.placement <= s2.placement || d1.placement >= d2.placement)) ||
			 (s2.placement >= s1.placement && d2.placement <= s1.placement && (d1.placement >= s2.placement || d1.placement <= d2.placement)) ||
			 (s2.placement <= d1.placement && d2.placement >= d1.placement && (s1.placement <= s2.placement || s1.placement >= d2.placement)) ||
			 (s2.placement >= d1.placement && d2.placement <= d1.placement && (s1.placement >= s2.placement || s1.placement <= d2.placement))
			) {
				return true;
			}
			return false;
	}

	
	function LaneDestinationMapping(data) {
		Keyable.call(this,data);
		if (data.source === undefined || data.source.direction !== DIRECTIONS.IN) {
			throw "A destination mapping must have a source and it must enter the intersection";
		}
		this.source = data.source;
		
		if (data.destinations === undefined || Array.isArray(data.destinations) === false || data.destinations.length === 0) {
			throw "A destination mapping must contain at least one destination";	
		}
		data.destinations.forEach(function(d){
			if (d.direction !== DIRECTIONS.OUT) {
				throw "destination mapping: destination lane must be directed outwards";
			}
		});
		this.destinations = data.destinations.slice();
	}
	
	(function(p){
		p.toString = function() {
			var dests = [];
			this.destinations.forEach(function(d){
				dests.push("(" + d.key +"," + d.placement + ")");
			});
			return this.key + ": (" + this.source.key + "," + this.source.placement + ")->["+dests.join(",")+"]";
		};
	})(LaneDestinationMapping.prototype);
		
	function mappingsIntersect(m1, m2) {
		for (let i = 0; i<m2.destinations.length; ++i) {
			for (let j = 0; j<m1.destinations.length; ++j) {
				if (lanesIntersect(m1.source,m1.destinations[j],m2.source,m2.destinations[i])) {
					return true;
				}
			}
		}
		return false;
	}
		
	function TrafficLight(data) {
		TimedObject.call(this,data);
		this.key = genKey(data.key);
		if (data.mappings === undefined || Array.isArray(data.mappings) === false || data.mappings.length === 0) {
			throw "A traffic light must have lane mappings";
		}
	    this.mappings = data.mappings.slice();
	    for (let i = 0; i < this.mappings.length; ++i) {
		    for (let j = i+1; j < this.mappings.length; ++j) {
			    if (mappingsIntersect(this.mappings[i], this.mappings[j])) {
				    throw "The same traffic light cannot serve intersecting mappings"
			    }
		    }
	    }
	    this.color = COLORS.STOP;
	    this.toggling = false;
	    this._nextToggle = this.constructor.prototype.toggle_from_stop;
	    this.transitionDelay = data.transitionDelay === undefined ? 30 : data.transitionDelay;
	}
	
	function trafficlighsIntersect(tl1,tl2) {
		for (let i = 0; i<tl1.mappings.length; ++i) {
			for (let j = 0; j<tl2.mappings.length; ++j) {
				if (mappingsIntersect(tl1.mappings[i],tl2.mappings[j])) {
					return true;
				}
			}
		}
		return false;
	}
	utils.setBase(TrafficLight,TimedObject);
	
	(function(p){
		p.toString = function(){
			var mps = [];
			this.mappings.forEach(function(m){
				mps.push(m.toString());
			});
			return this.key + ": " + this.color +" [" + mps.join(",") + "]";
		};
		
		p.transition = function(e,r) {
			this.color = COLORS.TRANSITION;
			e.log(this.toString());
			this.schedule(this.transitionDelay,this.transition_stop,this,[r]);
		};
		
		p.transition_stop = function(e,r) {
			this.color = COLORS.STOP;
			e.log(this.toString());
			this.resolve(r);
		};
		
		p.transition_go = function (e,r) {
			this.color = COLORS.GO;
			e.log(this.toString());
			this.resolve(r);
		};
		
		p.resolve = function(r) {
			this.toggling = false;
			r.resolve(this);
		};
		
		p.toggle = function() {
			if (this.toggling) {
				return;
			}
			this.toggling = true;
			var r = new Request();
			this._nextToggle(r);
			return r;
		};
		
	    p.toggle_from_go = function (r) {
	    	this.schedule(0,this.transition,this,[r]);
	    	this._nextToggle = p.toggle_from_stop;
	    };
	    	    
	    p.toggle_from_stop = function (r) {
	    	this.schedule(0,this.transition_go,this,[r]);
	    	this._nextToggle = p.toggle_from_go;
	    };
	    
	})(TrafficLight.prototype);
	
	/**
	Bunch together a group of NON-intersecting trafficlights and treat them as a single unit
	*/
	function TrafficLightGroup(data) {
		Keyable.call(this,data);
		this.lights = [];
		this.done = 0;
		this.toggling = false;
		this.request = undefined;
	}
	
	(function(p){
		/**
		monitor the completion of toggling of all trafficlights in the group.
		
		@param r: the request object
		@param value: the resolution value
		@param tl: the trafficlight that completed its color transition
		*/
		p.lightToggled = function(r,value,tl) {
			this.done++;
			if (this.done === this.lights.length) {
				this.toggling = false;
				this.request.resolve(this);
				this.request = undefined;
			}
		};
		
		/**
		only NON-intersecting trafficlights will be added to the group.
		
		@param: tl: a trafficlight to add
		@return: false if no addition was made, true otherwise
		*/
		p.addTrafficLight = function(tl) {
			var res = true;
			for (let i = 0; i<this.lights.length; ++i) {
				if (trafficlighsIntersect(tl,this.lights[i])) {
					return false;
				}
			}
			this.lights.push(tl);
			return true;
		};
		/**
		Toggle together all traffic lights and return a request object.
		the request will be resolved only when all trafficlight have comleted their color transition.
		
		@return: undefined if the group is already toggling, request otherwise
		*/
		p.toggle = function () {
			if (this.toggling) {
				return;
			}
			this.request = new Request();
			this.done = 0;
			this.toggling = true;
			var self = this;
			this.lights.forEach(function(tl){
				tl.toggle().done(p.lightToggled, self, [tl]);
			});
			return this.request;
		};
	})(TrafficLightGroup.prototype);
	
	/**
	Create a list of non-intersecting trafficlight groups.
	Does not change the original array.
	Uses a greedy aproach, non necceserally THE optimized set of groups.
	
	@param lights: an array of trafficlights to find non-intersecting groups in
	@return An array of trafficlights groups
	*/
	function groupifyLights(lights) {
		var rem = lights.slice();
		var groups = [];
		while(rem.length) {
			let g = new TrafficLightGroup({});
			groups.push(g);
			g.addTrafficLight(rem[0]);
			let j = 1;
			while (j < rem.length) {
				if (g.addTrafficLight(rem[j])) {
					rem.splice(j, 1);
				} else {
					j++;
				}
			}
			rem.splice(0,1);
		}
		return groups;
	}
	
	function Intersection(data) {
		TimedObject.call(this,data);
		if (data.trafficLights === undefined || Array.isArray(data.trafficLights) === false || data.trafficLights.length === 0) {
			throw "An intersection must contain at least one trafficlight";
		}
		this.trafficLights = data.trafficLights.slice();
		this.switchGroupDelay = data.switchGroupDelay === undefined ? 5*60 : data.switchGroupDelay; 
		this.groups = groupifyLights(this.trafficLights);
		this.toggling = false;
		this.currentGroup = undefined;
		this.nextGroup = 0;
		this.request = undefined;
		this.key = genKey(data.key);
	}
	utils.setBase(Intersection,TimedObject);
	
	(function(p){
		p.toggleDone = function(r,v,g) {
			this.toggling = false;
			this.request.resolve(this);
			this.request = undefined;
			this.currentGroup = this.nextGroup;
			this.nextGroup++;
			this.nextGroup %= this.groups.length;
			this.schedule(this.switchGroupDelay, p.toggle,this,[]);
		};
		
		p.toggleActive = function () {
			this.groups[this.currentGroup].toggle().done(p.toggleNext,this,[]);	
		};
		
		p.toggleNext = function () {
			this.groups[this.nextGroup]
				.toggle()
				.done(p.toggleDone,this,[]);
		};
		
		p.toggle = function() {
			if (this.toggling) {
				return;
			}
			this.request = new Request();
			this.toggling = true;
			if (this.currentGroup !== undefined && this.groups.length > 1) {
				this.toggleActive();
			} else {
				this.toggleNext();
			}
			return this.request;
		};
		
		p.start = function(){
			this.schedule(0, p.toggle, this, []);
		};
		
	})(Intersection.prototype);
	
	Lane.lanesIntersect = lanesIntersect;
	LaneDestinationMapping.mappingsIntersect = mappingsIntersect;
	TrafficLight.trafficlighsIntersect = trafficlighsIntersect;
	TrafficLightGroup.groupifyLights = groupifyLights;
	
	module.exports = {
		'DIRECTIONS':DIRECTIONS,
		'COLORS':COLORS,
		'Lane':Lane,
		'LaneDestinationMapping':LaneDestinationMapping,
		'TrafficLight':TrafficLight,
		'TrafficLightGroup':TrafficLightGroup,
		'Intersection':Intersection
	};

})(module);
