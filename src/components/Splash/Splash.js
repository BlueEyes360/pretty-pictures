import React from 'react';
import './Splash.css';

const splash = (props) => {

    return (
        <div>
            <div className="SplashContainer" id="IntroSplash"
                onClick={() => props.clickHandler()} value={props.index}>
            </div>
            <div className="SplashCard" id="IntroSplashCard"
                onClick={() => props.clickHandler()} value={props.index}>
                    <h1>pretty-pictures</h1>
                    <p>This application is still under development</p>
                    <h6>Click Anywhere to continue....</h6>
            </div>
        </div>
    )
}

export default splash;