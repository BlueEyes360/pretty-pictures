import React from 'react';

import closeButton from '../../assets/close-circle.png';
import './InfoCard.css';

const infocard = (props) => {

    return (
        <div id="InfoCard" className="CloseInfo" >
            <img src={closeButton} alt="Close Button"
                id="CloseInfoCard"
                onClick={props.clickHandler}
                className="Button" />
            <p className="InfoCardText">Name: Stuff here</p>
            <p className="InfoCardText">Artist:</p>
            <p className="InfoCardText">Year:</p>
            <p className="InfoCardText">Provided By:</p>
        </div>
    )
}

export default infocard;