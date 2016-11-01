var express = require('express');
var path = require('path');
var logger = require('morgan');   //http请求日志
var bodyParser = require('body-parser');   //渲染POST请求数据
var mongoose = require('mongoose');
var Character = require('./models/character');

var swig = require('swig');
var React = require('react');
var Router = require('react-router');
var routes = require('./app/routes');
var config = require('./config');

var async = require('async');
var request = require('request');
var _ = require('underscore');

mongoose.connect(config.database);
mongoose.connection.on('error', function() {
  console.info("Error: Could not connect to MongoDB. Did you forget to run `mongod`?");
});

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * post /api/character
 * Adds new character to the database.
 */
app.post('api/character', function(req, res, next) {
  var gender = req.body.gender;
  var characterName = req.body.name;
  var characterIdLookupUrl = 'https://api.eveonline.com/eve/CharacterID.xml.aspx?names=' + characterName;

  var parser = new xml2js.Parser();

  async.waterfall({
    function (callback) {
      request.get(characterIdLookupUrl, function(err, request, xml) {
        if(err) return next(err);
        parser.parserString(xml, function(err, parsedXml) {
          if(err) return next (err);
          try {
            var characterId = parserXml.eveapi.result[0].rowset[0].row[0].$.characterID;

            Character.findOne({ characterId: characterId }, function(err, character) {
              if (err) return next(err);

              if (character) {
                return res.status(409).send({message: character.name + ' is already in the database.' });
              }

              callback(err, characterId);
            });
          } catch (e) {
            return res.status(400).send({ message: 'XML Parse Error' });
          }
        });
      });
    },
    function (characterId) {
      var characterInfoUrl = 'https://api.eveonline.com/eve/CharacterInfo.xml.aspx?characterID=' + characterId;

      request.get({ url: characterInfoUrl }, function(err, request, xml) {
        if (err) return next (err);
        parser.parserString(xml, function(err, parserXml) {
          if (err) return res.send(err);
          try {
            var name = parserXml.eveapi.result[0].characterName[0];
            var race = parserXml.eveapi.result[0].race[0];
            var bloodline = parserXml.eveapi.result[0].bloodline[0];

            var character = new characterId({
              characterId: characterId,
              name: name,
              race: race,
              bloodline: bloodline,
              gender: gender,
              random: [Math.randon(), 0]
            });

            character.save(function(err) {
              if (err) return next (err);
              res.send({ message: characterName + ' has been added successfully! ' });
            });
          } catch (e) {
            res.status(404).send({ message: characterName + ' is not a registered citizen of New Eden.' });
          }
        });
      });
    }
  });
});


/**
 *GET /api/characters
 * Return 2 random characters of the same gender that hava not been voted
 */
app.get('/api/characters', function(req, res, next) {
  var choices = ['Female','Male'];
  var randomGender = _.sample(choices);

  Character.find({ random: { $near: [Math.random(), 0] } })
    .where('voted', false)
    .where('gender', randomGender)
    .limit(2)
    .exec(function(err, characters) {
      if (err) return next(err);

      if(characters.length === 2) {
        return res.send(characters);
      }

      var oppositeGender = _.first(_.without(choices, randomGender));

      Character
        .find({ random: { $near: [Math.random(), 0] } })
        .where('voted', false)
        .where('gender', randomGender)
        .limit(2)
        .exec(function(err, characters) {
          if(err) return next (err);

          if(characters.length === 2){
            return res.send(characters);
          }

          Character.update({}, { $set: { voted: false } }, { multi: true} ), function (err) {
            if (err) return next (err);
            res.send([]);
        });
      });
   });
});



app.use(function(req, res) {
  Router.run(routes, req.path, function(Handler) {
    var html = React.renderToString(React.createElement(Handler));
    var page = swig.renderFile('views/index.html', { html: html });
    res.send(page);
  });
});

/**
 * Socket.io stuff
 */

var server = require('http').createServer(app);
var io = require('socket.io')(server);
var onlineUsers = 0;

io.sockets.on('connection', function(socket){
  onlineUsers++;

  io.sockets.emit('onlineUsers', { onlineUsers: onlineUsers });

  socket.on('disconnect', function() {
    onlineUsers--;
    io.sockets.emit('onlineUsers',{ onlineUsers: onlineUsers });
  });
});

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
