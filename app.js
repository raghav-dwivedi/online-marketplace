const path = require('path');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI = 'mongodb+srv://raghav:IqVmtHF4WEcDKkOJ@cluster0.bhzjg.mongodb.net/shop';

const app = express();
const store = MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdirSync('images', {
            recursive: true
        });
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
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


app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(multer({
    storage: fileStorage,
    fileFilter: fileFilter
}).single('image')); // because parameter name is image in the view
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'images')));
app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
}));
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user._id)
            .then(user => {
                if (!user) {
                    return next();
                }
                req.user = user;
                next();
            })
            .catch(err => {
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

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
    console.log(error);
    res.redirect('/500');
});

mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(result => {
        app.listen(3000);
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
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