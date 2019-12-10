// Most of these functions are from https://github.com/GoogleCloudPlatform/nodejs-getting-started/blob/steps/2-structured-data/books/model-datastore.js

const {Datastore} = require('@google-cloud/datastore');

// [START config]
const ds = new Datastore();
// [END config]

function fromDatastore(obj) {
  obj.id = obj[Datastore.KEY].id;
  // If id is not the KEY, try name
  if (!obj.id){
	  obj.id = obj[Datastore.KEY].name;
  }
  return obj;
}

function toDatastore(obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  const results = [];
  Object.keys(obj).forEach(k => {
    if (obj[k] === undefined) {
      return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1,
    });
  });
  return results;
}


// [START list]
function list(kind, limit, token, cb) {

  let sort = null;
  // Sort based on item type
  if (kind === "User") { sort = "displayName"; }
  else if (kind === "Car") { sort = "model"; } 
  else if (kind === "Charger") { sort = "address"; }

  let q = ds
    .createQuery([kind])
    .order(sort)
    .limit(limit);
    
  if(token){
    q = q.start(token);
  }
  
  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore =
      nextQuery.moreResults !== Datastore.NO_MORE_RESULTS
        ? nextQuery.endCursor
        : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });
}
// [END list]

// Return entities containing the owner
function getByOwner(kind, owner, cb) {

     let q = ds
          .createQuery([kind])
          .filter('owner', '=', owner)
     // After hours and hours 
     // I could not get adding another
     // filter to work

     ds.runQuery(q, (err, entities) => {
          if (err) {
               cb(err);
               return;
          }
          cb(null, entities.map(fromDatastore));
     });
}

// Return car containing the charger
function carByCharger(chargerID, cb) {

     let q = ds
          .createQuery(["Car"])
          .filter('charger', '=', chargerID)

     ds.runQuery(q, (err, entities) => {
          if (err) {
               cb(err);
               return;
          }
		  if (entities.length)
		  {
				cb(null, entities.map(fromDatastore));
		  }
		  else 
		  {
			  cb(null, null);
		  }
     });
}

// [START update]
function update(kind, id, data, cb) {
  let key;
  if (id) {
    key = ds.key([kind, parseInt(id, 10)]);
  } else {
    key = ds.key(kind);
  }

  const entity = {
    key: key,
    data: toDatastore(data, []),
  };

  ds.save(entity, err => {
    data.id = entity.key.id;
    cb(err, err ? null : data);
  });
}
// [END update]

function create(kind, data, cb) {
  update(kind, null, data, cb);
}

function read(kind, id, cb) {
  // Original line:
  // const key = ds.key([parseInt(id, 10)]);
  const key = ds.key([kind, id]);
  ds.get(key, (err, entity) => {
    if (!err && !entity) {
      err = {
        code: 404,
        message: 'Not found',
      };
    }
    if (err) {
      cb(err);
      return;
    }
    cb(null, fromDatastore(entity));
  });
}

function _delete(kind, id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.delete(key, cb);
}

// [START exports]
module.exports = {
  create,
  read,
  update,
  delete: _delete,
  list,
  carByCharger,
  getByOwner
};
// [END exports]