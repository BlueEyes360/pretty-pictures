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

    return (nextImage)
}

export default choosefromdata;