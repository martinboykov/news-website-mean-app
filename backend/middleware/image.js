/* eslint-disable no-process-env*/
/* eslint-disable new-cap*/
const path = require('path');
const sharp = require('sharp');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  projectId: 'thenewsroom-mean-app',
  keyFilename: path.join(__dirname, '..', 'TheNewsroom-dc506f317f19.json'),
});
const Multer = require('multer');
const multer = Multer({
  storage: Multer.MemoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb
  },
});

const BUCKET_NAME = 'thenewsroom-images-storage-bucket';
const bucket = storage.bucket(BUCKET_NAME);

const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
};

const SIZES = [280, 51];

function getPublicUrl(filename) {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}

async function sendUploadToGCS(req, res, next) {
  if (!req.file) {
    return next();
  }
  if (!MIME_TYPE_MAP[req.file.mimetype]) {
    throw new Error('invalid file type');
  }

  const originalName = req.file.originalname
    .replace(/[^a-z0-9\s-\.]/ig, '')
    .trim()
    .replace(/\s+|(jpg)|(png)|(jpeg)/ig, '')
    .toLowerCase();

  const timestamp = Date.now(); // the timestamp must be the same far all sizes

  // uploadAllSizes(SIZES[0], originalName, timestamp, req.file, next);
  // uploadAllSizes(SIZES[1], originalName, timestamp, req.file, next);
  const promiseArr = [];
  SIZES.forEach((size) => {
    promiseArr.push(
      uploadAllSizes(size, originalName, timestamp, req.file, next)
    );
  });
  const promise = new Promise((resolve, reject) => {
    const gcsname =
      timestamp + '_' + originalName + MIME_TYPE_MAP[req.file.mimetype];

    const file = bucket.file(gcsname);

    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
      resumable: false,
    });

    stream.on('error', (err) => {
      req.file.cloudStorageError = err;
      reject(err);
      // next(err);
    });

    stream.on('finish', () => {
      req.file.cloudStorageObject = gcsname;
      file.makePublic().then(() => {
        req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
        resolve();
      });
    });

    sharp(req.file.buffer)
      .resize({
        width: 980,
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
      })
      .toBuffer()
      .then((data) => stream.end(data))
      .catch((err) => reject(err));
  });
  promiseArr.push(promise);
  return await Promise.all(promiseArr)
    .then(() => next())
    .catch((err) => next(err));
}

function uploadAllSizes(size, originalName, timestamp, reqFile, next) {
  return new Promise((resolve, reject) => {
    const gcsname =
      `${timestamp}_${originalName}${MIME_TYPE_MAP[reqFile.mimetype]}_${size}w`;

    const file = bucket.file(gcsname);

    const stream = file.createWriteStream({
      metadata: {
        contentType: reqFile.mimetype,
      },
      resumable: false,
    });

    stream.on('error', (err) => {
      reqFile.cloudStorageError = err;
      reject(err);
    });

    stream.on('finish', () => {
      reqFile.cloudStorageObject = gcsname;
      file.makePublic().then(() => {
        resolve();
      });
    });

    sharp(reqFile.buffer)
      .resize({
        width: size,
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
      })
      .toBuffer()
      .then((data) => stream.end(data))
      .catch((err) => reject(err));
  });
}

const deleteImg = async function(filename) {
  try {
    const result = await Promise.all([
      storage
        .bucket(BUCKET_NAME)
        .file(filename)
        .delete(),
      storage
        .bucket(BUCKET_NAME)
        .file(`${filename}_${SIZES[0]}w`)
        .delete(),
      storage
        .bucket(BUCKET_NAME)
        .file(`${filename}_${SIZES[1]}w`)
        .delete(),
    ]);
    result.forEach((value) => {
      console.log(`${value[0].request.href} deleted.`);
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { multer, sendUploadToGCS, deleteImg };


