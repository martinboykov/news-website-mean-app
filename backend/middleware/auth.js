/* eslint-disable no-process-env*/
// Checks if authorized before any CRUD operation, requiring auth.
const jwt = require('jsonwebtoken');

// AUTHORIZATION
function auth(req, res, next) {
  // Ways to extract/set token from header
  // const token = req.query.auth; // can be stored in query params as well
  if (!req.headers.authorization) {
    return res.status(400).json({
      message: 'Access denied. No token provided.',
    });
  }
  const token = req.headers.authorization.split(' ')[1];
  // header is set as :'Bearer lkgjffgdfkjgdfkgdfkjgfdkgjd'
  // const token = req.header('x-auth-token'); // header is set as: res.header('x-auth-token', token).send(....)
  if (token === 'undefined') {
    return res.status(401).json({
      message: 'Access denied. No token provided.',
    });
  }

  // checking if token is valid

  // https://www.npmjs.com/package/jsonwebtoken
  // jwt.verify(token, secretOrPublicKey, [options, callback])
  // decoded payload -> gives us the object we send when
  // registering/signing-in -> with generateAuthToken() in models/user.js
  // in our case only the _id

  // secret must be aded predeployment with config or process.env.CUSTOM_VARIABLE
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  return next();
}

module.exports = auth;
