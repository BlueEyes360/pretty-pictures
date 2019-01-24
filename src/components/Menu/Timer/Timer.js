import React from 'react';

const Timer = (props) => {

    return (
        <>
            <p>Timer Setting: <span id="TimerValue">60 s</span></p>
            <input type="range" min="1" max="120" defaultValue="60"
                className="slider"
                id="TimerSlider"
                list="marks"
                step="1"
                onChange={props.changeValue} />
        </>
    )
}

export default Timer;