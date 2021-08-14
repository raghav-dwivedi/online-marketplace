const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator');

const User = require('../models/user');

const transporter = nodemailer.createTransport(
	sendgridTransport({
		auth: {
			api_key:
				'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',
		},
	})
);

exports.getSignup = (req, res, next) => {
	res.render('auth/signup', {
		path: '/signup',
		pageTitle: 'Signup',
		hasError: false,
		preservedInput: {
			email: '',
			password: '',
			confirmPassword: '',
		},
		validationErrors: [],
	});
};

exports.postSignup = (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;
	const confirmPassword = req.body.confirmPassword;

	const errors = validationResult(req);
	console.log(errors.array());
	if (!errors.isEmpty()) {
		return res.status(422).render('auth/signup', {
			path: '/signup',
			pageTitle: 'Signup',
			hasError: true,
			preservedInput: {
				email: email,
				password: password,
				confirmPassword: confirmPassword,
			},
			validationErrors: errors.array(),
		});
	}

	bcrypt
		.hash(password, 12)
		.then((hashedPassword) => {
			const user = new User({
				email: email,
				password: hashedPassword,
				cart: {
					items: [],
				},
			});
			return user.save();
		})
		.then((result) => {
			res.redirect('/login');
			return transporter.sendMail({
				to: email,
				from: 'project.handler59@gmail.com',
				subject: 'Signup succeeded!',
				html: '<h1>You successfully signed up!</h1>',
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getLogin = (req, res, next) => {
	res.render('auth/login', {
		path: '/login',
		pageTitle: 'Login',
		hasErrorMessage: false,
		preservedInput: {
			email: '',
			password: '',
		},
		validationErrors: [],
	});
};

exports.postLogin = (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(422).render('auth/login', {
			path: '/login',
			pageTitle: 'Login',
			hasError: true,
			preservedInput: {
				email: email,
				password: password,
			},
			validationErrors: errors.array(),
		});
	}

	User.findOne({
		email: email,
	})
		.then((user) => {
			if (!user) {
				return res.status(422).render('auth/login', {
					path: '/login',
					pageTitle: 'Login',
					errorMessage: 'Wrong email or password',
					preservedInput: {
						email: email,
						password: password,
					},
					validationErrors: [],
				});
			}
			bcrypt
				.compare(password, user.password)
				.then((doMatch) => {
					if (doMatch) {
						req.session.isLoggedIn = true;
						req.session.user = user;
						// we are saving sessions document here because the mongodb might take more time to
						// update than it takes to redirect and hence we'll have old details on the page
						return req.session.save((err) => {
							console.log(err);
							res.redirect('/');
						});
					}
					return res.status(422).render('auth/login', {
						path: '/login',
						pageTitle: 'Login',
						errorMessage: 'Wrong email or password',
						preservedInput: {
							email: email,
							password: password,
						},
						validationErrors: [],
					});
				})
				.catch((err) => {
					console.log(err);
					res.redirect('/login');
				});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getReset = (req, res, next) => {
	res.render('auth/reset', {
		path: '/reset',
		pageTitle: 'Reset Password',
		hasError: false,
		preservedInput: {
			email: '',
		},
		validationErrors: [],
	});
};

exports.postReset = (req, res, next) => {
	const email = req.body.email;
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		res.status(422).render('auth/reset', {
			path: '/reset',
			pageTitle: 'Reset Password',
			hasError: true,
			preservedInput: {
				email: email,
			},
			validationErrors: errors.array(),
		});
	}
	crypto.randomBytes(32, (err, buffer) => {
		if (err) {
			console.log(err);
			return res.redirect('/reset');
		} else {
			const token = buffer.toString('hex');
			User.findOne({
				email: email,
			})
				.then((user) => {
					user.resetToken = token;
					user.resetTokenExpiration = Date.now() + 3600000;
					return user.save();
				})
				.then((result) => {
					res.redirect('/');
					return transporter.sendMail({
						to: req.body.email,
						from: 'project.handler59@gmail.com',
						subject: 'Reset Password',
						html: `
                        <p>You requested a password reset</p>
                        <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
                        `,
					});
				})
				.catch((err) => {
					const error = new Error(err);
					error.httpStatusCode = 500;
					return next(error);
				});
		}
	});
};

exports.getNewPassword = (req, res, next) => {
	const token = req.params.token;
	User.findOne({
		resetToken: token,
		resetTokenExpiration: {
			$gt: Date.now(),
		},
	})
		.then((user) => {
			res.render('auth/new-password', {
				path: '/new-password',
				pageTitle: 'Change Password',
				userId: user._id.toString(),
				passwordToken: token,
				hasError: false,
				validationErrors: [],
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postNewPassword = (req, res, next) => {
	const newPassword = req.body.password;
	const userId = req.body.userId;
	const passwordToken = req.body.passwordToken;

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return crypto.randomBytes(32, (err, buffer) => {
			if (err) {
				console.log(err);
				return res.redirect('/reset');
			} else {
				const token = buffer.toString('hex');
				User.findOne({
					_id: userId,
				})
					.then((user) => {
						user.resetToken = token;
						user.resetTokenExpiration = Date.now() + 3600000;
						return user.save();
					})
					.then(() => {
						res.status(422).render('auth/new-password', {
							path: '/new-password',
							pageTitle: 'Change Password',
							userId: userId,
							passwordToken: token,
							hasError: true,
							validationErrors: errors.array(),
						});
					});
			}
		});
	}
	User.findOne({
		resetToken: passwordToken,
		resetTokenExpiration: {
			$gt: Date.now(),
		},
	})
		.then((user) => {
			return bcrypt.hash(newPassword, 12).then((hashedPassword) => {
				user.password = hashedPassword;
				user.resetToken = undefined;
				user.resetTokenExpiration = undefined;
				return user.save();
			});
		})
		.then((result) => {
			res.redirect('/login');
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postLogout = (req, res, next) => {
	req.session.destroy((err) => {
		console.log(err);
		res.redirect('/');
	});
};
