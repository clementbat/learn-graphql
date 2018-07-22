var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.info('Connected to the mondo DB')

  var userSchema = mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    }
  });
  
  userSchema.methods.validateUserProps = () => {
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
      removeUser(username: String!): String
      updatePassword(username: String!, password: String!, newPassword: String!): userSchema
    }
  `);

  // The root provides a resolver function for each API endpoint
  var root = {
    createUser: (args) => {
      var userToCreate = new User({ username: args.username, password: args.password });

      if (userToCreate.validateUserProps()) {        
        userToCreate.save(function (err, userToCreate) {
          if (err) {
            console.error(err)
            throw err
          }
          return userToCreate
        })
      } else {
        throw 'password or username is not long enough'
      }
    },
    removeUser: (args) => {
      var userInDb = User.find({username: args.username})
      if (userInDb) {
        db.collection('users').remove({username: args.username})
      }
      return 'User has been deleted'
    },
    updatePassword: (args) => {
      var userInDb = User.findOne({username: args.username})
        .then((res) => {
          if (res.password === args.password) {
            User.findOneAndUpdate({username: args.username}, {$set:{password: args.newPassword}}, {new: true}, (err) => {
              if (err) {
                console.error(err)
              }
            })
          }
        })
    },
    listUsers: () => {
      return User.find({}, { _id: 0, username: 1})
        .then((result) => result.map(item => item.username))
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












