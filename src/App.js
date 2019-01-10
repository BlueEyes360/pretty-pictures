import React, { Component } from 'react';
import axios from 'axios';
import './App.css';

import Screensaver from './components/Screensaver/Screensaver';
import InfoCard from './components/InfoCard/InfoCard';
import Loading from './components/Loading/Loading';
import Menu from './components/Menu/Menu';
import ProcessImages from './containers/ProcessImages/ProcessImages';

import questionMark from './assets/help-circle.png';
import nextarrow from './assets/nextarrowbigwhite.png';
import prevarrow from './assets/prevarrowbigwhite.png';
import menubutton from './assets/menu.png';

class App extends Component {

  state = {
    index: 0,
    maxIndex: 0,
    images: 0,
    newImages: 0,
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
    this.setState({index: (++i % this.state.maxIndex)});
  }

  nextPictureHandlerClicked = () => {
    let i = this.state.index;
    this.setState({index: (++i % this.state.maxIndex)});
    this.timingLoop = clearInterval(this.timingLoop);
    this.timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);
  }

  prevPictureHandlerClicked = () => {
    let i = this.state.index;
    if(i === 0)
    {
      i = this.state.maxIndex - 1;
    }
    else
    {
      i = --i % this.state.maxIndex;
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

  handleNewImages = () => {
    axios.get("https://api.harvardartmuseums.org/object",
    {
        params: {
            apikey: "ffedfb70-eb8e-11e8-bc5b-9fe3b7da5227",
            sort: "random",
            // width: ">2000",
            classification: "Paintings",
            // fields: "title,provenance,dated,creditline,baseimageurl,primaryimageurl"
        }
    })
    .then(response => {
        this.setState({newImages: response.data});
        // console.log(response);
    })
    .catch(function (error) {
        console.log(error);
    });

  }

  getGoodImagesForDisplay = () => {
    let numImages = 0;
    let goodImages = 0;

    axios.get("https://noble-maxim-217223.firebaseio.com/count.json")
      .then(response => {
          numImages = response.data - 1;
          this.setState({maxIndex: numImages});
      })
      .catch(function (error) {
          console.log(error);
      });

      axios.get("https://noble-maxim-217223.firebaseio.com/good_images.json")
      .then(response => {
          goodImages = response.data;
          this.setState({images: goodImages});
      })
      .catch(function (error) {
          console.log(error);
      });

  }

  timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);

  componentDidMount() {

    this.handleNewImages();
    this.getGoodImagesForDisplay();

  }

  render() {

    let background = <Loading id="InitialLoadingImage" />

    if (this.state.images !== 0)
    {
      background =
        <div>
          <Screensaver
            index={this.state.index}
            changed={this.props.changed}
            data={this.state.images} />
          <ProcessImages data={this.state.newImages} />
        </div>
    }

    return (
      <div className="App">
        <Loading id="LoadingCard" />
        {background}
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
