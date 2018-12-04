import React, { Component } from 'react';
import './App.css';
import Screensaver from './components/Screensaver/Screensaver';
import InfoCard from './components/InfoCard/InfoCard';
import Loading from './components/Loading/Loading';
import Menu from './components/Menu/Menu';
import getart from './components/GetArt/GetArt';

import questionMark from './assets/help-circle.png';
import nextarrow from './assets/nextarrowbigwhite.png';
import prevarrow from './assets/prevarrowbigwhite.png';
import menubutton from './assets/menu.png';

class App extends Component {

  state = {
    index: 0,
    maxIndex: 5,
    data: 0,
    showInfoCard: false,
    showMenuCard: false,
    transitionTime: 60000,
  }

  dataHandler = () => {
    let newData = getart();
    this.setState({data: newData});
    console.log("Inside dataHandler: newData = " + {newData});
  }

  nextPictureHandler = () => {
    let i = this.state.index;
    this.setState({index: (++i%5)});
  }

  nextPictureHandlerClicked = () => {
    let i = this.state.index;
    this.setState({index: (++i%5)});
    this.timingLoop = clearInterval(this.timingLoop);
    this.timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);
  }

  prevPictureHandlerClicked = () => {
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
    this.timingLoop = clearInterval(this.timingLoop);
    this.timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);
  }

  timerSliderValueChanged = () => {
    let newValue = document.getElementById("TimerSlider").value;
    newValue *= 1000;
    this.setState({transitionTime: newValue});
    this.timingLoop = clearInterval(this.timingLoop);
    this.timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);
  }

  showInfoCardHandler = () => {
    let truth = this.state.showInfoCard;
    if(truth === false)
    {
      document.getElementById("InfoCard").style.display = "block";
      document.getElementById("InfoCard").style.zIndex = "3";
      document.getElementById("InfoCardDisplay").style.display = "none";
      this.setState({showInfoCard: true});
    }
    else if (truth === true)
    {
      document.getElementById("InfoCard").style.display = "none";
      document.getElementById("InfoCard").style.zIndex = "0";
      document.getElementById("InfoCardDisplay").style.display = "block";
      this.setState({showInfoCard: false});
    }
  }

  showMenuCardHandler = () => {
    let truth = this.state.showMenuCard;
    if(truth === false)
    {
      document.getElementById("MenuContainer").style.display = "block";
      document.getElementById("MenuContainer").style.zIndex = "4";
      document.getElementById("MenuButton").style.display = "none";
      this.setState({showMenuCard: true});
    }
    else if (truth === true)
    {
      document.getElementById("MenuContainer").style.display = "none";
      document.getElementById("MenuContainer").style.zIndex = "0";
      document.getElementById("MenuButton").style.display = "block";
      this.setState({showMenuCard: false});
    }
  }

  timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);

  componentWillMount() {

    // if(this.state.data === 0)
    // {
    //   this.dataHandler();
    //   console.log("Inside CmpWillMnt:dataHandler fired");
    // }

  }

  render() {

    return (
      <div className="App">
        <Screensaver
          index={this.state.index}
          changed={this.props.changed} />
        <img
          src={nextarrow} alt="Next Arrow" className='NextArrow Arrow'
          onClick={() => this.nextPictureHandlerClicked(this.index)} />
        <img
          src={prevarrow} alt="Previous Arrow" className='PrevArrow Arrow'
          onClick={() => this.prevPictureHandlerClicked(this.index)} />
        <img
          src={menubutton} alt="Menu Button" className='Menu'
          onClick={() => this.showMenuCardHandler()}
          id="MenuButton" />
        <Loading />
        <img
          src={questionMark} alt='Info Card Display Button'
          className='Arrow InfoCardDisplayButton'
          onClick={this.showInfoCardHandler}
          id='InfoCardDisplay' />
        <InfoCard
          data={this.state.data}
          clickHandler={() => this.showInfoCardHandler()} />
        <Menu
          clickHandler={() => this.showMenuCardHandler()}
          changed={() => this.timerSliderValueChanged()} />
      </div>
    );
  }
}

export default App;
