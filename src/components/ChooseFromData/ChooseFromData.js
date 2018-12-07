import React from 'react';

const choosefromdata = (index, props) => {
    let nextImage = "";

    switch (Math.abs(index%10)) {
        case 0:
            document.getElementById("InfoCardName").innerHTML = props.records[0].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[0].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[0].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[0].creditline;
            // document.getElementById("Background").src = props.records[0].baseimageurl;
            nextImage = props.records[0].primaryimageurl;
            break;
        case 1:
            document.getElementById("InfoCardName").innerHTML = props.records[1].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[1].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[1].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[1].creditline;
            // document.getElementById("Background").src = props.records[1].baseimageurl;
            nextImage = props.records[1].primaryimageurl;
            break;
        case 2:
            document.getElementById("InfoCardName").innerHTML = props.records[2].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[2].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[2].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[2].creditline;
            // document.getElementById("Background").src = props.records[2].baseimageurl;
            nextImage = props.records[2].primaryimageurl;
            break;
        case 3:
            document.getElementById("InfoCardName").innerHTML = props.records[3].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[3].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[3].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[3].creditline;
            // document.getElementById("Background").src = props.records[3].baseimageurl;
            nextImage = props.records[3].primaryimageurl;
            break;
        case 4:
            document.getElementById("InfoCardName").innerHTML = props.records[4].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[4].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[4].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[4].creditline;
            // document.getElementById("Background").src = props.records[4].baseimageurl;
            nextImage = props.records[4].primaryimageurl;
            break;
        case 5:
            document.getElementById("InfoCardName").innerHTML = props.records[5].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[5].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[5].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[5].creditline;
            // document.getElementById("Background").src = props.records[5].baseimageurl;
            nextImage = props.records[5].primaryimageurl;
            break;
        case 6:
            document.getElementById("InfoCardName").innerHTML = props.records[6].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[6].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[6].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[6].creditline;
            // document.getElementById("Background").src = props.records[6].baseimageurl;
            nextImage = props.records[6].primaryimageurl;
            break;
        case 7:
            document.getElementById("InfoCardName").innerHTML = props.records[7].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[7].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[7].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[7].creditline;
            // document.getElementById("Background").src = props.data.records[7].baseimageurl;
            nextImage = props.records[7].primaryimageurl;
            break;
        case 8:
            document.getElementById("InfoCardName").innerHTML = props.records[8].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[8].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[8].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[8].creditline;
            // document.getElementById("Background").src = props.data.records[8].baseimageurl;
            nextImage = props.records[8].primaryimageurl;
        break;
        case 9:
            document.getElementById("InfoCardName").innerHTML = props.records[9].title;
            document.getElementById("InfoCardArtist").innerHTML = props.records[9].provenance;
            document.getElementById("InfoCardYear").innerHTML = props.records[9].dated;
            document.getElementById("InfoCardCredit").innerHTML = props.records[9].creditline;
            // document.getElementById("Background").src = props.data.records[9].baseimageurl;
            nextImage = props.records[9].primaryimageurl;
            break;
        default:
            break;
    }

    return (nextImage)
}

export default choosefromdata;