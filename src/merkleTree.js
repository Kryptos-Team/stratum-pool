/*

 Ported from https://github.com/slush0/stratum-mining/blob/master/lib/merkletree.py

 */

let util = require('./util.js');

let MerkleTree = module.exports = function MerkleTree(data) {

	function merkleJoin(h1, h2) {
		let joined = Buffer.concat([h1, h2]);
		let dhashed = util.sha256d(joined);
		return dhashed;
	}

	function calculateSteps(data) {
		let L = data;
		let steps = [];
		let PreL = [null];
		let StartL = 2;
		let Ll = L.length;

		if (Ll > 1) {
			while (true) {

				if (Ll === 1)
					break;

				steps.push(L[1]);

				if (Ll % 2)
					L.push(L[L.length - 1]);

				let Ld = [];
				let r = util.range(StartL, Ll, 2);
				r.forEach(function (i) {
					Ld.push(merkleJoin(L[i], L[i + 1]));
				});
				L = PreL.concat(Ld);
				Ll = L.length;
			}
		}
		return steps;
	}

	this.data = data;
	this.steps = calculateSteps(data);

};
MerkleTree.prototype = {
	withFirst: function (f) {
		this.steps.forEach(function (s) {
			f = util.sha256d(Buffer.concat([f, s]));
		});
		return f;
	}
};