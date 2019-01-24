import React from 'react';
import './Screensaver.css';

// import choosefromdata from '../ChooseFromData/ChooseFromData';
import choosefromdata from '../Screensaver/ChooseFromData/ChooseFromData';

const screensaver = (props) => {


    return (
        <div className="Screensaver"
            onChange={props.changed} value={props.index}>
            <img
                src={choosefromdata(props.index, props.data)}
                alt="Art"
                className="Art_Image"
                id="Background"
            />
        </div>
    )
}

export default screensaver;