import React from 'react';
import './Loading.css';
import loading_top from '../../assets/loadingIcon_toplayer.png';
import loading_mid from '../../assets/loadingIcon_midlayer.png';
import loading_bottom from '../../assets/loadingIcon_bottomlayer.png';

const loading = (props) => {

    return (
        <div id="LoadingCard">
            <p>Loading...</p>
            <img src={loading_bottom} alt="Loading Symbol Slow Clockwise Spinning Bottom" className="Loading SlowSpinning" id="BottomLoading" />
            <img src={loading_mid} alt="Loading Symbol Fast Counter-Clockwise Spinning" className="Loading" id="FastSpinning" />
            <img src={loading_top} alt="Loading Symbol Slow Clockwise Spinning Top" className="Loading SlowSpinning" id="TopLoading" />
        </div>
    )
}

export default loading;