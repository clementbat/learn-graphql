var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.info('Connected to the mondo DB')

  var userSchema = mongoose.Schema({
    username: String,
    password: String
  });
  
  userSchema.methods.validateUserProps = function () {
    // username should be at least 3 characters and password 8
    return this.username.length > 2 && this.password.length > 7
  }

  var User = mongoose.model('User', userSchema);

  // Construct a schema, using GraphQL schema language
  var schema = buildSchema(`
    type userSchema {
      username: String!,
      password: String!
    }

    type Query {
      createUser(password: String!, username: String!): userSchema
      listUsers: [String]
    }
  `);

  // The root provides a resolver function for each API endpoint
  var root = {
    createUser: (args) => {
      var userToCreate = new User({ username: args.username, password: args.password });

      if (userToCreate.validateUserProps()) {
        return new Promise((resolve, reject) => {
          userToCreate.save(function (err, userToCreate) {
            if (err) {
              console.error(err);
              reject(err)
            }
            resolve()
          })
        })
        .then(function() {
          return userToCreate;
        });
      } else {
        throw 'password or username is not long enough'
      }
    },
    listUsers: () => {
      return db.collection('users').find({}).toArray()
        .then(function(res) {
          return res;
        });
    },
  };

  var app = express();
  app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  }));
  app.listen(4000);
  console.log('Running a GraphQL API server at localhost:4000/graphql');
  

});












