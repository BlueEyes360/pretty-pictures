import React from 'react';
import './Screensaver.css';
import choosepic from '../ChoosePic/ChoosePic';

const screensaver = (props) => {

    return (
        < div className="Screensaver"
            onChange={props.changed} value={props.index}>
            <img src={choosepic(props.index)} alt="Art" className="Art_Image" />
        </div>
    )
}

export default screensaver;