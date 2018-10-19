let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}


var express			= require('express'),
	app				= express(),
	bodyParser		= require('body-parser'),
	mongoose		= require('mongoose'),
	passport		= require('passport'),
	localStrategy	= require('passport-local'),
	methodOverride	= require('method-override'),
	flash			= require('connect-flash'),
	SHA256 			= require("crypto-js/sha256");

//=======================
//MODELS
//=======================
var	Categorie			= require('./models/categorie'),
	Forum				= require('./models/forum'),
	Thread				= require('./models/thread'),
	Comment				= require('./models/comment'),
	User				= require('./models/user');

app.set('view engine','ejs');
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended:true}));
mongoose.connect(process.env.databaseURL, { useNewUrlParser: true });
app.use(methodOverride("_method"));
app.use(flash());

app.use(require("express-session")({
	secret:"Secret Pass",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
	res.locals.currentUser 	= req.user;
	res.locals.error		= req.flash('error');
	res.locals.success		= req.flash('success');
	next();
});

//=======================
// MAIN ROUTES
//=======================
app.get("/",function(req,res){
	Categorie.find({},function(err,categories){
		if (err){
			console.log(err);
		} else {
			res.render('main',{categories:categories});
		}
	})
});


//=======================
//AUTH ROUTES
//=======================

app.get('/login',function(req,res){
	if (!req.user){
		res.render('login');
	} else {
		req.flash('error', 'You already connected');
		res.redirect('/');
}});

app.post('/login',passport.authenticate('local', {failureRedirect: '/login',failureFlash: true}),function(req, res) {
		req.flash('success', 'Welcome back ' + req.body.username);
		res.redirect('/');
    }
);

app.get('/register',function(req,res){
	res.render('register');
});
app.post('/register',function(req,res){
	// req.body = all info
	var newUser = {username: req.body.username, email: req.body.email, isAdmin: 'false'};
	User.register(newUser, req.body.password, function(err,createdUser){
		if (err){
			req.flash("error",err.message);
			return res.redirect('/register');
		}
			passport.authenticate('local')(req,res,function(){
				req.flash("success","Welcome to HYPE forum " + req.user.username);
				res.redirect("/");
	})
	})
});
app.get('/logout', function(req,res){
	req.logout();
	req.flash('success','You Have Logged Out!');
	res.redirect("/");
})

//=======================
//CATEGORIE CREATING
//=======================
app.get('/catcreate',isAdmin,function(req,res){
	res.render("create/cat");
});
app.post("/catcreate",isAdmin,function(req,res){
	var newCategorie = {title: req.body.name,icon:req.body.icon}
	Categorie.create(newCategorie, function(err,newCat){
		if (err){
			res.send(err)
		} else {
			res.redirect("/");
		}
	})
});

//=======================
//CATEGORIE DELETE
//=======================
app.get('/catdelete',isAdmin,function(req,res){
	Categorie.find({},function(err,foundCategories){
		if (err){
			console.log(err);
		}
		else {
			res.render('delete/cat',{categories:foundCategories});
		}
	}
)});

app.post('/catdelete',isAdmin,function(req,res){
	var selectedCategories = req.body.categories;
	if (typeof(selectedCategories) === 'string'){
		Categorie.findByIdAndRemove(selectedCategories, function(err){
			if (err){
				console.log('error deleteing categorie');
			} else {
				req.flash('success','Selected categorie has been deleted!')
				res.redirect('/')
			}
		})
	} else {
		selectedCategories.forEach(function(selectedCategorie){
			Categorie.findByIdAndRemove(selectedCategorie, function(err){
				if (err){
					console.log('error deleting caregorie '+selectedCategorie);
					}
				}
			)
		})
				req.flash('success','Selected categories has been deleted!')
				res.redirect('/')
	}
})

//======================================
//FORUM CREATING
//======================================
app.get("/forumcreate",isAdmin,function(req,res){
	Categorie.find({},function(err,categories){
		if (err){
			console.log("error finding categories error1");
		} else {
			res.render('create/forum',{categories:categories});
		}
	})
});
app.post('/forumcreate',isAdmin,function(req,res){
	// req.body.catId to which categorie is the forum related
	Categorie.findById(req.body.catId,function(err,foundCategorie){
		if (err){
			console.log("error finding categorie error2");
		} else {
			var newForum = {parent:foundCategorie.title,name:req.body.name,description:req.body.description ,threads:[]};
			Forum.create(newForum, function(err,createdForum){
				if (err) {
							console.log("error creating forum error3");
				} else {
					foundCategorie.forums.push(createdForum);
					foundCategorie.save();
					req.flash('success','A new forum has been born!')
					res.redirect("/");
				}
			})
		}
	})
});
//=======================
//FORUM DELETE
//=======================
app.get('/forumdelete',isAdmin,function(req,res){
	Forum.find({},function(err,foundForums){
		if (err){
			console.log('error finding forums');
		} else {
			Categorie.find({},function(err,foundCategories){
				if (err){
					console.log(err);
				} else {
					res.render('delete/forum',{forums:foundForums, categories:foundCategories});
				}
			})
		}
	})
});
app.post('/forumdelete',isAdmin,function(req,res){
	var selectedForum = req.body.forums; //forum ID
		Categorie.find({},function(err,allCategories){
			allCategories.forEach(function(categorie){
					var i = 0;
				categorie.forums.forEach(function(forum){
					if (forum._id.toString() === selectedForum){
						categorie.forums.splice(i, 1); //deleting the item from array
						categorie.save();
					} else {
						i++;
					}
				})
			})
		})
		Forum.findByIdAndRemove(selectedForum, function(err){
			if (err){
				console.log('couldnt remove forum from forums data base')
			}
		});
	req.flash('success','Selected forum has beed deleted!');
	res.redirect('/');
});
//======================================
//THREAD CREATING
//======================================
app.get("/index/:catId/:forumId/newthread", function(req,res){
	if (!req.user){
			req.flash('error','You need to log in first')
			res.redirect('/login');
	} else {
	// console.log(req.params.catId); we have forum & cat id
	res.render("create/newthread", {catId:req.params.catId,forumId:req.params.forumId});
}});
app.post("/index/:catId/:forumId", function(req,res){
	// req.params.catId = cat Id
	// req.params.forumId = forum Id
	Forum.findById(req.params.forumId, function(err,foundForum){
		if (err){
			console.log(err);
		} else {
			var newThread = {title:req.body.thread.title, author: req.user.username,authorId:req.user._id, content:req.body.thread.content, parent:req.params.forumId};
			Thread.create(newThread, function(err,createdThread){
				if (err){
					console.log("error creating thread error5");
				} else {
			foundForum.threads.push(newThread)
			foundForum.save();
			res.redirect("/index/"+req.params.catId+"/"+req.params.forumId);
				}
			})
		}
	})
});

//======================================
//COMMENT CREATING
//======================================
app.post("/index/:catId/:forumId/:threadId",function(req,res){
	Thread.findById(req.params.threadId, function(err,foundThread){
		if (err){
			console.log(err);
		} else {
			var newComment = {content: req.body.comment.content, author: req.user.username, authorId:req.user._id, parent:req.params.threadId};
			Comment.create(newComment, function(err,createdComment){
				if (err) {
					console.log(err);
				} else {
					foundThread.comments.push(createdComment);
					foundThread.save();
					res.redirect("/index/"+req.params.catId+"/"+req.params.forumId+"/"+req.params.threadId);
				}
			})
		}
	})
});
//======================================
//THREAD DELETING
//======================================
app.delete('/index/:catId/:forumId/:threadId',function(req,res){
	Thread.findByIdAndRemove(req.params.threadId,function(err){
		if (err) {
			req.flash('error','#')
			res.redirect('/');	
			console.log(err);
		} else {
			req.flash('success','Thread deleted');
			res.redirect('/index/' + req.params.catId + '/' + req.params.forumId);
		}
	})
});
//======================================
//THREAD EDIT & UPDATE
//======================================
app.get('/index/:catId/:forumId/:threadId/edit',function(req,res){
	Thread.findById(req.params.threadId, function(err,foundThread){
		if (err){
			req.flash('error','Thread not found');
			res.redirect('/');	
		} else {
			res.render('threadedit',{thread:foundThread,catId:req.params.catId,forumId:req.params.forumId,threadId:req.params.threadId});
		}
	})
})
app.put('/index/:catId/:forumId/:threadId',function(req,res){
	Thread.findByIdAndUpdate(req.params.threadId, req.body.thread, function(err,updatedThread){
		if (err){
			req.flash('error','Thread not found');
			res.redirect('/');	
		} else {
			req.flash('success','Thread has been modified');
			res.redirect('/index/' + req.params.catId + '/' + req.params.forumId + '/' + req.params.threadId);
		}
	})
});
//========================
//RESET ALL
//========================
app.get('/reset',isAdmin,function(req,res){
	res.render('reset');
})
app.post('/reset',isAdmin,function(req,res){
	var enteredPass = SHA256(req.body.pass).toString();
	if (enteredPass === ['Your Key Here']){
		mongoose.connection.collections['categories'].drop();
		mongoose.connection.collections['forums'].drop();
		mongoose.connection.collections['threads'].drop();
		mongoose.connection.collections['comments'].drop();
			req.flash('success','Fresh start!');
			res.redirect('/');
	} else {
			req.flash('error','Wrong password');
			res.redirect('/reset');	
	}
})

//========================
//ADMIN ADDING PAGE
//========================
app.get('/addadmin',isAdmin,function(req,res){
	User.find({},function(err,allUsers){
		if (err){
			console.log('error finding users');
		} else {
			res.render('addadmin',{users:allUsers});
		}
	})
});
app.post('/addadmin',isAdmin,function(req,res){
	User.findByIdAndUpdate(req.body.user, {isAdmin: 'true'}, function(err){
		if (err){
			console.log('error adding an admin');
		} else {
			req.flash('success','Admin has been added');
			res.redirect('/');	
		}
	})
})

//========================
//Showing User page
app.get('/users/:userId',function(req,res){
	User.findById(req.params.userId,function(err,foundUser){
		if (err || !foundUser){
			req.flash('error','User not found!')
			res.redirect('/');			
		} else {
			res.render("userpage",{user:foundUser});
		}
	})
});
//========================
//Updating User info
app.put('/userupdate',function(req,res){
User.findByIdAndUpdate(res.locals.currentUser._id,req.body.user,function(err,updatedUser){
	//incase of someone trying to change userId or username somehow
	if(req.body.user.username || req.body.user._id){
			req.flash('error','Unknown Error');
			return res.redirect('/');	
	} else {
		if (err){
			req.flash('error','User not found');
			res.redirect('/');	
		} else {
			req.logout();
			req.flash('success','User info has been modified, please login');
			res.redirect('/');			
		}
	}})
})
//========================
//Showing categorie page
app.get("/index/:catId",function(req,res){
	Categorie.findById(req.params.catId,function(err,foundCategorie){
		if (err || !foundCategorie){
			req.flash('error','Categorie not found!')
			res.redirect('/');
		} else {
			res.render("catpage",{categorie:foundCategorie});
			}
		}
	)});
//Showing forum page
app.get("/index/:catId/:forumId",function(req,res){
	Forum.findById(req.params.forumId, function(err,foundForum){
		if (err || !foundForum){
			req.flash('error','Forum not found!')
			res.redirect('/');
		} else {
			Categorie.findById(req.params.catId, function(err,foundCategorie){
				if (err || !foundCategorie){
					req.flash('error','Categorie not found!2')
					res.redirect('/');
				} else {
					Thread.find({parent: req.params.forumId}, function (err, foundThreads){
						if (err) {
							console.log("error finding threads error11");
						} else {
							res.render("forumpage",{forum:foundForum,categorie:foundCategorie,threads:foundThreads});
						}
					})
				}
			})
		}
	})
});
//Showing thread page
app.get("/index/:catId/:forumId/:threadId",function(req,res){
	Categorie.findById(req.params.catId,function(err,foundCategorie){
		if (err || !foundCategorie) {
			req.flash('error','Categorie not found!3')
			res.redirect('/');			
		} else {
			Forum.findById(req.params.forumId,function(err,foundForum){
				if (err || !foundForum) {
					req.flash('error','Forum not found!')
					res.redirect('/');						
				} else {
							Thread.findById(req.params.threadId, function(err, foundThread){
								if (err || !foundThread){
									req.flash('error','Thread not found!')
									res.redirect('/');
								} else {
									Comment.find({parent:req.params.threadId}, function(err,foundComments){
											if (err){
													console.log(err);
												} else {
													res.render("threadpage",{thread:foundThread,categorie:foundCategorie,forum:foundForum,comments:foundComments});
											}
									})
								}
							})
				}
			})
		}
	})
})

//======================================
app.listen(port,function(){
	console.log('Listening at port '+ port);
});


function isAdmin (req,res,next){
	if (!req.user || req.user.isAdmin === false){
			req.flash('error','You dont have a premission to do that!');
			res.redirect("/");
	} else {
		next();
	}
}