import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Screensaver from './components/Screensaver/Screensaver';


class App extends Component {
  state = {
    index: 1,
    maxIndex: 5,
  }

  changePictureHandler = (props) => {
    let i = this.state.index;
    this.setState({index: (++i%5)});
  }

  render() {

    const style = {
      opacity: "10%",
      backgroundColor: 'blue',
      color: "white",
      font: 'inherit',
      padding: "100 px",
      border: '1 px solid blue',
      ':hover': {
        backgroundColor: 'lightblue',
        color: 'black'
      },
      position: "absolute",
      top: '20%',
      right: '46%'
      // boxShadow: "0 2 px 3 px #ccc",
    };

    return (
      <div className="App">
        <Screensaver 
          index={this.state.index}
          changed={this.props.changed} />
        <button
          onClick={() => this.changePictureHandler(this.index)}
          style={style}
        >Change Picture</button>
      </div>
    );
  }
}

export default App;
