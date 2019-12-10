/**************************************************************
 * Author: Matt Beachly
 * Date: 11/28/2019
 * Description: CS492 Final Project
 * 
 * This is a restful API for tracking electric cars and
 * charging stations. Both cars and chargers support all
 * CRUD functionality, but updating and deleting require 
 * that the user provides a JWT (JSON web token) matching 
 * that of the car or charger's owner. The welcome page
 * allows the user to authenticate with their Google 
 * account and obtain a JWT from Google.
 **************************************************************/

// Node JS setup
const express = require('express');
const app = express();
const { Datastore } = require('@google-cloud/datastore');
const ds = new Datastore();
const router = express.Router();
const axios = require('axios'); // Used for requests
var handlebars = require('express-handlebars').create({ defaultLayout: 'main' });
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.use(express.static('public')); 
app.use('/', require('./index'));

// App variables
var token;
var state = 000000000; 
var code = 'No Authorization';
var access_token = 'No Token';
var token_type = 'No Token Type';
var id_token = 'No JWT Token';
var client = require('./public/client_secret.json');
const client_id = client.web.client_id;
const client_secret = client.web.client_secret;
const auth_uri = client.web.auth_uri;
const token_uri = 'https://oauth2.googleapis.com/token';
//const redirect_uri = client.web.redirect_uris[0]; // For testing locally
const redirect_uri = client.web.redirect_uris[1]; // Cloud URL
const people_api_uri = 'https://people.googleapis.com/v1/people/' 
				 + 'me?personFields=names,emailAddresses';
const response_type = 'code';
const scope = 'profile email';
const access_type = 'offline';
const include_granted_scopes = 'true';
const user_info_uri = redirect_uri + '/UserInfo';
const grant_type = 'authorization_code'





// ------------------------------------------------------------
// Welcome page route
// ------------------------------------------------------------
app.get('/', (req, res) => {

	// If user was redirected back to this page from Google
	// save the code that was sent with them by Google.
	if (req.query.code) 
	{	// Also validate the user by verifying that the state 
		// returned matches the one that was just generated 
		if (req.query.state == state) 
		{	// Go ahead and use the code provided by Google
			// to request a token
			code = req.query.code;
			axios.post(token_uri, {
				code: code,
				client_id: client_id,
				client_secret: client_secret,
				redirect_uri: redirect_uri,
				grant_type: grant_type
			}).then(response => {
				access_token = response.data.access_token;
                    token_type = response.data.token_type;
                    id_token = response.data.id_token;
			}).catch(error => {
				res.send('<!DOCTYPE html><html><body><h5>' + 
				error + '<h5></body></html>');
			})
		}
	}
	else // If user is visiting this page for the first time
	{	// generate a new 9-digit random state for the user
          state = Math.floor(Math.random() * 999999999);
     }

     // Content needed for the Welcome.handlebars view
     var context = {};
     context.auth_uri = auth_uri;
     context.response_type = response_type;
     context.scope = scope;
     context.access_type = access_type;
     context.include_granted_scopes = include_granted_scopes;
     context.state = state;
     context.redirect_uri = redirect_uri;
     context.client_id = client_id;
     context.user_info_uri = user_info_uri;

     // Render Welcome.handlebars with context content
     res.render('Welcome', context);
});

// ------------------------------------------------------------
// User Info page route
// ------------------------------------------------------------
app.get('/UserInfo', (req, res) => {
	
     var context = {};
     var userData = {};
     var config = { headers: { 'Authorization': (token_type + ' ' + access_token)} };

     // Use the token to request the user's info from People API
	axios.get(people_api_uri, config)
          .then((response) => {
               context.displayName = response.data.names[0].displayName;
               context.givenName = response.data.names[0].givenName;
               context.familyName = response.data.names[0].familyName;
               context.id = response.data.names[0].metadata.source.id;
			const userKey = ds.key(['User', context.id]);
               
               // Update or Create the user with the given ID
               ds.save({
                    key: userKey, 
                    data: context
               }, function (err, entity) {
                    if (!err) {
                         // Record updated successfully.
                    }
               });
			
               context.id_token = id_token;

               // Render UserInfo.handlebars with context content
		     res.render('ShowUserInfo', context);
     }).catch((error) => {
		res.send('<!DOCTYPE html><html><body><h5>' + 
		error + '<h5></body></html>');
	});
});



// ------------------------------------------------------------
// Listen to the App Engine-specified port, or 8080 otherwise
// ------------------------------------------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});