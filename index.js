var net = require('net');
var events = require('events');

//Gives us global access to everything we need for each hashing algorithm
require('./src/algoProperties.js');

var pool = require('./src/pool.js');

exports.daemon = require('./src/daemon.js');
exports.varDiff = require('./src/varDiff.js');


exports.createPool = function (poolOptions, authorizeFn) {
	var newPool = new pool(poolOptions, authorizeFn);
	return newPool;
};
