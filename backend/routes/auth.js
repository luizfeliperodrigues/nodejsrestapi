const express = require('express');

const { body } = require('express-validator/check');

const router = express.Router();

const User = require('../models/user');

const authController = require('../controllers/auth');
const isAuth = require('../middleware/is-auth');

router.put('/signup', [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .custom((value, { req }) => {
            return User.findOne({ email: value }).then(userDoc => {
                if (userDoc) {
                    return Promise.reject('Email already exists.')
                }
            })
        }),
        // .normalizeEmail(),
    body('password')
        .trim()
        .isLength({ min:5 }),
    body('name')
        .trim()
        .not()
        .isEmpty()
], authController.signup);

router.post('/login', authController.login);

router.get('/status', isAuth, authController.getStatus);

router.put('/status', isAuth, [
    body('status')
        .trim()
        .not()
        .isEmpty()
], authController.updateStatus);

module.exports = router;