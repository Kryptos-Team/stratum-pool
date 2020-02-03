let net = require('net');
let events = require('events');

//Gives us global access to everything we need for each hashing algorithm
require('./algoProperties.js');

let pool = require('./pool.js');

exports.daemon = require('./daemon.js');
exports.varDiff = require('./varDiff.js');


exports.createPool = function (poolOptions, authorizeFn) {
	let newPool = new pool(poolOptions, authorizeFn);
	return newPool;
};
