import React from 'react';

const RandomChoice = (props) => {

    return (
        <>
            <p>Randomize Images:
                <input type="checkbox"
                    id="RandomChoice"
                    defaultChecked={props.showRandom}
                    onChange={props.changeCheckBox}
                />
            </p>
        </>
    )
}

export default RandomChoice;