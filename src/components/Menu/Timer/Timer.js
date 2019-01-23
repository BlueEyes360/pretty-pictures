import React from 'react';

const Timer = (props) => {

    return (
        <div>
            <p>Timer Setting: <span id="TimerValue">60 s</span></p>
            <input type="range" min="1" max="120" defaultValue="60"
                className="slider"
                id="TimerSlider"
                list="marks"
                onChange={props.changeValue} />
            <datalist id="marks">
                <option value="1" />
                <option value="60" />
                <option value="120" />
            </datalist>
        </div>
    )
}

export default Timer;