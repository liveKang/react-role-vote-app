import React from 'react';
import {RouteHandler} from 'react-router';
import Footer from './Footer';
// import Navbar from './Navbar';
// import Footer from './Footer';

class App extends React.Component {
  render() {
    return (
      <div>
        <RouteHandler />
        <Footer />
      </div>
    );
  }
}

export default App;
