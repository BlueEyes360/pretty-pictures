import React from 'react';
import './Screensaver.css';
import art0 from '../../assets/art0.jpg'
import art1 from '../../assets/art1.jpg'
import art2 from '../../assets/art2.jpg'
import art3 from '../../assets/art3.jpg'
import art4 from '../../assets/art4.jpg'
// import art5 from '../../assets/art5.jpg'
import getart from '../GetArt/GetArt';
import choosepic from '../ChoosePic/ChoosePic';


const screensaver = (props) => {

    return (
        < div className="Screensaver"
            onChange={props.changed} value={props.index}>
            <img src={choosepic(props.index)} alt="Art" className="Art_Image" />
            {/* {getart} */}
        </div>
    )
}

export default screensaver;