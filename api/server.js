//----------------------------------------------------------------------------//
//    INTRODUCTION
//----------------------------------------------------------------------------//
// In this file, we require() a couple of packages that help us ensure that our
// responses are secure, and also help us produce useful logging of the use of
// our API server.
//
// helmet() will ensure that our responses have certain security headers, and
// morgan() can be used to log in various formats.

const express = require('express');
const hubsRouter = require('./hubs/hubs-router.js');

//----------------------------------------------------------------------------//
//    THIRD PARTY MIDDLEWARE IMPORTS
//----------------------------------------------------------------------------//
// These are examples of "third party middleware" - middleware created not by
// us (the first party), and not express() (the second party), but by a *third*
// party.
//
// If you are curious, take a peak at how morgan is written by opening
// ./modules/morgan/index.js (from the root of the project). It is just
// Express middleware, just like the ones that we write.
//
// Here, we just require() them so we can add them to our middleware chain using
// server.use() (or router.use() if we want to limit the scope of their
// application).
//
// At this point, we are just importing them through "require()". This gives us
// a middleware function that we can later "server.use()" (or router.use(), if
// we are doing it in a router file).
const helmet = require('helmet');
const morgan = require('morgan');

const server = express();

//----------------------------------------------------------------------------//
//    "USE()'ing" MIDDLEWARE
//----------------------------------------------------------------------------//
// This is where we begin hooking up our middleware functions, including
// built-in (like express.json()), third-party (like helmet() and morgan()), and
// custom (like our own addNameMiddleware() and moodyGateKeeper()).
//
// When we call server.use() or server.METHOD(), the middleware function(s) that
// we provide are added to a "router stack" in the order in which we register
// them. The router stack is really just an array of functions together with
// method names and paths. When a request comes in, its method (GET, PUT, POST,
// DELETE, etc.) and path are compared with each item in the stack, starting
// with the first one, and continuing through the stack, until it finds one
// that matches. When it fines one, that middleware method gets called and passed
// the req/res objects.
//
// When a middleware function processes a request, it can do one of 3 things:
//    1) Respond to the request
//    2) Send the request to the next matching item in the router stack
//    3) Do neither of these things
//
// If it responds to the request, processing stops, and no other matching
// middleware in the stack gets a chance to process the request.
//
// If it sends the request to the next matching item in the router stack, the
// next function that matches gets to process it (and pick one of the three
// things to do). A middleware function can pass processing to the next matching
// middleware in the stack by calling the next() method (which is passed to the
// middleware along with the req and res objects). Note that if next() is called
// with some argument (excluding reserved keywords "route" and "router"), then
// Express will look for the next *error* middleware in the chain.
//
// Doing neither of these things is not a valid option, but it's a possible one.
// In such case, the server will not respond, and the client will likely time
// out waiting for a response. To avoid this, your middleware functions must
// either respond (with res.send, res.json, res.end, etc.), or pass controll
// back to the stack by calling next().

// express.json() is a parser middleware that ensures that the text in
// the request body, if it happens to be in json format (like a stringified
// object), is converted into a JavaScript object, which we can access through
// req.body.
server.use(express.json());

// Hey look! There's that third party middleware, helmet.
server.use(helmet());

// Hey, there's the other third party middleware! Look up the docs for morgan
// to understand what the 'dev' is for.
server.use(morgan('dev'));

//----------------------------------------------------------------------------//
//    moodyGateKeeper()
//----------------------------------------------------------------------------//
// moodyGateKeeper() is another middleware demonstration. This middleware
// either responds with a 401 or passes the call to the next middleware, depending
// on the current time. I know, who would want this?!

const moodyGateKeeper = (req, res, next) => {
  const currentSeconds = new Date().getSeconds();

  if (currentSeconds % 3 === 0) {
    res.status(401).json({ message: 'You shall not pass!' });
    return;
  };

  next();
};

server.use(moodyGateKeeper);

//----------------------------------------------------------------------------//
//    ALTERNATIVE SYNTAX FOR USE()'ing MIDDLEWHERE
//----------------------------------------------------------------------------//
// When we register middleware with ".use()" or ".METHOD()", we can pass in a
// single middleware method and you can also pass in multiple methods that
// should apply to the same METHOD and path. You can do that by including them
// one after another as parameters to .use() or .METHOD():
//
//    sever.use(express.json(), helmet(), morgan('dev'));
//
// Alternatively, you can store them in an array, and pass the array as a
// parameter:
//
//    const middlewares = [
//        express.json(),
//        helmet(),
//        morgan('dev'),
//        moodyGateKeeper,
//        addNameMiddleware,
//    ];
//
//    server.use(middlewares);


// Routers are middleware too. server.use() is for mounting middleware to
// a path (or to all paths). We can pass one or more middleware methods to
// a server.use() call. Note that a "router" is a middleware function.
server.use('/api/hubs', hubsRouter);

//----------------------------------------------------------------------------//
//    addNameMiddleware()
//----------------------------------------------------------------------------//
// You can add anything you want to the request and response objects. They
// are just JavaScript objects. And, when control is passed to the "next"
// middleware, they will get a copy of the *modified* request and response
// objects. In this way, earlier middleware can pass data to the later
// middleware.
//
// In this case, we are adding a username property to the request object. The
// GET / handler later looks for this username property and returns an HTML
// document that includes it.

const addNameMiddleware = (req, res, next) => {
  req.username = req.query.username || 'Visitor';

  next();
};

//----------------------------------------------------------------------------//
//    ROUTE HANDLER FOR THE ROOT DOCUMENT PATH
//----------------------------------------------------------------------------//

server.get('/', addNameMiddleware, (req, res) => {
  // Here, we are checking for "username" on the request object. But the default
  // request object doesn't have a "username" property. If it exists, it would
  // have to have been added by some middleware that got this reqeust before
  // this function did. See "addNameMiddleware()" above.

  res.send(`
    <h2>Lambda Hubs API</h2>
    <p>Welcome to the Lambda Hubs API, ${req.username}!</p>
  `);
});

//----------------------------------------------------------------------------//
//    CATCH-ALL 404 HANDLER
//----------------------------------------------------------------------------//
// This handler comes after all route handlers and gets matched to every request.
// If there is no other route handler that processed the request, we want it to
// end up here, so that we can avoid sending back a generic Express.js 404
// response.

server.use((req, res, next) => {
  res.status(404).json({ message: 'Resource could not be found' });
});

//----------------------------------------------------------------------------//
//    ERROR HANDLING MIDDLEWARE
//----------------------------------------------------------------------------//
// Middleware that accepts *4* parameters is specially tagged as "error handling
// middleware" by Express. The first parameter is the error parameter. When
// an argument is passed with next(), that argument gets passed to error handling
// middleware as the first parameter. It is usually named "err" or "error" by
// convention. Also, it is often an instance of the Error() class (or something
// inherited from it), but it doesn't have to be. It can be any value you want
// to send.
//
// If you .use() it at or near the top of the file, like other middleware (eg
// express.json()), this error handler will be early in the middleware stack.
// And once you have passed a middleware function in the stack, no amount of
// "next()'ing" will allow you to go back to it. There is no previous() in
// Express!
//
// With error handling middleware, calling next() without a parameter will skip
// it. If you intend for the "next error handler" to be called, you must pass
// a value to next(), and it will go to the *next* error handler in the chain.
// If we .use() this error handler at the top of the file, it will be before
// the other middleware functions that may need to "next(error)" to it. For
// that reason, we must .use() this error handling middleware *after* all the
// middlewares that we want to work with it.
//
// Note also that an error handling middleware method must accept 4 parameters.
// Even though we have no need for the "next()" parameter, we must accept it.
// Otherwise, Express will not recognize this as an error handler. It cannot
// distinguish between server.use((req, res, next)) and
// server.use((error, req, res)) - the parameter names are meaningless to
// Express, it's only the number of parameters that matters.

server.use((err, req, res, next) => {
  const message = err?.errorMessage || 'Something went wrong';

  res.status(500).json({ message });
});


module.exports = server;
