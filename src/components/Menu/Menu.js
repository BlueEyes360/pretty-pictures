import React from 'react';

import closeButton from '../../assets/close-circle.png';

import './Menu.css';

const menu = (props) => {

    return (
        <div id="MenuContainer" className="Close">
            <img src={closeButton} alt="Close Button"
                id='CloseMenuButton'
                onClick={props.clickHandler}
                className='Button' />
            <p>Timer Setting: <span id="TimerValue">60 s</span> </p>
            <input type="range" min="1" max="120" defaultValue="60"
                className="slider"
                id="TimerSlider"
                list="marks"
                onChange={props.changed} />
            <datalist id="marks">
                <option value="1" />
                <option value="60" />
                <option value="120" />
            </datalist>

        </div>
    )
}

export default menu;