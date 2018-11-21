import React from 'react';
import './InfoCard.css';

const infocard = (props) => {

    return (
        <div className="InfoCard" >
            <h6 className="InfoCardText">Name:</h6>
            <h6 className="InfoCardText">Artist:</h6>
            <h6 className="InfoCardText">Year:</h6>
            <h6 className="InfoCardText">Provided By:</h6>
        </div>
    )
}

export default infocard;