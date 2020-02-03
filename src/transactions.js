let util = require('./util.js');

/*
 This function creates the generation transaction that accepts the reward for
 successfully mining a new block.
 For some (probably outdated and incorrect) documentation about whats kinda going on here,
 see: https://en.bitcoin.it/wiki/Protocol_specification#tx
 */

let generateOutputTransactions = function (poolRecipient, recipients, rpcData) {

	let reward = rpcData.coinbasevalue;
	let rewardToPool = reward;

	let txOutputBuffers = [];


	/* Dash 12.1 */
	if (rpcData.masternode && rpcData.superblock) {
		if (rpcData.masternode.payee) {
			let payeeReward = 0;

			payeeReward = rpcData.masternode.amount;
			reward -= payeeReward;
			rewardToPool -= payeeReward;

			let payeeScript = util.addressToScript(rpcData.masternode.payee);
			txOutputBuffers.push(Buffer.concat([
				util.packInt64LE(payeeReward),
				util.varIntBuffer(payeeScript.length),
				payeeScript
			]));
		} else if (rpcData.superblock.length > 0) {
			for (let i in rpcData.superblock) {
				let payeeReward = 0;

				payeeReward = rpcData.superblock[i].amount;
				reward -= payeeReward;
				rewardToPool -= payeeReward;

				let payeeScript = util.addressToScript(rpcData.superblock[i].payee);
				txOutputBuffers.push(Buffer.concat([
					util.packInt64LE(payeeReward),
					util.varIntBuffer(payeeScript.length),
					payeeScript
				]));
			}
		}
	}

	if (rpcData.payee) {
		let payeeReward = 0;

		if (rpcData.payee_amount) {
			payeeReward = rpcData.payee_amount;
		} else {
			payeeReward = Math.ceil(reward / 5);
		}

		reward -= payeeReward;
		rewardToPool -= payeeReward;

		let payeeScript = util.addressToScript(rpcData.payee);
		txOutputBuffers.push(Buffer.concat([
			util.packInt64LE(payeeReward),
			util.varIntBuffer(payeeScript.length),
			payeeScript
		]));
	}


	for (let i = 0; i < recipients.length; i++) {
		let recipientReward = Math.floor(recipients[i].percent * reward);
		rewardToPool -= recipientReward;

		txOutputBuffers.push(Buffer.concat([
			util.packInt64LE(recipientReward),
			util.varIntBuffer(recipients[i].script.length),
			recipients[i].script
		]));
	}


	txOutputBuffers.unshift(Buffer.concat([
		util.packInt64LE(rewardToPool),
		util.varIntBuffer(poolRecipient.length),
		poolRecipient
	]));

	if (rpcData.default_witness_commitment !== undefined) {
		witness_commitment = new Buffer(rpcData.default_witness_commitment, 'hex');
		txOutputBuffers.unshift(Buffer.concat([
			util.packInt64LE(0),
			util.varIntBuffer(witness_commitment.length),
			witness_commitment
		]));
	}

	return Buffer.concat([
		util.varIntBuffer(txOutputBuffers.length),
		Buffer.concat(txOutputBuffers)
	]);

};


exports.CreateGeneration = function (rpcData, publicKey, extraNoncePlaceholder, reward, txMessages, recipients) {

	let txInputsCount = 1;
	let txOutputsCount = 1;
	let txVersion = txMessages === true ? 2 : 1;
	let txLockTime = 0;

	let txInPrevOutHash = "";
	let txInPrevOutIndex = Math.pow(2, 32) - 1;
	let txInSequence = 0;

	//Only required for POS coins
	let txTimestamp = reward === 'POS' ?
		util.packUInt32LE(rpcData.curtime) : new Buffer([]);

	//For coins that support/require transaction comments
	let txComment = txMessages === true ?
		util.serializeString('https://github.com/Kryptos-Team/stratum-pool') :
		new Buffer([]);


	let scriptSigPart1 = Buffer.concat([
		util.serializeNumber(rpcData.height),
		new Buffer(rpcData.coinbaseaux.flags, 'hex'),
		util.serializeNumber(Date.now() / 1000 | 0),
		new Buffer([extraNoncePlaceholder.length])
	]);

	let scriptSigPart2 = util.serializeString('/nodeStratum/');

	let p1 = Buffer.concat([
		util.packUInt32LE(txVersion),
		txTimestamp,

		//transaction input
		util.varIntBuffer(txInputsCount),
		util.uint256BufferFromHash(txInPrevOutHash),
		util.packUInt32LE(txInPrevOutIndex),
		util.varIntBuffer(scriptSigPart1.length + extraNoncePlaceholder.length + scriptSigPart2.length),
		scriptSigPart1
	]);


	/*
	 The generation transaction must be split at the extranonce (which located in the transaction input
	 scriptSig). Miners send us unique extranonces that we use to join the two parts in attempt to create
	 a valid share and/or block.
	 */


	let outputTransactions = generateOutputTransactions(publicKey, recipients, rpcData);

	let p2 = Buffer.concat([
		scriptSigPart2,
		util.packUInt32LE(txInSequence),
		//end transaction input

		//transaction output
		outputTransactions,
		//end transaction ouput

		util.packUInt32LE(txLockTime),
		txComment
	]);

	return [p1, p2];

};
