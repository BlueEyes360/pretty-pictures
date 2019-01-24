import React from 'react';

import questionMark from '../../assets/help-circle.png';
import nextarrow from '../../assets/nextarrowbigwhite.png';
import prevarrow from '../../assets/prevarrowbigwhite.png';
import menubutton from '../../assets/menu.png';

const UI = (props) => {

    return (
        <>
            <img
                src={nextarrow} alt="Next Arrow" className='NextArrow Arrow'
                onClick={() => props.nextClickHandler(props.imageIndex)} />
            <img
                src={prevarrow} alt="Previous Arrow" className='PrevArrow Arrow'
                onClick={() => props.prevClickHandler(props.imageIndex)} />
            <img
                src={menubutton} alt="Menu Button" className='Menu'
                onClick={() => props.menuClickHandler()}
                id="MenuButton" />
            <img
                src={questionMark} alt='Info Card Display Button'
                className='Arrow InfoCardDisplayButton'
                onClick={() => props.infoClickHandler()}
                id='InfoCardDisplay' />
        </>
    )
}

export default UI;