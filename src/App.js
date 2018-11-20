import React, { Component } from 'react';
import './App.css';
import Screensaver from './components/Screensaver/Screensaver';
import nextarrow from './assets/nextarrowbigwhite.png';
import prevarrow from './assets/prevarrowbigwhite.png';


class App extends Component {
  state = {
    index: 0,
    maxIndex: 5,
  }

  nextPictureHandler = (props) => {
    let i = this.state.index;
    this.setState({index: (++i%5)});
  }

  prevPictureHandler = (props) => {
    let i = this.state.index;
    if(i === 0)
    {
      i = 4;
    }
    else
    {
      i = --i % 5;
    }
    this.setState({index: i});
  }

  myVar = setInterval(this.nextPictureHandler, 6000);

  // componentDidMount() {
  // setInterval(this.changePictureHandler(this.index), 2000);
  // setInterval(this.nextPictureHandler(this.index), 2000);
  // }

  render() {

    return (
      <div className="App">
        <Screensaver
          index={this.state.index}
          changed={this.props.changed} />
        <img
          src={nextarrow} alt="Next Arrow" className='NextArrow'
          onClick={() => this.nextPictureHandler(this.index)} />
        <img
          src={prevarrow} alt="Previous Arrow" className='PrevArrow'
          onClick={() => this.prevPictureHandler(this.index)} />
      </div>
    );
  }
}

export default App;
