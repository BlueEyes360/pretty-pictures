import art0 from '../../assets/art0.jpg'
import art1 from '../../assets/art1.jpg'
import art2 from '../../assets/art2.jpg'
import art3 from '../../assets/art3.jpg'
import art4 from '../../assets/art4.jpg'

const choosepic = index => {
    let art = art0;

    console.log("Here goes index: " + index)


    switch (index) {
        case 0:
            art = art0;
            break;
        case 1:
            art = art1;
            break;
        case 2:
            art = art2;
            break;
        case 3:
            art = art3;
            break;
        case 4:
            art = art4;
            break;
        default:
            break;
    }


    return (
        art
    )
}

export default choosepic;