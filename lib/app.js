/**
Here we will simulate a simple intersection.
4 lanes:
N->S, S->N (no intersection)
E->W, W->E (no intersection)
*/
var junctionTask = require('./index');
var Lane = junctionTask.Lane;
var LDM = junctionTask.LaneDestinationMapping;
var TrafficLight = junctionTask.TrafficLight;
var Intersection = junctionTask.Intersection;
var DIRECTIONS = junctionTask.DIRECTIONS;

var lanes = [
	new Lane({key:'N-in',placement:0}),
	new Lane({key:'N-out',placement:1,direction:DIRECTIONS.OUT}),
	new Lane({key:'W-in',placement:2}),
	new Lane({key:'W-out',placement:3,direction:DIRECTIONS.OUT}),
	new Lane({key:'S-in',placement:4}),
	new Lane({key:'S-out',placement:5,direction:DIRECTIONS.OUT}),
	new Lane({key:'E-in',placement:6}),
	new Lane({key:'E-out',placement:7,direction:DIRECTIONS.OUT}),
];

var ldms = [
	new LDM({source:lanes[0],destinations:[lanes[5]],key:'N'}),
	new LDM({source:lanes[4],destinations:[lanes[1]],key:'S'}),
	new LDM({source:lanes[6],destinations:[lanes[3]],key:'E'}),
	new LDM({source:lanes[2],destinations:[lanes[7]],key:'W'}),
];

var trafficLights = [
	new TrafficLight({mappings:[ldms[0]],key:'N->S'}),
	new TrafficLight({mappings:[ldms[1]],key:'S->N'}),
	new TrafficLight({mappings:[ldms[2]],key:'E->W'}),
	new TrafficLight({mappings:[ldms[3]],key:'W->E'}),
];

var seconds;
if (isNaN(process.argv[2])) {
	console.log("USAGE: node <path>/app.js <number of second to run simulation>");	
} else {
	seconds = Number(process.argv[2]);
	var i = new Intersection({'trafficLights':trafficLights});
	i.start();
	
	while(i._scheduler.time() <= seconds) {
		var e = i._scheduler.process();
	}
}

