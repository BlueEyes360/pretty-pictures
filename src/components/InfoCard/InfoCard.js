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
            <p className="InfoCardText">Name: <span id="InfoCardName"></span></p>
            <p className="InfoCardText">Artist: <span id="InfoCardArtist"></span></p>
            <p className="InfoCardText">Year: <span id="InfoCardYear"></span></p>
            <p className="InfoCardText">Provided By: <span id="InfoCardCredit"></span></p>
        </div>
    )
}

export default infocard;