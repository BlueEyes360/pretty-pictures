    import React, { Component } from 'react';
    import axios from 'axios';
    import './App.css';

    import Screensaver from './components/Screensaver/Screensaver';
    import Splash from './components/Splash/Splash';
    import InfoCard from './components/InfoCard/InfoCard';
    import Loading from './components/Loading/Loading';
    import Menu from './components/Menu/Menu';
    import ProcessImages from './containers/ProcessImages/ProcessImages';
    import UI from './components/UI/UI';

    import { HAMKEY } from './APIKeys';
import FindDimensions from './components/FindDimensions/FindDimensions';

    class App extends Component {

    state = {
        index: 0,
        maxIndex: 0,
        images: 0,
        newImages: 0,
        showRandomImages: true,
        showInfoCard: false,
        showMenuCard: false,
        showSplash: true,
        transitionTime: 60000,
    }

    randomPictureHandler = () => {
        let randomNumber = Math.floor(Math.random() * this.state.maxIndex);
        this.setState({index: randomNumber});
    }

    randomCheckboxChanged = () => {
        let randomValue = document.getElementById("RandomChoice").checked;
        this.setState({showRandomImages: randomValue});
    }

    nextPictureHandler = () => {
        if (this.state.showRandomImages === true)
        {
            this.randomPictureHandler();
        }
        else
        {
            let i = this.state.index;
            this.setState({index: (++i % this.state.maxIndex)});
        }
    }

    nextPictureHandlerClicked = () => {
        if (this.state.showRandomImages === true)
        {
            this.randomPictureHandler();
        }
        else
        {
            let i = this.state.index;
            this.setState({index: (++i % this.state.maxIndex)});
        }
        this.timingLoop = clearInterval(this.timingLoop);
        this.timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);
    }

    prevPictureHandlerClicked = () => {
        if (this.state.showRandomImages === true)
        {
            this.randomPictureHandler();
        }
        else
        {
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
        }
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

    showSplashHandler = () => {
        let truth = this.state.showSplash;
        if(truth === false)
        {
        document.getElementById("IntroSplash").style.display = "block";
        document.getElementById("IntroSplashCard").style.display = "block";
        this.setState({showSplash: true});
        }
        else if (truth === true)
        {
        document.getElementById("IntroSplash").style.display = "none";
        document.getElementById("IntroSplashCard").style.display = "none";
        this.setState({showSplash: false});
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
                apikey: HAMKEY,
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
            if (this.state.showRandomImages === true)
            {
                this.randomPictureHandler();
                this.timingLoop = clearInterval(this.timingLoop);
                this.timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);
            }
            document.getElementById("LoadingCard").style.visibility = "hidden";
        })
        .catch(function (error) {
            console.log(error);
        });

    }

    timingLoop = setInterval(this.nextPictureHandler, this.state.transitionTime);

    componentDidMount() {

        document.getElementById("LoadingCard").style.visibility = "visible";

        // this.handleNewImages();
        this.getGoodImagesForDisplay();
    }

    render() {

        let background = <Loading id="InitialLoadingImage" />

        if (this.state.images !== 0)
        {
            background =
                <>
                    <Screensaver
                        index={this.state.index}
                        changed={this.props.changed}
                        data={this.state.images}
                    />
                    {/* <FindDimensions
                        data={this.state.images}
                    /> */}
                    {/* <ProcessImages data={this.state.newImages} /> */}
                </>
        }

        return (
        <div className="App">
            <Loading id="LoadingCard" />
            <Splash
                clickHandler={() => this.showSplashHandler()}
                truth={this.state.showSplash}/>

            {background}

            <UI
                data={this.state.data}
                imageIndex={this.state.index}
                nextClickHandler={this.nextPictureHandlerClicked}
                prevClickHandler={this.prevPictureHandlerClicked}
                menuClickHandler={this.showMenuCardHandler}
                infoClickHandler={this.showInfoCardHandler}
                timerChanged={this.timerSliderValueChanged}
            />
            <InfoCard
                data={this.state.data}
                clickHandler={() => this.showInfoCardHandler()}
            />
            <Menu
                clickHandler={() => this.showMenuCardHandler()}
                changed={() => this.timerSliderValueChanged()}
                randomImages={this.state.showRandomImages}
                randomChange={() => this.randomCheckboxChanged()}
            />
        </div>
        );
    }
    }

    export default App;
