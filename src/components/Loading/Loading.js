import React from 'react';
import './Loading.css';
import loadingsymbol from '../../assets/loading.png';

const loading = (props) => {

    return (
        <div>
            <img src={loadingsymbol} alt="Loading Symbol Slow Clockwise Spinning" className="SlowSpinning Loading" />
            <img src={loadingsymbol} alt="Loading Symbol Fast Counter-Clockwise Spinning" className="FastSpinning Loading" />
        </div>
    )
}

export default loading;