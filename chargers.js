const bodyParser = require('body-parser'); // Reads POST requests
const express = require('express');
const model = require('./model-datastore'); // Contains CRUD functions
const jwtMid = require('./jwt-middleware'); // Contains JWT function
const router = express.Router();
const url = "https://final-beachlym.appspot.com/"; 
const charger = "Charger";

// Parse request bodies as JSON
router.use(bodyParser.json());


// ------------------------------------------------------
//                      /chargers/ 
// ------------------------------------------------------

// GET all chargers
router.get('/', (req, res) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."})
		.send('Not Acceptable');
	}
	
	var currLink = url + "chargers";
	var nextLink = "None";
	var total = -1;
	
	// Check if a cursor was sent
	if(Object.keys(req.query).includes("cursor")){
		currLink = url + "chargers?cursor=" + encodeURIComponent(req.query.cursor);
	}
	
	// Run query with no pagination to get total
	model.list(charger, null, null, (err, entities, cursor) => {
		if (err) {
			next(err);
			return;
		}
		total = entities.length;
		
		// Run query again with pagination
		model.list(charger, 5, req.query.cursor, (err, entities, cursor) => {
			if (err) {
				next(err);
				return;
			}

			// Populate self links
			for (let obj in entities) {
				entities[obj].self = (url + "chargers/" + entities[obj].id);
			}
			// Check if there are more results
			if (cursor) { // encodeURIComponent escapes characters that break URL
				nextLink = url + "chargers?cursor=" + encodeURIComponent(cursor);
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

// DELETE all chargers (Not Allowed)
router.delete('/', (req, res, next) => {
	res.status(405).json({"Error": "Must specify charger_id to be deleted."})
	.send('Method Not Allowed');
});

// PUT all chargers (Not Allowed)
router.put('/', (req, res, next) => {
	res.status(405).json({"Error": "Must specify charger_id to be put."})
	.send('Method Not Allowed');
});

// PATCH all chargers (Not Allowed)
router.patch('/', (req, res, next) => {
	res.status(405).json({"Error": "Must specify charger_id to be patched."})
	.send('Method Not Allowed');
});

// POST (create) a new charger
router.post('/', jwtMid.checkJwt, (req, res, next) => {
	// Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({ "Error": "JWT token is missing or invalid." }).send('Unauthorized');
     }
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."}).send('Not Acceptable');
	}
	// Client must send JSON
	if (req.get('content-type') !== 'application/json') {
		res.status(415).json({"Error": "Server only accepts application/json data."}).send('Unsupported Media Type');
	}
	// Don't allow ID
	if ('id' in req.body) {
		res.status(403).json({"Error": "Can't send ID, set by server."}).send('Forbidden');
	}
	// Don't allow owner
	if ('owner' in req.body) {
		res.status(403).json({"Error": "Can't send owner, set by JWT token."})
		.send('Forbidden');
	}
	// Don't allow car
	if ('car' in req.body) {
		res.status(403)
		.json({"Error": "Can't send car, must be set via /chargers/:charger_id/car/:car_id."})
		.send('Forbidden');
	}
	// Check that required fields are provided: address, connector, output
	if (!('address' in req.body && 'connector' in req.body && 'output' in req.body)) {
		res.status(400).json({"Error": "The request object is missing at least one of the required attributes."}).send('Bad Request');
	}
	// Validate that address field is of string type 
	if (typeof(req.body.address) !== 'string') {
		res.status(400).json({"Error": "Address must be in string format."}).send('Bad Request');
	}
	// Validate that address is >= 2 characters
	if (req.body.address.length < 2) {
		res.status(400).json({"Error": "Address must be >= 2 characters."}).send('Bad Request');
	}
	// Validate that connector field is of string type 
	if (typeof(req.body.connector) !== 'string') {
		res.status(400).json({"Error": "Connector must be in string format."}).send('Bad Request');
	}
	// Validate that connector is >= 2 characters
	if (req.body.connector.length < 2) {
		res.status(400).json({"Error": "Connector must be >= 2 characters."}).send('Bad Request');
	}
	// Validate that output field is of number type 
	if (typeof(req.body.output) !== 'number') {
		res.status(400).json({"Error": "Output must be in number format."}).send('Bad Request');
	}
	// Validate that output is > 0 
	if (req.body.output <= 0) {
		res.status(400).json({"Error": "Output must be > 0."}).send('Bad Request');
     }

	// Get owner sub ID from JWT token
	req.body.owner = req.user.sub;
	
	// Create a new charger
	model.create(charger, req.body, (err, entity) => {
		if (err) {
			next(err);
			return;
		} // append url of the new charger to response
		entity.self = (url + "chargers/" + entity.id);
		res.status(201).json(entity).send('Created');
	});
});


// ------------------------------------------------------
//                  /chargers/:charger_id 
// ------------------------------------------------------

// POST a charger by ID (Not Allowed)
router.post('/:charger_id', (req, res, next) => {
	res.status(405).json({"Error": "Post must not specify charger ID."}).send('Method Not Allowed');
});

// DELETE a charger by ID
router.delete('/:charger_id', jwtMid.checkJwt, (req, res, next) => {
     // Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({ "Error": "JWT token is missing or invalid." }).send('Unauthorized');
     }
     // Check that a charger with the given ID exists
     model.read(charger, parseInt(req.params.charger_id, 10), (err, entity) => {
          if (err) {
               res.status(403).json({ "Error": "No charger with this charger_id exists." }).send('Forbidden');
               next(err);
               return;
          }
          // Make sure sub ID in JWT matches charger owner
          if (entity.owner != req.user.sub) {
               res.status(403).json({ "Error": "User sub ID in JWT token does not match charger owner" }).send('Forbidden');
          }
		// Get car parked at charger 
		model.carByCharger(req.params.charger_id, (err, entities) => {
			if (err) {
				next(err);
				return;
			} // Delete the charger from car
			for (let obj in entities) {
				entities[obj].charger = null;
				model.update("Car", entities[obj].id, entities[obj], (err, entity) => {
					if (err) {
						next(err);
						return;
					}
				});
			}
		});
          // Delete the charger with the given ID
          model.delete(charger, req.params.charger_id, (err, entity) => {
               if (err) {
                    next(err);
                    return;
               }
               res.status(204).send('No Content');
          });
     });
});

// GET a charger by ID
router.get('/:charger_id', (req, res, next) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."}).send('Not Acceptable');
	}
		
	model.read(charger, parseInt(req.params.charger_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "No charger with this charger_id exists."}).send('Not Found');
			next(err);
			return;
		}
		entity.self = (url + "chargers/" + entity.id);
		
		// List car parked at charger
		model.carByCharger(req.params.charger_id, (err, entities) => {
			if (entities) {
				entity.car = entities[0].id;
			}
			else {
				entity.car = "None";
			}
			res.status(200).json(entity).send('OK');
		});	
	});
});

// PUT (update) a charger by ID
router.put('/:charger_id', jwtMid.checkJwt, (req, res, next) => {
	// Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({ "Error": "JWT token is missing or invalid." }).send('Unauthorized');
     }
	// Don't allow ID
	if ('id' in req.body) {
		res.status(403).json({"Error": "The ID cannot be updated."}).send('Forbidden');
	}
	// Don't allow owner
	if ('owner' in req.body) {
		res.status(403).json({"Error": "The owner cannot be updated."})
		.send('Forbidden');
	}
	// Don't allow car
	if ('car' in req.body) {
		res.status(403)
		.json({"Error": "Can't update car, must be set via /chargers/:charger_id/car/:car_id."})
		.send('Forbidden');
	}
	// Check that required fields are provided: address, connector, output
	if (!('address' in req.body && 'connector' in req.body && 'output' in req.body)) {
		res.status(400).json({"Error": "The request object is missing at least one of the required attributes."}).send('Bad Request');
	}
	// Validate that address field is of string type 
	if (typeof(req.body.address) !== 'string') {
		res.status(400).json({"Error": "Address must be in string format."}).send('Bad Request');
	}
	// Validate that address is >= 2 characters
	if (req.body.address.length < 2) {
		res.status(400).json({"Error": "Address must be >= 2 characters."}).send('Bad Request');
	}
	// Validate that connector field is of string type 
	if (typeof(req.body.connector) !== 'string') {
		res.status(400).json({"Error": "Connector must be in string format."}).send('Bad Request');
	}
	// Validate that connector is >= 2 characters
	if (req.body.connector.length < 2) {
		res.status(400).json({"Error": "Connector must be >= 2 characters."}).send('Bad Request');
	}
	// Validate that output field is of number type 
	if (typeof(req.body.output) !== 'number') {
		res.status(400).json({"Error": "Output must be in number format."}).send('Bad Request');
	}
	// Validate that output is > 0 
	if (req.body.output <= 0) {
		res.status(400).json({"Error": "Output must be > 0."}).send('Bad Request');
     }

	// Check that a charger with the given ID exists
	model.read(charger, parseInt(req.params.charger_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "No charger with this charger_id exists."}).send('Not Found');
			next(err);
			return;
		} 
		
		// Make sure name in JWT matches charger owner
          if (entity.owner != req.user.sub) {
               res.status(403).json({ "Error": "User sub ID in JWT token does not match charger owner." }).send('Forbidden');
          }
		
		// Populate fields that shouldn't change
		req.body.owner = entity.owner;
		req.body.car = entity.car;
		
		// Update the charger with the given ID
		model.update(charger, req.params.charger_id, req.body, (err, entity) => {
			if (err) {
				next(err);
				return;
			}
			entity.self = (url + "chargers/" + entity.id);
			res.status(303).location(entity.self).send('See Other.');
		});
	});
});

// PATCH (update) a charger by ID
router.patch('/:charger_id', jwtMid.checkJwt, (req, res, next) => {
	// Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({"Error": "JWT token is missing or invalid." }).send('Unauthorized');
     }
	// Check if ID is being modified
	if ('id' in req.body) {
		res.status(403).json({"Error": "The ID cannot be updated."}).send('Forbidden');
	}
	// Don't allow owner
	if ('owner' in req.body) {
		res.status(403).json({"Error": "The owner cannot be updated."})
		.send('Forbidden');
	}
	// Don't allow car
	if ('car' in req.body) {
		res.status(403)
		.json({"Error": "Can't update car, must be set via /chargers/:charger_id/car/:car_id."})
		.send('Forbidden');
	}
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."}).send('Not Acceptable');
	}
	if ('address' in req.body) {
		// Validate that address field is of string type
          if (typeof(req.body.address) !== 'string') {
			res.status(400).json({"Error": "Address must be in string format."}).send('Bad Request');
		}
		// Validate that address is >= 2 characters
		if (req.body.address.length < 2) {
               res.status(400).json({ "Error": "Address must be >= 2 characters."}).send('Bad Request');
		}
	}
	if ('connector' in req.body) {
		// Validate that type field is of string type 
          if (typeof(req.body.connector) !== 'string') {
               res.status(400).json({ "Error": "Connector must be in string format."}).send('Bad Request');
		}
		// Validate that type is >= 2 characters
          if (req.body.connector.length < 2) {
               res.status(400).json({ "Error": "Connector must be >= 2 characters."}).send('Bad Request');
		}
	}
	if ('output' in req.body) {
		// Validate that length field is of number type
          if (typeof(req.body.output) !== 'number') {
               res.status(400).json({ "Error": "Output must be in number format."}).send('Bad Request');
		}
		// Validate that output is > 0
          if (req.body.output <= 0) {
               res.status(400).json({ "Error": "Output must be > 0."}).send('Bad Request');
		}
	}
	
	// Check that a charger with the given ID exists
	model.read(charger, parseInt(req.params.charger_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "No charger with this charger_id exists."}).send('Not Found');
			next(err);
			return;
		} 
		
		// Make sure name in JWT matches charger owner
          if (entity.owner != req.user.sub) {
               res.status(403).json({ "Error": "User sub ID in JWT token does not match charger owner."}).send('Forbidden');
          }
		
		// Set properties that weren't provided
		if (!('address' in req.body)) {
               req.body.address = entity.address;
		}
		if (!('connector' in req.body)) {
               req.body.connector = entity.connector;
		}
		if (!('output' in req.body)) {
			req.body.output = entity.output;
		}
		
		// Populate fields that shouldn't change
		req.body.owner = entity.owner;
		req.body.car = entity.car;
		
		// Update the charger with the given ID
		model.update(charger, req.params.charger_id, req.body, (err, entity) => {
			if (err) {
				next(err);
				return;
			}
			entity.self = (url + "chargers/" + entity.id);
			res.status(200).json(entity).send('OK');
		});
	});
});

// ------------------------------------------------------
//          /chargers/:charger_id/car/
// ------------------------------------------------------

// GET car parked at charger
router.get('/:charger_id/car', (req, res) => {
	// Client must accept JSON
     if(!req.accepts('application/json')){
		res.status(406).json({"Error": "Client must accept application/json."}).send('Not Acceptable');
	}

	// Check that a charger with the given ID exists
	model.read("Charger", parseInt(req.params.charger_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "The specified charger doesn't exist"}).send('Not Found');
			next(err);
			return;
		} 

		model.carByCharger(req.params.charger_id, (err, entities) => {
			if (entities)
			{
				// Populate self links
				for (let obj in entities) {
					entities[obj].self = (url + "cars/" + entities[obj].id);
				}
			}
			else
			{
				entities = [];
			}
			// Send response object
			res.status(200).json(entities).send('OK');
		});
	});
});

// ------------------------------------------------------
//          /chargers/:charger_id/car/:car_id
// ------------------------------------------------------

// PUT (assign) a car to a charger
router.put('/:charger_id/car/:car_id', jwtMid.checkJwt, (req, res, next) => {
	// Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({"Error": "JWT token is missing or invalid." }).send('Unauthorized');
     }
	// Check that a charger with the given ID exists
	model.read("Charger", parseInt(req.params.charger_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "The specified charger doesn't exist."}).send('Not Found');
			next(err);
			return;
		} 
		// Check that a car with the given ID exists
		model.read("Car", parseInt(req.params.car_id, 10), (err, entity) => {
			if (err) {
				res.status(404).json({"Error": "The specified car doesn’t exist."}).send('Not Found');
				next(err);
				return;
			} 
			// Make sure car is not parked at another charger
			if (entity.charger != null) {
				res.status(403).json({"Error": "This car is already parked at a charger."}).send('Forbidden');
				return;
			}
			// Make sure name in JWT matches car owner
			if (entity.owner != req.user.sub) {
				res.status(403).json({ "Error": "User sub ID in JWT token does not match car owner."}).send('Forbidden');
			}
			
			// Make sure charger does not already have car
			model.carByCharger(req.params.charger_id, (err, entities) => {
				if (entities) {
					res.status(403).json({"Error": "There is already a car at this charger."}).send('Forbidden');
				}
			});
			
			// Update the car with the charger ID
			entity.charger = req.params.charger_id;
			
			model.update("Car", req.params.car_id, entity, (err, entity) => {
				if (err) {
					next(err);
					return;
				}
				res.status(204).json(entity).send('OK');
			});
		});
	});
});

// PATCH (assign) a car to a charger (Not Allowed)
router.patch('/:charger_id/car/:car_id', (req, res, next) => {
	res.status(405).json({"Error": "Must use PUT."})
	.send('Method Not Allowed');
});

// DELETE (remove) a car from a charger
router.delete('/:charger_id/car/:car_id', jwtMid.checkJwt, (req, res, next) => {
	// Validate JWT
     if (!('user' in req && 'sub' in req.user)) {
          res.status(401).json({"Error": "JWT token is missing or invalid." }).send('Unauthorized');
     }
	// Check that a charger with the given ID exists
	model.read("Charger", parseInt(req.params.charger_id, 10), (err, entity) => {
		if (err) {
			res.status(404).json({"Error": "The specified charger doesn't exist"}).send('Not Found');
			next(err);
			return;
		} 
		// Check that a car with the given ID exists
		model.read("Car", parseInt(req.params.car_id, 10), (err, entity) => {
			if (err) {
				res.status(404).json({"Error": "The specified car doesn’t exist"}).send('Not Found');
				next(err);
				return;
			} 
			// Make sure car is parked at the charger
			if (entity.charger != req.params.charger_id) {
				res.status(403).json({"Error": "This car is not parked at this charger"}).send('Forbidden');
				return;
			}
			// Make sure name in JWT matches car owner
			if (entity.owner != req.user.sub) {
				res.status(403).json({ "Error": "User sub ID in JWT token does not match car owner."}).send('Forbidden');
			}
			// Update the car to have no charger
			entity.charger = null;
			model.update("Car", req.params.car_id, entity, (err, entity) => {
				if (err) {
					next(err);
					return;
				}
				res.status(204).send('No Content');
			});
		});
	});
});


module.exports = router;