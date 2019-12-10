const bodyParser = require('body-parser'); // Reads POST requests
const express = require('express');
const model = require('./model-datastore'); // Contains CRUD functions
const jwtMid = require('./jwt-middleware'); // Contains JWT function
const router = express.Router();
const url = "https://final-beachlym.appspot.com/"; 

// Parse request bodies as JSON
router.use(bodyParser.json());

// ------------------------------------------------------------
//                        /users/
// ------------------------------------------------------------
router.get('/', (req, res) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."}).send('Not Acceptable');
	}
	
	var prevLink = url + "users";
	var nextLink = "None";
	var total = -1;
		
	// Check if a cursor was sent
	if(Object.keys(req.query).includes("cursor")){
		prevLink = url + "users?cursor=" + encodeURIComponent(req.query.cursor);
	}
	
	// Run query with no pagination to get total
	model.list("User", null, null, (err, entities, cursor) => {
		if (err) {
			next(err);
			return;
		}
		total = entities.length;
			
		// Run query, paginate five results at a time
		model.list("User", 5, req.query.cursor, (err, entities, cursor) => {
			if (err) {
				next(err);
				return;
			}

			// Populate self links
			for (let obj in entities) {
				entities[obj].self = (url + "users/" + entities[obj].id);
			}
			// Check if there are more results
			if (cursor) { // encodeURIComponent escapes characters that break URL
				nextLink = url + "users?cursor=" + encodeURIComponent(cursor);
			}

			// Send response object
			res.status(200).json({
				items: entities,
				self: prevLink,
				next: nextLink,
				total: total
			}).send('OK');
		});
	}); 
});

// POST user (Not Allowed)
router.post('/', (req, res, next) => {
	res.status(405).json({"Error": "Must use 'Show Your Info!' button to create user."}).send('Method Not Allowed');
});

// DELETE all users (Not Allowed)
router.delete('/', (req, res, next) => {
	res.status(405).json({"Error": "Can't delete users via API."}).send('Method Not Allowed');
});

// PUT all users (Not Allowed)
router.put('/', (req, res, next) => {
	res.status(405).json({"Error": "Can't update users via API."}).send('Method Not Allowed');
});

// PATCH all users (Not Allowed)
router.patch('/', (req, res, next) => {
	res.status(405).json({"Error": "Can't update users via API."}).send('Method Not Allowed');
});

// ------------------------------------------------------------
//                    /users/:user_id
// ------------------------------------------------------------

// GET a user by ID
router.get('/:user_id', (req, res, next) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."}).send('Not Acceptable');
	}
		
	model.read("User", req.params.user_id, (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "No user with this user_id exists."}).send('Not Found');
			next(err);
			return;
		}
		entity.self = (url + "users/" + entity.id);
		
		res.status(200).json(entity).send('OK');
	});
});

// POST user (Not Allowed)
router.post('/:user_id', (req, res, next) => {
	res.status(405).json({"Error": "Must use 'Show Your Info!' button to create user."}).send('Method Not Allowed');
});

// DELETE all users (Not Allowed)
router.delete('/:user_id', (req, res, next) => {
	res.status(405).json({"Error": "Can't delete users via API."}).send('Method Not Allowed');
});

// PUT all users (Not Allowed)
router.put('/:user_id', (req, res, next) => {
	res.status(405).json({"Error": "Can't update users via API."}).send('Method Not Allowed');
});

// PATCH all users (Not Allowed)
router.patch('/:user_id', (req, res, next) => {
	res.status(405).json({"Error": "Can't update users via API."}).send('Method Not Allowed');
});

// ------------------------------------------------------------
//                 /users/:user_id/cars
// ------------------------------------------------------------
router.get('/:user_id/cars', (req, res) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."}).send('Not Acceptable');
	}

	model.read("User", req.params.user_id, (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "No user with this user_id exists."}).send('Not Found');
			next(err);
			return;
		}

		// Get list of cars owned by user name
		model.getByOwner("Car", req.params.user_id, (err, entities) => {
			  // Populate self links
			  for (let obj in entities) {
				   entities[obj].self = (url + "cars/" + entities[obj].id);
			  }
			  // Send response object
			  res.status(200).json({
				   items: entities,
				   self: url + "users/" + req.params.user_id + "/cars",
				total: entities.length
			  }).send('OK');
		 });
	 });
});

// ------------------------------------------------------------
//                 /users/:user_id/chargers
// ------------------------------------------------------------
router.get('/:user_id/chargers', (req, res) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."}).send('Not Acceptable');
	}

	model.read("User", req.params.user_id, (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "No user with this user_id exists."}).send('Not Found');
			next(err);
			return;
		}
		 // Get list of chargers owned by user name
		 model.getByOwner("Charger", req.params.user_id, (err, entities) => {
			  // Populate self links
			  for (let obj in entities) {
				   entities[obj].self = (url + "chargers/" + entities[obj].id);
			  }
			  // Send response object
			  res.status(200).json({
				   items: entities,
				   self: url + "users/" + req.params.user_id + "/chargers",
				total: entities.length
			  }).send('OK');
		});
    });
});


module.exports = router;