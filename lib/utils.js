(function(module){
	
	function noop(){};
	
	function setBase(type,base) {
		type.prototype = Object.create(base.prototype);
		type.prototype.constructor = type;
	}
	
	module.exports = {
		'noop':noop,
		'setBase':setBase
	};
})(module);