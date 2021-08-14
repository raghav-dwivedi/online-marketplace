const fs = require('fs');
const path = require('path');
const aws = require('aws-sdk');

const s3 = new aws.S3();

const deleteFile = (params) => {
	console.log('Deleting image');
	s3.deleteObject(params, (err, data) => {
		if (err) throw err;
	});
};

exports.deleteFile = deleteFile;
