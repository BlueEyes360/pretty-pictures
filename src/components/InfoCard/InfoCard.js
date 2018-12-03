import React from 'react';

import closeButton from '../../assets/close-circle.png';
import './InfoCard.css';

const infocard = (props) => {

    return (
        <div id='InfoCard' >
            <img src={closeButton} alt="Close Button" id='CloseInfoCard'
                onClick={props.clickHandler}
                className='Button' />
            <h6 className="InfoCardText">{props.data}</h6>
            <h6 className="InfoCardText">Name: Stuff here</h6>
            <h6 className="InfoCardText">Artist:</h6>
            <h6 className="InfoCardText">Year:</h6>
            <h6 className="InfoCardText">Provided By:</h6>
        </div>
    )
}

export default infocard;