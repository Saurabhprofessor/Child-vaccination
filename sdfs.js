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

const { isUserOrAdmin, isAdmin, isUser } = require('./authMiddleware');
// const bubbleSort = require('./sort');
const saltrounds = 11;
const app = express();



const dbString = process.env.MONGO_URL;
mongoose.connect(dbString).then(() => console.log("connected")).catch(err => console.log(err))

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

app.use(require('./router/routes'));



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
    //   validte(values){
    //     if(!validor.isEmail(value)){
    //       throw new Error('must me a email')
    //     }
    //   }Fd
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


const listSchema = new mongoose.Schema({
  // _id:{
  //   type:Object
  // },
  name: {
    type: String,
    required: true,
    unique: true
  },
  link: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String
  }, domain: {
    type: String,
    required: true
  }, count: {
    type: Number,
    default: 0
  }
})

const List = mongoose.model("List", listSchema);



const customSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  link: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String
  }, domain: {
    type: String,
    required: true
  }, author: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
})

const Userbot = mongoose.model('Userbot', customSchema);
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



// passport.deserializeUser(async (userId, done) => {
//   console.log("lvl1");
//   try {
//     const user = await User.findById(userId);
//     console.log("vl2");
//     done(null, user);
//   } catch (err) {
//     done(err);
//   }
// });
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



// app.use((req, res, next) => {
//   console.log(req.session);

//   if (req.user) {
//     console.log(req.user);
//   }
//   next();
// });




app.get("/newError",isUser,function(req,res){
  res.render('logedIn',{data:req.user})
})





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
        // admin:true,
        // superUser:true



      })


      async function saveUser() {
        try {
          await newUser.save();
          console.log("nearly inside");
          await res.redirect('/logedIn');
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

// app.get('/reg',(req,res)=>{
//   res.render('reg')
// })
// app.post('/reg',(req,res)=>{
//   console.log(req.body);
// })

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

      res.redirect("login")
    }
  });
});

/////////////////////////////////////////////////////////
// app.get("/", function (req, res) {
//     List.aggregate([
//       {
//         $match: {
//           category: { $in: ['Text to audio', 'Chat bots', 'Background', 'Text to video'] }
//         }
//       },
//       {
//         $group: {
//           _id: "$category",
//           item: { $push: "$$ROOT" }
//         }
//       },
//       {
//         $unwind: "$item"
//       },
//       {
//         $sort: { "item.count": -1 }
//       },
//       {
//         $group: {
//           _id: "$_id",
//           item: { $push: "$item" }
//         }
//       }
//     ], function (err, data) {
//       if (err) {
//         console.log(err);
//       } else {


//         (async () => {

//           const list = await List.find({},(err,listResult)=>{
//             if (err) {
//               console.log(err);
//             } else {
              
//               res.render("home", { data: data ,list:listResult});
//             }
//           }).sort({ count: 'desc' });
          
//   })(); 
//       }
//     })


// })

app.get("/", async function (req, res) {
  try {
    const data = await List.aggregate([
      {
        $match: {
          category: { $in: ['Text to audio', 'Chat bots', 'Background', 'Text to video'] }
        }
      },
      {
        $group: {
          _id: "$category",
          item: { $push: "$$ROOT" }
        }
      },
      {
        $unwind: "$item"
      },
      {
        $sort: { "item.count": -1 }
      },
      {
        $group: {
          _id: "$_id",
          item: { $push: "$item" }
        }
      }
    ]).exec();

    const listResult = await List.find({}).sort({ count: 'desc' }).exec();

    res.render("home", { data: data, list: listResult });
  } catch (err) {
    console.log(err);
  }
});



  //////////////////////////////////////////////////////////////////////////requests
  app.get("/requests", isAdmin, (req, res) => {

    // Userbot.find({}).populate('author').exec(err,userInfo)=>{
    //   if (err) {
    //     console.log(err);
    //   } else {

    //     log(userInfo.author.username)
    //   }
    // }
    // Userbot.find({}).populate('author').exec((err, userInfo) => {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     if (userInfo.author) {
    //       console.log(userInfo.author.username);
    //     } else {
    //       console.log('Author field not populated');
    //     }
    //   }

    //   res.send("jhellefsef")
    // });



    Userbot.find({}, (err, result) => {
      if (err) {

        console.log(err);
      } else {

        List.find({}, (err, listResult) => {
          if (err) {
            console.log(err);
          } else {


            res.render('requests', { data: req.user, requestInfo: result, ListInfo: listResult })
          }

        })

      }
    })
  })

  app.post("/requests", isAdmin, function (req, res) {

    const newItem = new List({
      name: req.body.name,
      link: req.body.link,
      category: req.body.category,
      description: req.body.description,
      domain: req.body.domain
    })
    // console.log(req.body.name,req.body.link,req.body.category,req.body.description,req.body.domain);

    // newItem.save();

    saveUser();

    async function saveUser() {
      try {
        await newItem.save();
        res.sendStatus(200).json('succesfully stored in database')

      } catch (err) {
        res.sendStatus(400).json("Already exist")
        // console.log(err);
      }

    }



  })
  //////////////////////////////////////////////////////////////////////loged in 

  app.post("/", function (req, res) {
  })

  app.get("/logedIn", isUserOrAdmin, (req, res) => {
    if (req.user.admin) {

      res.render('admin', { data: req.user })
    } else {
      res.render('logedIn', { data: req.user })

    }
    // res.render('logedIn',{data:req.user})
    // if(req.isAuthenticated()){
    //   }else{
    //       console.log("failed");
    //       res.status(401).json({msg:'you are not authorized to view the resource'})
    //     }

  })


  app.get("/failure", (req, res) => {

    res.status(400).json("Invalid crediantials");
    // res.render('failure')
  })

  /////////////////////////////////////////////////////////////////////////// compose
  app.get("/compose", function (req, res) {
    res.render("compose");
  })

  app.post("/compose", function (req, res) {
    // const name = req.body.siteName;

    List.findOne({ name: req.body.siteName }, function (err, foundItem) {
      if (err) {
        console.log(err);
      } else {
        if (!foundItem) {

          const newItem = new List({
            name: req.body.siteName,
            link: req.body.siteUrl,
            category: req.body.category,
            description: req.body.description,
            domain: req.body.domain
          })
          newItem.save();
          res.redirect("/logedIn");

        } else {
          console.log("Already exist");
        }
      }
    })



  })
  /////////////////////////////////////////////////////////////////////// custome compose
  app.get("/usercompose", isUser, function (req, res) {
    res.render("usercompose", { data: req.user });
  })

  app.post("/usercompose", isUser, function (req, res) {
    // const name = req.body.siteName;

    List.findOne({ name: req.body.siteName }, function (err, foundItem) {
      if (err) {
        console.log(err);
      } else {
        if (!foundItem) {

          const newbot = new Userbot({
            name: req.body.siteName,
            link: req.body.siteUrl,
            category: req.body.category,
            description: req.body.description,
            domain: req.body.domain,
            author: req.user._id
          })
          newbot.save();
          console.log("nearly saved");
          res.redirect("/logedIn");

        } else {
          console.log("Already exist");
        }
      }
    })
  })
  ///////////////////////////////////////////////////////////////////User

  app.get("/users", isAdmin, (req, res) => {

    // console.log(User.count);
    User.find({}, (err, foundResult) => {
      if (err) {
        console.log(err);
      } else {

        res.render("user", { data: req.user, UserInfo: foundResult })
      }
    }).limit(5)

  })




  app.post("/users", isAdmin, (req, res) => {

    console.log(req.body.admin_prowers);


    console.log(req.body.user_id);
    User.findByIdAndUpdate(req.body.user_id, { admin: req.body.admin_prowers }, (err) => {
      if (err) {
        console.log(err);
      }
    })

    res.redirect('/users')

  })
  //////////////////////////////////////////////////////////////////////
  // app.use(bodyParser.json());
  app.use(bodyParser.json());

  app.post("/click", (req, res) => {

    // const id = mongoose.Types.ObjectId(req.body.input_value);
    const id = req.body.input_value.trim();                            //error was because extra white space and was not in correcct format
    console.log(id);
    // const id = mongoose.Types.ObjectId(req.body.input_value);
    List.findByIdAndUpdate(id, { $inc: { count: +1 } }, (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
        console.log('sucess');
      }
    })

    // console.log(req.body);
    res.send('Success');
  })


  function errohandler(err, req, res, next) {
    // if (err) {
    //   res.send("There was an error ")
    // }
    res.json({ err: err });
  }
  // app.use(errohandler);

  app.listen(3000, function () {
    console.log("server started at port 3000");
  })
