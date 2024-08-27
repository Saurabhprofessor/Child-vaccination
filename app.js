require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const ejs = require('ejs');
const Schema = mongoose.Schema;
const _ = require("lodash");
mongoose.set("strictQuery", false);

const { isUserOrAdmin, isAdmin, isUser } = require('./authMiddleware');
const saltrounds = 11;
const app = express();
app.use(express.json());
const dbString = process.env.ATLAS_URL;

let loc = "";

mongoose.connect(dbString).then(() => console.log('connected to atlas')).catch(err => {
  console.log(err);
})


const store = new MongoStore({
  mongoUrl: dbString,
  collectionName: 'sessions',
  ttl: 24 * 60 * 60 // 1 day in seconds
});



app.use(session({
  secret: 'some secret',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 60 * 60 * 24 * 1000  //1d
  }
}))

app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());




const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  }, admin: {
    type: Boolean,
    default: false
  },
  superUser: {
    type: Boolean,
    deafult: false
  }


}, {
  timestamps: true
})

const User = mongoose.model("User", userSchema);

const vaccineSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  vaccineType: {
    type: String
  },
  email: {
    type: String,
    required: true,
    unique: true
  }, city: {
    type: String
  }, age: {
    type: Number
  },
  address: {
    type: String
  }
}, {
  timestamps: true
})

const Vaccine = mongoose.model("Vaccine", vaccineSchema);



/////////////////////////////////////////////////////////////////passport middleware




function validPassword(password, hash, callback) {
  bcrypt.compare(password, hash, function (err, result) {
    if (err) {
      return callback(err);
    }
    console.log(password);
    return callback(null, result === true);
  });
}



const verifyCallback = (username, password, done) => {
  console.log(`verifycallback${username}`);
  User.findOne({ email: username })
    .then((user) => {
      if (!user) {
        return done(null, false);
      }
      validPassword(password, user.password, (err, isValid) => {
        if (err) {
          return done(err);
        }
        if (isValid) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      });
    })
    .catch((err) => {
      console.log(err);
      return done(err);
    });
};


const strategy = new LocalStrategy(verifyCallback);
passport.use(strategy)

passport.serializeUser(
  (user, done) => {
    done(null, user.id);
    console.log("inside serilaizerUser");
    console.log(user.id);
  }
)




passport.deserializeUser(async (userId, done) => {
  // console.log("deserializeUser", userId);
  try {
    const user = await User.findById(userId);
    // console.log("user", user);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

///////////////////////////////////////////////////////////////////Register
app.get("/reg", function (req, res) {

  res.render("reg");

})


app.post('/reg', (req, res) => {

  const username = req.body.name;
  console.log(username);
  console.log(req.body.passport);

  bcrypt.hash(req.body.password, saltrounds, (err, hash) => {
    if (err) {
      console.log();
    } else {

      const newUser = new User({
        username: req.body.name,
        email: req.body.username,
        password: hash

      })


      async function saveUser() {
        try {
          await newUser.save();
          console.log("nearly inside");
          await res.redirect('/login');
          // res.send("yoo")

        } catch (err) {
          res.status(400).json("validation error")

          console.log(err);
        }

      }
      saveUser();

    }

  })
})



/////////////////////////////////////////////////////////////////////////////Login
app.get("/login", function (req, res) {
  res.render('login');
})
app.post('/login', passport.authenticate('local', {
  successRedirect: '/logedIn',
  failureRedirect: '/failure'
}));





//////////////////////////////////////////

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {

      res.redirect("/")
    }
  });
});



app.get("/", async function (req, res) {
  res.render("home")
});



//////////////////////////////////////////////////////////////////////loged in 

app.post("/", async (req, res) => {
  console.log(req.body);
  const newVaccine = new Vaccine({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    address: req.body.address,
    vaccineType: req.body.vaccineType,
    city: _.upperFirst(_.toLower(req.body.city)),
    email: req.body.email
  })
  try {
    await newVaccine.save();
    res.render("success");

  } catch (error) {
    console.log(error)
    res.status(400).json("Email Already Registered");
  }
})


app.post("/logedIn", isUserOrAdmin, (req, res) => {
  loc = req.body.payload.trim();

  res.redirect("/logedIn")
})

app.get("/logedIn", isUserOrAdmin, async (req, res) => {
  if (req.user.admin) {

    try {

      const data = await Vaccine.find({}).exec();
      console.log(loc);
      res.render('admin', { userInfo: req.user, data: data, loc: _.upperFirst(_.toLower(loc)) })

    } catch (err) {
      console.log(err);

    }

  } else {
    res.render('home');
  }

})


app.get("/failure", (req, res) => {
  res.status(400).json("Invalid crediantials");
})



app.get("/about_us", (req, res) => {
  res.render('aboutUs');
})



app.listen(3000, function () {
  console.log("server started at port 3000");
})
