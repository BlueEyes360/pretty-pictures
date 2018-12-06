import React, { Component } from 'react';
import axios from 'axios';
import './App.css';

import Screensaver from './components/Screensaver/Screensaver';
import InfoCard from './components/InfoCard/InfoCard';
import Loading from './components/Loading/Loading';
import Menu from './components/Menu/Menu';
import GetArt from './components/GetArt/GetArt';


import questionMark from './assets/help-circle.png';
import nextarrow from './assets/nextarrowbigwhite.png';
import prevarrow from './assets/prevarrowbigwhite.png';
import menubutton from './assets/menu.png';
import choosefromdata from './components/ChooseFromData/ChooseFromData';

class App extends Component {

  state = {
    index: 0,
    maxIndex: 5,
    data: 0,
    showInfoCard: false,
    showMenuCard: false,
    transitionTime: 60000,
  }

  // dataHandler = () => {
  //   let newData = ();
  //   this.setState({data: newData});
  //   console.log("Inside dataHandler: newData = " + {newData});
  // }

  nextPictureHandler = () => {
    let i = this.state.index;
    this.setState({index: (++i%10)});
  }

  nextPictureHandlerClicked = () => {
    let i = this.state.index;
    this.setState({index: (++i%10)});
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
      i = --i % 10;
    }
    this.setState({index: i});
    this.timingLoop = clearInterval(this.timingLoop);
    this.timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);
  }

  timerSliderValueChanged = () => {
    this.timingLoop = clearInterval(this.timingLoop);
    this.timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);
    let newValue = document.getElementById("TimerSlider").value;
    newValue *= 1000;
    this.setState({transitionTime: newValue});
    document.getElementById("TimerValue").innerHTML = newValue/1000 + " s";
  }

  showInfoCardHandler = () => {
    let truth = this.state.showInfoCard;
    if(truth === false)
    {
      document.getElementById("InfoCard").className = "OpenInfo";
      document.getElementById("InfoCardDisplay").style.display = "none";
      this.setState({showInfoCard: true});
    }
    else if (truth === true)
    {
      document.getElementById("InfoCard").className = "CloseInfo";
      document.getElementById("InfoCardDisplay").style.display = "block";
      this.setState({showInfoCard: false});
    }
  }

  showMenuCardHandler = () => {
    let truth = this.state.showMenuCard;
    if(truth === false)
    {
      document.getElementById("MenuContainer").className = "Open";
      document.getElementById("MenuButton").style.display = "none";
      this.setState({showMenuCard: true});
    }
    else if (truth === true)
    {
      document.getElementById("MenuContainer").className = "Close";
      document.getElementById("MenuButton").style.display = "block";
      this.setState({showMenuCard: false});
    }
  }

  timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);

  componentDidMount() {

    axios.get("https://api.harvardartmuseums.org/image",
    {
        params: {
            apikey: "ffedfb70-eb8e-11e8-bc5b-9fe3b7da5227",
            classification: "Paintings",
            fields: "title,provenance,dated,creditline,baseimageurl"
        }
    })
    .then(response => {
        this.setState({data: response.data});
        // console.log(response);
        if(this.state.data !== 0)
        {
            // choosefromdata(this.state.index, this.state.data);
        }
    })
    .catch(function (error) {
        console.log(error);
    });

  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  render() {

    let background = <Loading />

    if (this.state.data !== 0)
    {
      background =
        <Screensaver
          index={this.state.index}
          changed={this.props.changed}
          data={this.state.data} />
    }

    return (
      <div className="App">
        {background}
        {/* <Screensaver
          index={this.state.index}
          changed={this.props.changed}
          data={this.state.data} /> */}
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
        {/* <Loading /> */}
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
        {/* <GetArt /> */}
      </div>
    );
  }
}

export default App;
