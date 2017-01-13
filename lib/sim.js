(function(module){
	var utils = require('./utils');
	
	function ListNode () {
		this.next = this.prev = undefined;
	}

	function MinQueue(data) {
		this.head = new ListNode();
		this.tail = new ListNode();
		this.head.next = this.tail;
		this.head.prev = this.head;
		this.tail.prev = this.head;
		this.tail.next = this.tail;
		this.comparator = data.comparator;
		this.length = 0;
	}
	
	(function(p){
		/**
		Add a node to the list in the correct sorting order.
		Complexity: N - number of elements in the list, Time: O(N), Space: O(1)
		*/
		p.addNode = function(n) {
			var t = this.head.next;
			while(t !== this.tail && this.comparator(t,n) <= 0) { //find the sorted possition
				t = t.next;
			}
			n.prev = t.prev;
			n.next = t;
			t.prev.next = n;
			t.prev = n;
			this.length++;
		};
		
		/**
		Remove the smallest item in the list
		Complexity: N - number of nodes in the list, Time: O(1), Space: O(1)
		*/
		p.popMin = function () {
			var res = undefined;
			if (this.head.next !== this.tail) {
				res = this.head.next;
				this.head.next = res.next;
				res.next.prev = this.head;
				res.next = res.prev = undefined;
				this.length--;
			}
			return res;
		};
	})(MinQueue.prototype);
	
	function Event(data) {
		ListNode.call(this,data);
		if (data.t === undefined) {
			throw "Event: time must be specified";
		}
		this.t = data.t;
		this.context = data.context;
		this.action = data.action || utils.noop;
		this.args = data.args || [];
	}
	
	(function(p){
		p.fire = function() {
			this.action.apply(this.context,[this].concat(this.args));	
		};
		p.log = function(msg){
			console.log(this.t + ": " + msg);
		};
	})(Event.prototype);
	
	function eventComparator(e1, e2) {
		return e1.t - e2.t;
	}

	function EventScheduler(data) {
		this._q = new MinQueue({comparator:eventComparator})
		this._t = data.time || 0;
	}
	
	(function(p){
		p.schedule = function(e) {
			this._q.addNode(e);
		};
		p.time = function () {
			return this._t;
		}
		
		p.process = function () {
			var e = this._q.popMin();	
			if (e !== undefined) {
				this._t = e.t;
				e.fire();
			}
			return e;
		};
	})(EventScheduler.prototype);
	
	var defaultScheduler = new EventScheduler({});
	
	function Request(data) {
		this._done = [];
	}
	
	(function(p){
		p.done = function (callback,context,args) {
			context = context || this;
			args = args || [];
			this._done.push([callback,context,args]);
			return this;
		};
		p.resolve = function (value) {
			var self = this;
			this._done.forEach(function(arr){
				arr[0].apply(arr[1],[self,value].concat(arr[2]));
			});	
		};
	})(Request.prototype);
	
	function TimedObject(data) {
		this._scheduler = data.scheduler || defaultScheduler;
	}
		
	(function(p){
		p.time = function () {
			return this._scheduler.time();
		}
	
		p.schedule = function (dt, action, context, args) {
			var e = new Event({t:(this.time()+dt),context:context,action:action,args:args});
			this._scheduler.schedule(e);
		};
	})(TimedObject.prototype);
	
	Event.comparator = eventComparator;
	
	module.exports = {
		'ListNode':ListNode,
		'MinQueue':MinQueue,
		'Event':Event,
		'EventScheduler':EventScheduler,
		'Request':Request,
		'TimedObject':TimedObject
	};
})(module);