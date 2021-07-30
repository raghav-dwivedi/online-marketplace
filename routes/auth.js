const express = require('express');
const {
    check,
    body
} = require('express-validator');

const User = require('../models/user');

const router = express.Router();

const authController = require('../controllers/auth');

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.get('/reset', authController.getReset);

router.get('/reset/:token', authController.getNewPassword);

router.post(
    '/login', [
        check('email')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),

        body('password', 'Invalid password')
        .isAlphanumeric()
        .isLength({
            min: 8
        })
        .trim()
    ],
    authController.postLogin
);

router.post('/logout', authController.postLogout);

router.post(
    '/signup', [
        check('email')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .custom((value, {
            req
        }) => {
            return User.findOne({
                    email: value
                })
                .then(userDoc => {
                    if (userDoc) {
                        return Promise.reject('Account already exists.');
                    }
                });
        })
        .normalizeEmail(),

        body('password', 'Please enter an alphanumeric password of length greater than 8')
        .isLength({
            min: 8
        })
        .isAlphanumeric()
        .trim(),

        body('confirmPassword')
        .trim()
        .custom((value, {
            req
        }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match!');
            }
            return true;
        })

    ],
    authController.postSignup
);


router.post('/reset', [
    check('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .custom((value, {
        req
    }) => {
        return User.findOne({
                email: value
            })
            .then(userDoc => {
                if (!userDoc) {
                    return Promise.reject("Account doesn't exist!");
                }
            });
    })
    .normalizeEmail(),
], authController.postReset);

router.post('/new-password',
    [
        body('password', 'Please enter an alphanumeric password of length greater than 8')
        .isLength({
            min: 8
        })
        .isAlphanumeric()
        .trim(),

        body('confirmPassword')
        .trim()
        .custom((value, {
            req
        }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match!');
            }
            return true;
        })

    ], authController.postNewPassword);

module.exports = router;