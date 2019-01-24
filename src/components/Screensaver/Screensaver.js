import React from 'react';
import './Screensaver.css';

const screensaver = (props) => {

    return (
        <div className="Screensaver" id="Background"
            onChange={props.changed} value={props.index}
        />
    )
}

export default screensaver;