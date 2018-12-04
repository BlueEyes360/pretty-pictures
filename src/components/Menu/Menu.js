import React from 'react';

import closeButton from '../../assets/close-circle.png';

import './Menu.css';

const menu = (props) => {

    return (
        <div id="MenuContainer">
            <img src={closeButton} alt="Close Button"
                id='CloseMenuButton'
                onClick={props.clickHandler}
                className='Button' />
            <p>Timer Setting:</p>
            <input type="range" min="1" max="120" defaultValue="60"
                className="slider"
                id="TimerSlider"
                onChange={props.changed}>
            </input>
        </div>
    )
}

export default menu;