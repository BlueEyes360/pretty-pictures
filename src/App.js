import React, { Component } from 'react';
import './App.css';
import Screensaver from './components/Screensaver/Screensaver';
import nextarrow from './assets/nextarrowbig.png';


class App extends Component {
  state = {
    index: 0,
    maxIndex: 5,
  }

  changePictureHandler = (props) => {
    let i = this.state.index;
    this.setState({index: (++i%5)});
  }

  // componentDidMount() {
  // setInterval(this.changePictureHandler(this.index), 2000);
  // }

  render() {

    const style = {
      backgroundColor: 'white',
      color: "blue",
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
        {/* <button
          onClick={() => this.changePictureHandler(this.index)}
          className="Button"
        >Change Picture</button> */}
        <img
          src={nextarrow} alt="Next Arrow" className='NextArrow'
          onClick={() => this.changePictureHandler(this.index)} />
      </div>
    );
  }
}

export default App;
