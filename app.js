const path = require('path');
const fs = require('fs');
const https = require('https');

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const s3Proxy = require('s3-proxy');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const crypto = require('crypto');

let nonce = crypto.randomBytes(16).toString('base64');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.bhzjg.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;

const app = express();
const store = MongoDBStore({
	uri: MONGODB_URI,
	collection: 'sessions',
});
const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

const s3 = new AWS.S3({});

const fileStorage = multerS3({
	s3: s3,
	bucket: 'online-marketplace-images',
	metadata: (req, file, cb) => {
		cb(null, { fieldname: file.fieldname });
	},
	key: (req, file, cb) => {
		req.imageUrl =
			'media/' + Date.now() + '.' + file.mimetype.split('/')[1];
		cb(null, req.imageUrl);
	},
	limits: {
		fileSize: 2 * 1024 * 1024,
	},
});

const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === 'image/png' ||
		file.mimetype === 'image/jpg' ||
		file.mimetype === 'image/jpeg'
	) {
		cb(null, true);
	} else {
		cb(null, false);
	}
};

app.set('view engine', 'pug');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(
	path.join(__dirname, 'access.log'),
	{ flags: 'a' }
);

app.use((req, res, next) => {
	res.locals.cspNonce = crypto.randomBytes(16).toString('hex');
	next();
});

app.use(
	helmet.contentSecurityPolicy({
		useDefaults: true,
		directives: {
			'script-src': [
				"'self'",
				"'unsafe-inline'",
				'https://js.stripe.com/v3/',
			],
			'frame-src': ["'self'", 'https://js.stripe.com/v3/'],
			'script-src-attr': "'unsafe-inline'",
		},
	})
);
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(
	express.urlencoded({
		extended: false,
	})
);

app.use(
	multer({
		storage: fileStorage,
		fileFilter: fileFilter,
	}).single('image')
); // because parameter name is image in the view

app.use(express.static(path.join(__dirname, 'public')));

app.use(
	session({
		secret: `${process.env.SESSION_SECRET}`,
		resave: false,
		saveUninitialized: false,
		store: store,
	})
);
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
	if (req.session.user) {
		User.findById(req.session.user._id)
			.then((user) => {
				if (!user) {
					return next();
				}
				req.user = user;
				next();
			})
			.catch((err) => {
				throw new Error(err);
			});
	} else {
		next();
	}
});

app.use((req, res, next) => {
	res.locals.isAuthenticated = req.session.isLoggedIn;
	res.locals.csrfToken = req.csrfToken();
	next();
});

app.get(
	'/media/*',
	s3Proxy({
		bucket: 'online-marketplace-images',
		accessKeyId: `${process.env.AWS_ACCESS_KEY_ID}`,
		secretAccessKey: `${process.env.AWS_SECRET_ACCESS_KEY}`,
		overrideCacheControl: 'max-age=2592000',
	})
);

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
	console.log(error);
	res.redirect('/500');
});

mongoose
	.connect(MONGODB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then((result) => {
		// https
		// 	.createServer(
		// 		{
		// 			key: privateKey,
		// 			cert: certificate,
		// 		},
		// 		app
		// 	)
		// 	.listen(process.env.PORT || 3000);
		app.listen(process.env.PORT || 3000);
	})
	.catch((err) => {
		const error = new Error(err);
		error.httpStatusCode = 500;
		console.log(error);
	});

/*
 const routes = require('./routes-Section3')
 const server = http.createServer(routes-Section3.handler);
*/

/*
 const server = http.createServer(app);
 server.listen(3000);
*/

// use process.exit(); to end the server, but it is not used often as we want to keep our server always running

// Visit the express.js github repository application.js file and search for functions like send, listen, etc for
// details on how they work
