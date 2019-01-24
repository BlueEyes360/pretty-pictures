import React from 'react';
import Timer from './Timer/Timer';

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
        </div>
    )
}

export default Menu;