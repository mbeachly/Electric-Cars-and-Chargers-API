// Code from http://classes.engr.oregonstate.edu/eecs/perpetual/cs493-400/modules/7-more-security/3-node-authorization/

const jwt = require('express-jwt'); // JSON Web Token middleware
const jwksRsa = require('jwks-rsa');

// JWT middleware function examines bearer token provided
// in header, validates the token, and parses the data
// in req.user
const checkJwt = jwt({
     secret: jwksRsa.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `https://www.googleapis.com/oauth2/v3/certs`
     }),

     // Validate the audience and the issuer.
     issuer: `https://accounts.google.com`,
     algorithms: ['RS256']
});

// [START exports]
module.exports = {
  checkJwt
};
// [END exports]