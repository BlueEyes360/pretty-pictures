import React, { Component } from 'react';
import './App.css';
import Screensaver from './components/Screensaver/Screensaver';
import InfoCard from './components/InfoCard/InfoCard';
import Loading from './components/Loading/Loading';

import getart from './components/GetArt/GetArt';

import nextarrow from './assets/nextarrowbigwhite.png';
import prevarrow from './assets/prevarrowbigwhite.png';
import menu from './assets/menu.png';

class App extends Component {
  state = {
    index: 0,
    maxIndex: 5,
    data: 0,
  }

  dataHandler = (props) => {
    let newData = getart();
    this.setState({data: newData});
    console.log("Inside dataHandler: newData = " + {newData});
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

  timingLoop = setInterval(this.nextPictureHandler, 60000);

  componentWillMount() {

    if(this.state.data === 0)
    {
      this.dataHandler();
      console.log("Inside CmpWillMnt:dataHandler fired");
    }

  }

  render() {

    return (
      <div className="App">
        <Screensaver
          index={this.state.index}
          changed={this.props.changed} />
        <img
          src={nextarrow} alt="Next Arrow" className='NextArrow Arrow'
          onClick={() => this.nextPictureHandler(this.index)} />
        <img
          src={prevarrow} alt="Previous Arrow" className='PrevArrow Arrow'
          onClick={() => this.prevPictureHandler(this.index)} />
        <img
          src={menu} alt="Menu" className='Menu' />
        <Loading />
        <InfoCard data={this.state.data} />
      </div>
    );
  }
}

export default App;
