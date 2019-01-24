import React from 'react';

const FindDimensions = (props) => {

    for(let i = 0; i < 5; i++)
    {
            let imageHeight = props.data[i].images[0].height;
            let imageWidth = props.data[i].images[0].width;
            console.log(imageHeight);
            console.log(imageWidth);
    }

    return (
        <>
        </>
    )
}
export default FindDimensions;