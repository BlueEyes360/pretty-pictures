import React from 'react';
import './Splash.css';

const splash = (props) => {

    return (
        <>
            <div className="SplashContainer" id="IntroSplash"
                onClick={() => props.clickHandler()} value={props.index}>
            </div>
            <div className="SplashCard" id="IntroSplashCard"
                onClick={() => props.clickHandler()} value={props.index}>
            </div>
        </>
    )
}

export default splash;