import React from 'react';
import Timer from './Timer/Timer';
import RandomChoice from './RandomChoice/RandomChoice';

import closeButton from '../../assets/close-circle.png';

import './Menu.css';

const Menu = (props) => {

    return (
        <div id="MenuContainer" className="Close">
            <img src={closeButton} alt="Close Button"
                id='CloseMenuButton'
                onClick={props.clickHandler}
                className='Button' />
            <Timer
                changeValue={props.changed}/>
            <RandomChoice
                showRandom={props.randomImages}
                changeCheckBox={props.randomChange}
            />
        </div>
    )
}

export default Menu;