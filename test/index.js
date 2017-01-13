'use strict';

var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect    = chai.expect;
var assert = require('assert');

var junctionTask = require('../lib');
var sim = require('../lib/sim');
var utils = require('../lib/utils');



describe('sim',function(){
	var ListNode = sim.ListNode;
	var MinQueue = sim.MinQueue;
	var Event = sim.Event;
	Event.prototype.log = utils.noop; //silence event logging
	var EventScheduler = sim.EventScheduler;
	var Request = sim.Request;
	var TimedObject = sim.TimedObject;

	function createLinstNodes(n) {
		var nodes = [];
		for (let i = 0; i < n; ++i) {
			let m = new ListNode();
			m.value = i;
			nodes.push(m);
		}
		return nodes;
	}
	
	describe('ListNode',function(){
		describe('ListNode - creation',function(){
			var l = new ListNode();
			it('should initialize prev and next to undefined',function(){
				expect(l.left).to.be.undefined;
				expect(l.right).to.be.undefined;
			});
		});
	});
	describe('MinQueue',function(){
		describe('MinQueue - creation',function(){
			var q = new MinQueue({});
			it('should initialize head to point to tail and vise versa',function(){
				expect(q.head.next).to.equal(q.tail);
				expect(q.tail.prev).to.equal(q.head);
			});
			it('should initialize head prev to point to head and tail next to tail',function(){
				expect(q.head.prev).to.equal(q.head);
				expect(q.tail.next).to.equal(q.tail);
			});
			it('should initialize length to 0',function(){
				expect(q.length).to.equal(0);
			});
		});
		describe('MinQueue - nodes',function(){
			function comp(a,b) {
				return a.value-b.value;
			}
			var nodes = createLinstNodes(10);
			var q = new MinQueue({comparator:comp});
			q.addNode(nodes[6]);
			q.addNode(nodes[3]);
			q.addNode(nodes[4]);
			q.addNode(nodes[7]);
			q.addNode(nodes[2]);
			var lst = [nodes[2],nodes[3],nodes[4],nodes[6],nodes[7]];
			it('should add nodes sorted by comparator',function(){
				var n = q.head.next;
				var i = 0;
				while (n !== q.tail) {
					expect(n.value).to.equal(lst[i].value);
					i++;
					n = n.next;
				}
			});
			it('should keep the length of the queue',function(){
				expect(q.length).to.equal(lst.length);
			});
			it('should pop the minimum element and track the length correctly',function(){
				var l = q.length;
				for (let l = q.length; l > 0; --l) {
					let n = q.popMin();
					expect(n).to.equal(lst[lst.length-l]);
					expect(q.length).to.equal(l-1)
				}
			});
			it('should return undefined when popping an empty queue',function(){
				expect(q.popMin()).to.be.undefined;
				
			});
			
			
		});
	});
	describe('Event',function(){
		describe('Event - creation',function(){
			it('shuold throw is no time is specified',function(){
				expect(function(){new Event({});}).to.throw("Event: time must be specified");
			});
		});
		describe('Event - fire',function(){
			it('should call the callback properly',function(){
				var o = {f:function(e,a,b,c){
					expect(this).to.equal(o);
					expect(e.t).to.equal(4);
					expect(a).to.equal(1);
					expect(b).to.equal(2);
					expect(c).to.equal(3);
				}};
				var spy = chai.spy(o.f);
				var evt = new Event({t:4,action:spy,context:o,args:[1,2,3]});
				evt.fire();
				expect(spy).to.have.been.called.once;
			});
		});
		describe('Event - comparator',function(){
			it('should return ascending order',function(){
				var e1 = new Event({t:6});
				var e2 = new Event({t:100});
				expect(Event.comparator(e1,e2)).to.be.below(0);
				expect(Event.comparator(e2,e1)).to.be.above(0);
				expect(Event.comparator(e1,e1)).to.equal(0);
			});
		});
		
	});
	describe('EventScheduler',function(){
		describe('EventScheduler - creation',function(){
			var t = 300
			var s = new EventScheduler({time:t});
			it('should create and empty queue',function(){
				expect(s._q.length).to.equal(0);
			});
			it('should set the time properly',function(){
				expect(s._t).to.equal(t);
			});
		});
		describe('EventScheduler - operations',function(){
			var t = 300;
			var s = new EventScheduler({time:t});
			it('should return the current time',function(){
				expect(s.time()).to.equal(t);
			});
			var e1 = new Event({t:500});
			var e2 = new Event({t:400});
			s.schedule(e1);
			s.schedule(e2);
			it('should progress properly',function(){
				s.process();
				expect(s.time()).to.equal(e2.t);
				s.process();
				expect(s.time()).to.equal(e1.t);
			});
		});
		
	});
	describe('Request',function(){
		describe('Request - creation',function(){
		});
		describe('Request - done',function(){
			it('should call all registered done callbacks properly',function(){
				var r = new Request();
				function d1(res,value,a,b) {
					expect(this).to.equal(r);
					expect(res).to.equal(r);
					expect(value).to.equal(3);
					expect(a).to.equal(1);
					expect(b).to.equal(2);
				}
				var o = {
					f:function(res,value){
						expect(this).to.equal(o);
						expect(res).to.equal(r);
						expect(value).to.equal(3);
					}
				};
				var spy1 = chai.spy(d1);
				var spy2 = chai.spy(o.f);
				r.done(spy1,undefined,[1,2]).done(spy2,o);
				r.resolve(3);
				expect(spy1).to.have.been.called.once;
				expect(spy2).to.have.been.called.once;
			});
			
		});
		
	});
	describe('TimedObject',function(){
		describe('TimedObject - creation',function(){
			it('should have a default scheduler',function(){
				var o = new TimedObject({});
				expect(o._scheduler).to.not.be.undefined;
			});
			it('should set the scheduler properly',function(){
				var sched = new EventScheduler({time:100});
				var o = new TimedObject({scheduler:sched});
				expect(o._scheduler).to.equal(sched);
			});
		});
		describe('TimedObject - operations',function(){
			var sched = new EventScheduler({time:100});
			var e = new Event({t:200});
			sched.schedule(e);
			var o = new TimedObject({scheduler:sched});
			it('should show the correct time',function(){
				expect(o.time()).to.equal(sched.time());
				sched.process();
				expect(o.time()).to.equal(sched.time());				
			});
			it('shuold schedule an event properly',function(){
				function op(e,a,b) {
					expect(e.t).to.equal(sched.time());
					expect(a).to.equal(1);
					expect(b).to.equal(2);
				}
				o.schedule(10,op,undefined,[1,2]);
				sched.process();
			});
			
		});
	});
	describe('',function(){});
});


describe('junction-task', function () {
/*
	var sortLaneMap = junctionTask.Lane.sortLaneMap;
	var laneOrderFunc = Lane.laneOrderFunc;
*/
	var COLORS = junctionTask.COLORS;
	var DIRECTIONS = junctionTask.DIRECTIONS;
	var Lane = junctionTask.Lane;
	var intersect = Lane.lanesIntersect;
	var LaneDestinationMapping = junctionTask.LaneDestinationMapping;
	var mapIntersect = LaneDestinationMapping.mappingsIntersect;
	var TrafficLight = junctionTask.TrafficLight;
	var tlIntersect = TrafficLight.trafficlighsIntersect;
	var Intersection = junctionTask.Intersection;
	var TrafficLightGroup = junctionTask.TrafficLightGroup;
	var groupify = TrafficLightGroup.groupifyLights;
	
	function createLanes(n) {
		var lanes = [];
		var dir = DIRECTIONS.IN;
		for (let i = 0; i<n; ++i) {
			lanes.push(new Lane({placement:i,direction:dir}));
			if(dir === DIRECTIONS.IN) {
				dir = DIRECTIONS.OUT;
			} else {
				dir = DIRECTIONS.IN;
			}
		}
		return lanes;
	}
	
	describe('Lane', function(){
		describe('Lane creation',function(){
			it('should throw error if no placement was given', function() {
				expect(function() {new Lane({});}).to.throw("Lane placement cannot be undefined");
			});
			it('should be assigned a key if one is not given',function(){
				var l = new Lane({placement:0});
				expect(l.key).to.not.be.undefined;
			});
			it('should transform key to string',function(){
				var l = new Lane({placement:0, key:1});
				expect(l.key).to.be.a('string');
			});
			it('should initialize direction to DIRECTIONS.IN',function(){
				var l = new Lane({placement:0});
				expect(l.direction).to.equal(DIRECTIONS.IN);
			});
			it('should copy the given parameters', function(){
				var params = {placement:1,direction:DIRECTIONS.OUT};
				var l = new Lane(params);
				for (let k in params) {
					expect(l[k]).to.equal(params[k]);
				}
			});
			
		});
		describe('Lanes intersection',function(){
			var lanes = [];
			for (let i = 0; i<10; ++i) {
				lanes.push(new Lane({placement:i}));
			}
			
			it('should return true when the first source (or destination) is between the other source and destination lanes and the first destination is not between them',function(){
				expect(intersect(lanes[2],lanes[4],lanes[1],lanes[3])).to.be.true;				
				expect(intersect(lanes[2],lanes[4],lanes[3],lanes[1])).to.be.true;				
				expect(intersect(lanes[4],lanes[2],lanes[1],lanes[3])).to.be.true;				
				expect(intersect(lanes[4],lanes[2],lanes[3],lanes[1])).to.be.true;				
				expect(intersect(lanes[5],lanes[2],lanes[4],lanes[6])).to.be.true;				
				expect(intersect(lanes[5],lanes[2],lanes[6],lanes[4])).to.be.true;				
				expect(intersect(lanes[2],lanes[5],lanes[4],lanes[6])).to.be.true;				
				expect(intersect(lanes[2],lanes[5],lanes[6],lanes[4])).to.be.true;				
			});
			it('should return false when there is no intersection',function(){
				expect(intersect(lanes[1],lanes[2],lanes[3],lanes[4])).to.be.false;				
				expect(intersect(lanes[1],lanes[2],lanes[4],lanes[3])).to.be.false;				
				expect(intersect(lanes[2],lanes[1],lanes[3],lanes[4])).to.be.false;				
				expect(intersect(lanes[2],lanes[1],lanes[4],lanes[3])).to.be.false;				
				expect(intersect(lanes[5],lanes[2],lanes[3],lanes[4])).to.be.false;				
				expect(intersect(lanes[5],lanes[2],lanes[4],lanes[3])).to.be.false;				
				expect(intersect(lanes[2],lanes[5],lanes[3],lanes[4])).to.be.false;				
				expect(intersect(lanes[2],lanes[5],lanes[4],lanes[3])).to.be.false;				
			});
			
		});
	});
	describe('LaneDestinationMapping',function(){
		var lanes = createLanes(20);
		describe('LaneDestinationMapping creation',function(){
			it('should throw exception if no source was given',function(){
				expect(function(){new LaneDestinationMapping({destinations:[lanes[1]]});}).to.throw("A destination mapping must have a source");
			});
			it('should throw exception if no destinations were given or not in array form',function(){
				expect(function(){new LaneDestinationMapping({source:lanes[0]});}).to.throw("A destination mapping must contain at least one destination");
				expect(function(){new LaneDestinationMapping({source:lanes[0],destinations:[]});}).to.throw("A destination mapping must contain at least one destination");
				expect(function(){new LaneDestinationMapping({source:lanes[0],destinations:lanes[1]});}).to.throw("A destination mapping must contain at least one destination");
			});
			it('should not keep a reference to the original destinations array',function(){
				var tmp = [lanes[1],lanes[3],lanes[5]];
				var l = tmp.length;
				var m = new LaneDestinationMapping({source:lanes[0],destinations:tmp});
				tmp.pop();
				expect(m.destinations.length).to.equal(l)
			});
			
		});
		var m1 = new LaneDestinationMapping({source:lanes[8],destinations:[lanes[3],lanes[15],lanes[5]]});
		describe('LaneDestinationMapping intersection',function(){
			it('should return true for any intersection',function(){
				var m2 = new LaneDestinationMapping({source:lanes[2],destinations:[lanes[1],lanes[17],lanes[13]]});
				var m3 = new LaneDestinationMapping({source:lanes[16],destinations:[lanes[1],lanes[9]]});
				var m4 = new LaneDestinationMapping({source:lanes[6],destinations:[lanes[5]]});
				expect(mapIntersect(m1,m2)).to.be.true;
				expect(mapIntersect(m1,m3)).to.be.true;
				expect(mapIntersect(m1,m4)).to.be.true;
			});
			it('should return false if there are no intersection',function(){
				var m5 = new LaneDestinationMapping({source:lanes[6],destinations:[lanes[7]]});
				var m6 = new LaneDestinationMapping({source:lanes[16],destinations:[lanes[1],lanes[17]]});
				expect(mapIntersect(m1,m5)).to.be.false;
				expect(mapIntersect(m1,m6)).to.be.false;
			});
		});
	});
	describe('TrafficLight',function(){
		var lanes = createLanes(20);
		
		var m1 = new LaneDestinationMapping({source:lanes[8],destinations:[lanes[3],lanes[15],lanes[5]]});
		var m2 = new LaneDestinationMapping({source:lanes[2],destinations:[lanes[1],lanes[11]]});
		var m5 = new LaneDestinationMapping({source:lanes[6],destinations:[lanes[7]]});
		describe('TrafficLight - creation',function(){
			it('should throw exception if no mappings were given or not in array form',function(){
				expect(function(){new TrafficLight({});}).to.throw("A traffic light must have lane mappings");
				expect(function(){new TrafficLight({mappings:m1});}).to.throw("A traffic light must have lane mappings");
				expect(function(){new TrafficLight({mappings:[]});}).to.throw("A traffic light must have lane mappings");
			});
			it('should not keep a reference to the original mappings array',function(){
				var tmp = [m1,m5];
				var l = tmp.length;
				var m = new TrafficLight({mappings:tmp});
				tmp.pop();
				expect(m.mappings.length).to.equal(l)
			});
			it('should not allow for intersecting mappings to be served by the same trafficlight',function(){
				expect(function(){new TrafficLight({mappings:[m1,m2]});}).to.throw("The same traffic light cannot serve intersecting mappings");
			});
			it('should allow for non-intersecting mappings to be served in tandem',function(){
				expect(function(){new TrafficLight({mappings:[m1,m5]});}).to.not.throw();
			});
			var tl = new TrafficLight({mappings:[m1,m5]});
			it('should be set to stop color on creation',function(){
				expect(tl.color).to.equal(COLORS.STOP);
				expect(tl._nextToggle).to.equal(TrafficLight.prototype.toggle_from_stop);
			});
			it('should have a default numeric value for go->transitino transition',function(){
				expect(tl.transitionDelay).to.not.be.undefined;
				expect(tl.transitionDelay).to.be.an('number');
			});
		});
		var es = new sim.EventScheduler({});
		var t_0 = es.time();
		var tl = new TrafficLight({mappings:[m1,m5],scheduler:es});
		describe('TrafficLight - toggling',function(){
			it('should move from STOP to GO',function(){
				tl.toggle().done(function(r){
					expect(tl.toggling).to.be.false;
					expect(this.time()).to.equal(es.time());
					expect(this.color).to.equal(COLORS.GO);
				},tl);
				expect(tl.toggling).to.be.true;
				es.process();
				expect(tl.toggling).to.be.false;
			});
			it('should take 0 time to move from STOP to GO',function(){
				expect(tl.time()).to.equal(t_0);
			});
			it('should move from GO to TRANSITION in 0 time and to STOP in transitionDelay time',function(){
				tl.toggle().done(function(r){
					expect(tl.toggling).to.be.false;
					expect(this.color).to.equal(COLORS.STOP);
					expect(this.time()).to.equal(t_0+tl.transitionDelay);
				},tl);
				expect(tl.toggling).to.be.true;				
				es.process();
				expect(tl.toggling).to.be.true;
				expect(tl.color).to.equal(COLORS.TRANSITION);
				es.process();
				expect(tl.toggling).to.be.false;
			});
		});
		describe('TrafficLight intersection',function(){
			var tl1 = new TrafficLight({mappings:[m1]});
			var tl2 = new TrafficLight({mappings:[m2]});
			var tl3 = new TrafficLight({mappings:[m5]});
			it('should return true when traffic lights intersect',function(){
				expect(tlIntersect(tl1,tl2)).to.be.true;	
			});
			it('should return false when traffic light do not intersect',function(){
				expect(tlIntersect(tl1,tl3)).to.be.false;
			});
		});
		
	});
	describe('TrafficLightGroup',function(){
		var lanes = createLanes(20);
		
		var m1 = new LaneDestinationMapping({source:lanes[8],destinations:[lanes[3],lanes[15],lanes[5]]});
		var m2 = new LaneDestinationMapping({source:lanes[2],destinations:[lanes[1],lanes[11]]});
		var m3 = new LaneDestinationMapping({source:lanes[6],destinations:[lanes[7]]});
		
		var es = new sim.EventScheduler({});
		var tl1 = new TrafficLight({mappings:[m1],scheduler:es,transitionDelay:500});
		var tl2 = new TrafficLight({mappings:[m2],scheduler:es,transitionDelay:1000});
		var tl3 = new TrafficLight({mappings:[m3],scheduler:es,transitionDelay:1500});
		describe('TrafficLightGroup - creation',function(){
			var g = new TrafficLightGroup({});
			it('should have no trafficlights in it',function(){
				expect(g.lights.length).to.equal(0);
			});
			it('should have set done to 0',function(){
				expect(g.done).to.equal(0);
			});
			it('should set toggeling flag to default: false',function(){
				expect(g.toggling).to.be.false;
			});
			it('sould not set anything in request',function(){
				expect(g.request).to.be.undefined;
			});
		});
		
		describe('TrafficLightGroup - operations',function(){
			describe('add',function(){
				var g = new TrafficLightGroup({});
				it('should add the first trafficligh without problems',function(){
					expect(g.addTrafficLight(tl1)).to.be.true;
				});
				it('should not allow addition of intersecting trafficlights',function(){
					var l = g.lights.length;
					expect(g.addTrafficLight(tl2)).to.be.false;
					expect(g.lights.length).to.equal(l);
				});
				it('should allow addition of non-intersecting trafficlights',function(){
					var l = g.lights.length;
					expect(g.addTrafficLight(tl3)).to.be.true;
					expect(g.lights.length).to.equal(l+1);
				});
			});
			describe('toggle',function(){
				var g = new TrafficLightGroup({});
				g.addTrafficLight(tl1);
				g.addTrafficLight(tl3);
				it('should toggle all from STOP to GO',function(){
					g.toggle().done(function(r){
						expect(g.toggling).to.be.false;
						expect(tl1.color).to.equal(COLORS.GO);	
						expect(tl3.color).to.equal(COLORS.GO);	
					});
					expect(g.toggling).to.be.true;
					while(es._q.head.next!=es._q.tail) es.process();
				});
				it('should toggle all from GO to STOP and progress to the maximal transition delay time',function(){
					g.toggle().done(function(r){
						expect(g.toggling).to.be.false;
						expect(tl1.color).to.equal(COLORS.STOP);	
						expect(tl3.color).to.equal(COLORS.STOP);
						expect(es.time()).to.equal(Math.max(tl1.transitionDelay,tl3.transitionDelay));	
					});
					expect(g.toggling).to.be.true;
					while(es._q.head.next!==es._q.tail) es.process();
				});
				
			});

		});
		describe('TrafficLightGroup - groupify',function(){
			it('should return merge 2 of these trafficlights to a single group',function(){
				var groups = TrafficLightGroup.groupifyLights([tl1,tl2,tl3]);
				expect(groups.length).to.equal(2);
			}); 				
		});
	});
	describe('Intersection',function(){
		var lanes = createLanes(20);
		var m1 = new LaneDestinationMapping({source:lanes[8],destinations:[lanes[1],lanes[15],lanes[5]]});
		var m2 = new LaneDestinationMapping({source:lanes[2],destinations:[lanes[3],lanes[17]]});
		var m5 = new LaneDestinationMapping({source:lanes[6],destinations:[lanes[7]]});
		describe('Intersection - creation',function(){
			var es = new sim.EventScheduler({});
			var tl1 = new TrafficLight({mappings:[m1,m5],transitionDelay:500,scheduler:es});
			var tl2 = new TrafficLight({mappings:[m2],transitionDelay:1000,scheduler:es});
			it('should contain at least one trafficlight in array form',function(){
				expect(function(){new Intersection({});}).to.throw("An intersection must contain at least one trafficlight");
				expect(function(){new Intersection({trafficLights:[]});}).to.throw("An intersection must contain at least one trafficlight");
				expect(function(){new Intersection({trafficLights:[tl1]});}).not.to.throw("An intersection must contain at least one trafficlight");
			});
			it('should not keep a reference to the original trafficlights array',function(){
				var tls = [tl1, tl2];
				var i = new Intersection({trafficLights:tls});
				i.toggle();
				expect(i.trafficLights.length).to.equal(2);
				tls.pop();
				expect(i.trafficLights.length).to.equal(2);
			});
			it('should have a default numeric value for trafficlight switching',function(){
				var tls = [tl1, tl2];
				var i = new Intersection({trafficLights:tls,switchGroupDelay:2000});
				expect(i.switchGroupDelay).to.not.be.undefined;
				expect(i.switchGroupDelay).to.be.an('number');
			});
			it('should be initialized with default toggling: false',function(){
				var i = new Intersection({trafficLights:[tl1, tl2]});
				expect(i.toggling).to.be.false;
			});
			it('should create groups from trafficlights',function(){
				var i = new Intersection({trafficLights:[tl1, tl2]});
				expect(i.groups.length).to.equal(2);
			});
			it('should start as the next group pointing at the first group in the list',function(){
				var i = new Intersection({trafficLights:[tl1, tl2]});
				expect(i.nextGroup).to.equal(0);
			});
		});
		describe('Intersection - operations',function(){
			var es = new sim.EventScheduler({});
			var tl1 = new TrafficLight({mappings:[m1,m5],transitionDelay:500,scheduler:es});
			var tl2 = new TrafficLight({mappings:[m2],transitionDelay:1000,scheduler:es});
			var i = new Intersection({trafficLights:[tl1, tl2],scheduler:es});
			i.schedule = chai.spy(utils.noop);
			var r = undefined;
			it('should start toggling',function(){
				r = i.toggle();
				expect(i.toggling).to.be.true;
			});
			var index = i.nextGroup;
			it('should stop toggling and schedule a new toggle event',function(){
				while(es._q.head.next !== es._q.tail) es.process();
				r.done(function(){
					expect(i.toggeling).to.be.false;
				});
			});
			it('should call schedule once',function(){
				expect(i.schedule).to.have.been.called.once;
			});
			it('should increment the next group index (cyclic)',function(){
				expect(i.nextGroup).to.equal( (index+1)%i.groups.length );
			});
			
		});

	});
});
