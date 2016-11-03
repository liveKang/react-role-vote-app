import React from 'react';
import {Route, NotFoundRoute} from 'react-router';
import App from './components/App';
import Home from './components/Home';
import AddCharacter from './components/AddCharacter';
import Character from './components/Character';

export default (
  <Route handler={App}>
    <Route path='/' handler={Home} />
    <Route path='/add' handler={AddCharacter} />
    <Route path='/character/:id' handler={Character} />
  </Route>
);
