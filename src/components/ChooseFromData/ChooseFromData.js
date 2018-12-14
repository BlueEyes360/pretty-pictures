import React from 'react';

const choosefromdata = (index, props) => {
    let nextImage = "";

        document.getElementById("LoadingCard").style.visibility = "visible";
        document.getElementById("InfoCardName").innerHTML = props.records[index].title;
        document.getElementById("InfoCardArtist").innerHTML = props.records[index].provenance;
        document.getElementById("InfoCardYear").innerHTML = props.records[index].dated;
        document.getElementById("InfoCardCredit").innerHTML = props.records[index].creditline;
        nextImage = props.records[index].primaryimageurl;
        document.getElementById("LoadingCard").style.visibility = "hidden";


    // switch (Math.abs(index%10)) {
    //     case 0:
    //         document.getElementById("LoadingCard").style.visibility = "visible";
    //         document.getElementById("InfoCardName").innerHTML = props.records[0].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[0].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[0].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[0].creditline;
    //         nextImage = props.records[0].primaryimageurl;
    //         document.getElementById("LoadingCard").style.visibility = "hidden";
    //         break;
    //     case 1:
    //         document.getElementById("InfoCardName").innerHTML = props.records[1].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[1].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[1].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[1].creditline;
    //         nextImage = props.records[1].primaryimageurl;
    //         break;
    //     case 2:
    //         document.getElementById("InfoCardName").innerHTML = props.records[2].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[2].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[2].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[2].creditline;
    //         nextImage = props.records[2].primaryimageurl;
    //         break;
    //     case 3:
    //         document.getElementById("InfoCardName").innerHTML = props.records[3].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[3].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[3].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[3].creditline;
    //         nextImage = props.records[3].primaryimageurl;
    //         break;
    //     case 4:
    //         document.getElementById("InfoCardName").innerHTML = props.records[4].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[4].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[4].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[4].creditline;
    //         nextImage = props.records[4].primaryimageurl;
    //         break;
    //     case 5:
    //         document.getElementById("InfoCardName").innerHTML = props.records[5].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[5].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[5].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[5].creditline;
    //         nextImage = props.records[5].primaryimageurl;
    //         break;
    //     case 6:
    //         document.getElementById("InfoCardName").innerHTML = props.records[6].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[6].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[6].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[6].creditline;
    //         nextImage = props.records[6].primaryimageurl;
    //         break;
    //     case 7:
    //         document.getElementById("InfoCardName").innerHTML = props.records[7].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[7].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[7].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[7].creditline;
    //         nextImage = props.records[7].primaryimageurl;
    //         break;
    //     case 8:
    //         document.getElementById("InfoCardName").innerHTML = props.records[8].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[8].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[8].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[8].creditline;
    //         nextImage = props.records[8].primaryimageurl;
    //     break;
    //     case 9:
    //         document.getElementById("InfoCardName").innerHTML = props.records[9].title;
    //         document.getElementById("InfoCardArtist").innerHTML = props.records[9].provenance;
    //         document.getElementById("InfoCardYear").innerHTML = props.records[9].dated;
    //         document.getElementById("InfoCardCredit").innerHTML = props.records[9].creditline;
    //         nextImage = props.records[9].primaryimageurl;
    //         break;
    //     default:
    //         break;
    // }

    return (nextImage)
}

export default choosefromdata;