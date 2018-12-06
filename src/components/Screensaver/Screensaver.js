import React from 'react';
import './Screensaver.css';
import choosepic from '../ChoosePic/ChoosePic';
import choosefromdata from '../ChooseFromData/ChooseFromData';
import Loading from '../Loading/Loading';

const screensaver = (props) => {


    return (
        <div className="Screensaver"
            onChange={props.changed} value={props.index}>
            {/* <img src={props.data.data.records[0].primaryimageurl} alt="Art" className="Art_Image" /> */}
            <img src={choosefromdata(props.index, props.data)} alt="Art" className="Art_Image" id="Background" />
            {/* <img src={choosepic(props.index)} alt="Art" className="Art_Image" id="Background" /> */}
        </div>
    )
}

export default screensaver;