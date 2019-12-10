const bodyParser = require('body-parser'); // Reads POST requests
const express = require('express');
const model = require('./model-datastore'); // Contains CRUD functions
const jwtMid = require('./jwt-middleware'); // Contains JWT function
const router = express.Router();
const url = "https://final-beachlym.appspot.com/"; 
const car = "Car";

// Parse request bodies as JSON
router.use(bodyParser.json());


// ------------------------------------------------------
//                      /cars/ 
// ------------------------------------------------------

// GET all cars
router.get('/', (req, res) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."})
		.send('Not Acceptable');
	}
	
	var currLink = url + "cars";
	var nextLink = "None";
	var total = -1;
	// Check if a cursor was sent
	if(Object.keys(req.query).includes("cursor")){
		currLink = url + "cars?cursor=" + encodeURIComponent(req.query.cursor);
	}
	
	// Run query with no pagination to get total
	model.list(car, null, null, (err, entities, cursor) => {
		if (err) {
			next(err);
			return;
		}
		total = entities.length;
		
		// Run query again with pagination
		model.list(car, 5, req.query.cursor, (err, entities, cursor) => {
			if (err) {
				next(err);
				return;
			}

			// Populate self links
			for (let obj in entities) {
				entities[obj].self = (url + "cars/" + entities[obj].id);
			}
			// Check if there are more results
			if (cursor) { // encodeURIComponent escapes characters that break URL
				nextLink = url + "cars?cursor=" + encodeURIComponent(cursor);
			}

			// Send response object
			res.status(200).json({
				items: entities,
				self: currLink,
				next: nextLink,
				total: total
			}).send('OK');
		}); 
	}); 
});

// DELETE all cars (Not Allowed)
router.delete('/', (req, res, next) => {
	res.status(405).json({"Error": "Must specify car_id to be deleted."})
	.send('Method Not Allowed');
});

// PUT all cars (Not Allowed)
router.put('/', (req, res, next) => {
	res.status(405).json({"Error": "Must specify car_id to be put."})
	.send('Method Not Allowed');
});

// PATCH all cars (Not Allowed)
router.patch('/', (req, res, next) => {
	res.status(405).json({"Error": "Must specify car_id to be patched."})
	.send('Method Not Allowed');
});

// POST (create) a new car
router.post('/', jwtMid.checkJwt, (req, res, next) => {
	// Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({ "Error": "JWT token is missing or invalid." })
		.send('Unauthorized');
     }
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."})
		.send('Not Acceptable');
	}
	// Client must send JSON
	if (req.get('content-type') !== 'application/json') {
		res.status(415).json({"Error": "Server only accepts application/json data."})
		.send('Unsupported Media Type');
	}
	// Don't allow ID
	if ('id' in req.body) {
		res.status(403).json({"Error": "Can't send ID, set by server."})
		.send('Forbidden');
	}
	// Don't allow owner
	if ('owner' in req.body) {
		res.status(403).json({"Error": "Can't send owner, set by JWT token."})
		.send('Forbidden');
	}
	// Don't allow charger
	if ('charger' in req.body) {
		res.status(403)
		.json({"Error": "Can't send charger, must be set via /chargers/:charger_id/car/:car_id."})
		.send('Forbidden');
	}
	// Check that required fields are provided: make, model, year
	if (!('make' in req.body && 'model' in req.body && 'year' in req.body)) {
		res.status(400)
		.json({"Error": "The request object is missing at least one of the required attributes."})
		.send('Bad Request');
	}
	// Validate that make field is of string type 
	if (typeof(req.body.make) !== 'string') {
		res.status(400).json({"Error": "Make must be in string format."})
		.send('Bad Request');
	}
	// Validate that make is >= 2 characters
	if (req.body.make.length < 2) {
		res.status(400).json({"Error": "Make must be >= 2 characters."})
		.send('Bad Request');
	}
	// Validate that model field is of string type 
	if (typeof(req.body.model) !== 'string') {
		res.status(400).json({"Error": "Model must be in string format."})
		.send('Bad Request');
	}
	// Validate that model is >= 2 characters
	if (req.body.model.length < 2) {
		res.status(400).json({"Error": "Model must be >= 2 characters."})
		.send('Bad Request');
	}
	// Validate that year field is of number type 
	if (typeof(req.body.year) !== 'number') {
		res.status(400).json({"Error": "Year must be in number format."})
		.send('Bad Request');
	}
	// Validate that year is > 1800 
	if (req.body.year <= 1800) {
		res.status(400).json({"Error": "Year must be > 1800."})
		.send('Bad Request');
     }

	// Get owner sub ID from JWT token
	req.body.owner = req.user.sub;
	
	// Create a new car
	model.create(car, req.body, (err, entity) => {
		if (err) {
			next(err);
			return;
		} // append url of the new car to response
		entity.self = (url + "cars/" + entity.id);
		res.status(201).json(entity).send('Created');
	});
});


// ------------------------------------------------------
//                  /cars/:car_id 
// ------------------------------------------------------

// POST a car by ID (Not Allowed)
router.post('/:car_id', (req, res, next) => {
	res.status(405).json({"Error": "Post must not specify car ID."}).send('Method Not Allowed');
});

// DELETE a car by ID
router.delete('/:car_id', jwtMid.checkJwt, (req, res, next) => {
     // Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({ "Error": "JWT token is missing or invalid." })
		.send('Unauthorized');
     }
     // Check that a car with the given ID exists
     model.read(car, parseInt(req.params.car_id, 10), (err, entity) => {
          if (err) {
               res.status(403).json({ "Error": "No car with this car_id exists." })
			.send('Forbidden');
               next(err);
               return;
          }
          // Make sure sub ID in JWT matches car owner
          if (entity.owner != req.user.sub) {
               res.status(403).json({ "Error": "User sub ID in JWT token does not match car owner." })
			.send('Forbidden');
          }
          // Delete the car with the given ID
          model.delete(car, req.params.car_id, (err, entity) => {
               if (err) {
                    next(err);
                    return;
               }
               res.status(204).send('No Content');
          });
     });
});

// GET a car by ID
router.get('/:car_id', (req, res, next) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."})
		.send('Not Acceptable');
	}
		
	model.read(car, parseInt(req.params.car_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "No car with this car_id exists."})
			.send('Not Found');
			next(err);
			return;
		}
		entity.self = (url + "cars/" + entity.id);
		
		res.status(200).json(entity).send('OK');
	});
});

// PUT (update) a car by ID
router.put('/:car_id', jwtMid.checkJwt, (req, res, next) => {
	// Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({ "Error": "JWT token is missing or invalid." })
		.send('Unauthorized');
     }
	// Don't allow ID
	if ('id' in req.body) {
		res.status(403).json({"Error": "The ID cannot be updated."})
		.send('Forbidden');
	}
	// Don't allow owner
	if ('owner' in req.body) {
		res.status(403).json({"Error": "The owner cannot be updated."})
		.send('Forbidden');
	}
	// Don't allow charger
	if ('charger' in req.body) {
		res.status(403)
		.json({"Error": "Can't update charger, must be set via /chargers/:charger_id/car/:car_id."})
		.send('Forbidden');
	}
	// Check that required fields are provided: make, model, year
	if (!('make' in req.body && 'model' in req.body && 'year' in req.body)) {
		res.status(400).json({"Error": "The request object is missing at least one of the required attributes."})
		.send('Bad Request');
	}
	// Validate that make field is of string type 
	if (typeof(req.body.make) !== 'string') {
		res.status(400).json({"Error": "Make must be in string format."})
		.send('Bad Request');
	}
	// Validate that make is >= 2 characters
	if (req.body.make.length < 2) {
		res.status(400).json({"Error": "Make must be >= 2 characters."})
		.send('Bad Request');
	}
	// Validate that model field is of string type 
	if (typeof(req.body.model) !== 'string') {
		res.status(400).json({"Error": "Model must be in string format."})
		.send('Bad Request');
	}
	// Validate that model is >= 2 characters
	if (req.body.model.length < 2) {
		res.status(400).json({"Error": "Model must be >= 2 characters."})
		.send('Bad Request');
	}
	// Validate that year field is of number type 
	if (typeof(req.body.year) !== 'number') {
		res.status(400).json({"Error": "Year must be in number format."})
		.send('Bad Request');
	}
	// Validate that year is > 1800 
	if (req.body.year <= 1800) {
		res.status(400).json({"Error": "Year must be > 1800."})
		.send('Bad Request');
     }

	// Check that a car with the given ID exists
	model.read(car, parseInt(req.params.car_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "No car with this car_id exists."}).send('Not Found');
			next(err);
			return;
		} 
		
		// Make sure ID in JWT matches car owner
		if (entity.owner != req.user.sub) {
			res.status(403).json({ "Error": "User sub ID in JWT token does not match car owner." })
			.send('Forbidden');
		}
		
		// Populate fields that shouldn't change
		req.body.owner = entity.owner;
		req.body.charger = entity.charger;
		
		// Update the car with the given ID
		model.update(car, req.params.car_id, req.body, (err, entity) => {
			if (err) {
				next(err);
				return;
			}
			entity.self = (url + "cars/" + entity.id);
			res.status(303).location(entity.self).send('See Other.');
		});
	});
});

// PATCH (update) a car by ID
router.patch('/:car_id', jwtMid.checkJwt, (req, res, next) => {
	// Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({"Error": "JWT token is missing or invalid." })
		.send('Unauthorized');
     }
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."})
		.send('Not Acceptable');
	}
	// Check if ID is being modified
	if ('id' in req.body) {
		res.status(403).json({"Error": "The ID cannot be updated."})
		.send('Forbidden');
	}
	// Don't allow owner
	if ('owner' in req.body) {
		res.status(403).json({"Error": "The owner cannot be updated."})
		.send('Forbidden');
	}
	// Don't allow charger
	if ('charger' in req.body) {
		res.status(403)
		.json({"Error": "Can't update charger, must be set via /chargers/:charger_id/car/:car_id."})
		.send('Forbidden');
	}
	if ('make' in req.body) {
		// Validate that make field is of string type
          if (typeof(req.body.make) !== 'string') {
			res.status(400).json({"Error": "Make must be in string format."})
			.send('Bad Request');
		}
		// Validate that make is >= 2 characters
		if (req.body.make.length < 2) {
               res.status(400).json({ "Error": "Make must be >= 2 characters."})
			.send('Bad Request');
		}
	}
	if ('model' in req.body) {
		// Validate that type field is of string type 
          if (typeof(req.body.model) !== 'string') {
               res.status(400).json({ "Error": "Model must be in string format."})
			.send('Bad Request');
		}
		// Validate that type is >= 2 characters
          if (req.body.model.length < 2) {
               res.status(400).json({ "Error": "Model must be >= 2 characters."})
			.send('Bad Request');
		}
	}
	if ('year' in req.body) {
		// Validate that length field is of number type
          if (typeof(req.body.year) !== 'number') {
               res.status(400).json({ "Error": "Year must be in number format."})
			.send('Bad Request');
		}
		// Validate that year is > 1800
          if (req.body.year <= 1800) {
               res.status(400).json({ "Error": "Year must be > 1800."})
			.send('Bad Request');
		}
	}
	
	// Check that a car with the given ID exists
	model.read(car, parseInt(req.params.car_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "No car with this car_id exists."})
			.send('Not Found');
			next(err);
			return;
		} 
		
		// Make sure name in JWT matches car owner
          if (entity.owner != req.user.sub) {
               res.status(403).json({ "Error": "User sub ID in JWT token does not match car owner."})
			.send('Forbidden');
          }
		
		// Set properties that weren't provided
		if (!('make' in req.body)) {
               req.body.make = entity.make;
		}
		if (!('model' in req.body)) {
               req.body.model = entity.model;
		}
		if (!('year' in req.body)) {
			req.body.year = entity.year;
		}
		
		// Populate fields that shouldn't change
		req.body.owner = entity.owner;
		req.body.charger = entity.charger;
		
		// Update the car with the given ID
		model.update(car, req.params.car_id, req.body, (err, entity) => {
			if (err) {
				next(err);
				return;
			}
			entity.self = (url + "cars/" + entity.id);
			res.status(200).json(entity).send('OK');
		});
	});
});

// ------------------------------------------------------
//          /cars/:car_id/charger/
// ------------------------------------------------------

// GET charger car is parked at
router.get('/:car_id/charger', (req, res) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."}).send('Not Acceptable');
	}

	// Check that a car with the given ID exists
	model.read("Car", parseInt(req.params.car_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "The specified car doesn't exist"}).send('Not Found');
			next(err);
			return;
		} 
		if (entity.charger)
		{
			model.read("Charger", parseInt(entity.charger, 10), (err, charger) => {
				if (charger)
				{
					charger.self = (url + "chargers/" + entity.charger);
					// Send response object
					res.status(200).json(charger).send('OK');
				}
			});
		}
		else
		{
			charger = [];
			// Send response object
			res.status(200).json(charger).send('OK');
		}
	});
});

module.exports = router;