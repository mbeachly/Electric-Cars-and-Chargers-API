const router = module.exports = require('express').Router();
router.use('/users', require('./users.js'));
router.use('/cars', require('./cars.js'));
router.use('/chargers', require('./chargers.js'));