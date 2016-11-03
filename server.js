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
   var choices = ['Female', 'Male'];
   var randomGender = _.sample(choices);

   Character.find({ random: { $near: [Math.random(), 0] } })
     .where('voted', false)
     .where('gender', randomGender)
     .limit(2)
     .exec(function(err, characters) {
       if (err) return next(err);

       if (characters.length === 2) {
         return res.send(characters);
       }

       var oppositeGender = _.first(_.without(choices, randomGender));

       Character
         .find({ random: { $near: [Math.random(), 0] } })
         .where('voted', false)
         .where('gender', oppositeGender)
         .limit(2)
         .exec(function(err, characters) {
           if (err) return next(err);

           if (characters.length === 2) {
             return res.send(characters);
           }

           Character.update({}, { $set: { voted: false } }, { multi: true }, function(err) {
             if (err) return next(err);
             res.send([]);
           });
         });
     });
 });

 /**
  * PUT /api/characters
  * update winning and losing count for both characters.
  */
app.put('api/characters', function(req, res, next) {
  var winner = req.body.winner;
  var loser = req.body.loser;

  if(!winner || !loser) {
    return res.status(400).send({ message: 'Voting requires two characters.' })
  }

  if(winner === loser) {
    return res.status(400).send({ message: 'Cannot vote for and against the same character.' });
  }

  async.parallel([
    function(callback){
      Character.findOne({ characterId: winner }, function(err, winner) {
        callback(err, winner);
      });
    }
  ],
  function(err, results) {
    if (err) return next(err);

    var winner = results[0];
    var loser = results[1];

    if(!winner || !loser) {
      return res.status(404).send({ message: 'One of the characters no longer exists.' });
    }

    if(winner.voted || loser.voted) {
      return res.status(200).end();
    }

    async.parallel([
      function(callback) {
        winner.wins ++;
        winner.voted = true;
        winner.random = [Math.random(), 0];
        winner.save(function(err) {
          callback(err);
        });
      },
      function(callback) {
        loser.losses++;
        loser.voted = true;
        loser.random = [Math.random(), 0];
        loser.save(function (err) {
          callback(err);
        });
      }
    ], function(err) {
      if(err) return next (err);
      res.status(200).end();
    });
  });
});

/**
 * GET /api/characters/count
 * Return the total number of characters.
 */
app.get('api/characters/count', function(req, res, next) {
  Character.count({ }, function(err, count) {
    if (err) return next(err);
    res.send({ count: count });
  });
});

/**
 * GET /api/characters/search
 * Looks up a character by name. (case-insensitive)
 */
app.get('api/characters/search', function(req, res, next) {
  var characterName = new RegExp(req.query.name, 'i');

  Character.findOne({ name: characterName }, function(err, character) {
    if (err) return next (err);

    if (!character) {
      return res.status(404).send({ message: 'Character not found.' });
    }

    res.send(charachter);
  });
});

/**
 * GET /api/characters/:id
 * Returns detailed charachter information.
 */
app.get('/api/characters/:id', function(req, res, next){
  var id = req.params.id;

  Character.findOne({ characterId: id }, function(err, character) {
    if (err) return next(err);

    if(!character) {
      return res.status(404).send({ message: 'Character not found.' });
    }

    res.send(character);
  });
});

/**
 * GET /api/characters/top
 * Return 100 highest ranked characters. Filter by gender, race and bloodline.
 */
app.get('/api/characters/top', function(req, res, next) {
  var params = req.query;
  var conditions = {};

  _.each(params, function(value, key) {
    conditions[key] = new RegExp('^' + value + '$', 'i');
  });

  Character
    .find(conditions)
    .sort('-wins')  //sort in descending order (highest wins on top)
    .limit(100)
    .exec(function(err, characters) {
      if (err) return next(err);

      //sort by winneing percentage
      characters.sort(function(a, b){
        if(a.wins / (a.wins + a.losses) < b.wins / (b.wins + b.losses)) { return 1; }
        if(a.wins / (a.wins + a.losses) > b.wins / (b.wins + b.losses)) { return -1; }
        return 0;
      });

      res.send(characters);
    });
});

/**
 * GET /api/character/shame
 * Return 100 lowest ranked characters.
 */
app.get('/api/characters/shame', function(req, res, next) {
  Character
    .find()
    .sort('-losses')
    .limit(100)
    .exec(function(err, characters) {
      if (err) return next(err);
      res.send(characters);
    });
});

//POST /api/report

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
