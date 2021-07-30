const fs = require('fs');
const path = require('path');

const deleteFile = (filePath) => {
    filePath = path.join(__dirname, '..', 'images', filePath);
    fs.unlink(filePath, (err) => {
        if (err) {
            throw (err);
        }
    });
}

exports.deleteFile = deleteFile;