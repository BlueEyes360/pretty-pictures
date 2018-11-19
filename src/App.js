import React, { Component } from 'react';
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

  componentDidMount() {
  setInterval(this.changePictureHandler(this.index), 2000);
  }

  render() {

    const style = {
      backgroundColor: 'white',
      color: "blue",
      font: 'inherit',
      margin: "10 px",
      position: "absolute",
      bottom: '7.5vh',
      right: '12.5vw',
      height: '4vh',
      width: '10vw'
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
