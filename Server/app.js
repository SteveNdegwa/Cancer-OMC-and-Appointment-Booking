const express = require('express');
const app = express();

const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();


const fs = require('fs');
const path = require('path');

const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const store = new session.MemoryStore();

app.use(cookieParser('secretStringForCookies'));
app.use(session({
    secret: 'secretStringForSession',
    // cookie: { maxAge: 60000 },
    resave: true,
    saveUninitialized: false,
    store: store
}));
app.use(flash());


app.use(cors()); //send data between front and backend
app.use(express.json()); // to get access to data being sent through url eg name,password sent using http requests by java script
app.use(express.urlencoded({ extended:false}));   //to get data being sent through url eg name,password sent through html forms


app.use(express.static(path.resolve("./public")));

app.set('view engine', 'ejs');



//to routes

const home = require('./routes/home');  //to home router
app.use('/', home);

const login = require('./routes/login');  //to login router
app.use('/login', login);

const register = require('./routes/register');  //to login router
app.use('/register', register);




app.listen(5000, ()=>{
    console.log('server listening at port 5000');
});
