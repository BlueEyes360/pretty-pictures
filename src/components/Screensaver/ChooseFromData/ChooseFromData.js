const choosefromdata = (index, data) => {
    let nextImage = "";
    let urlString = 'url("' + data[index].primaryimageurl + '")';

    document.getElementById("InfoCardName").innerHTML = data[index].title;
    document.getElementById("InfoCardArtist").innerHTML = data[index].provenance;
    document.getElementById("InfoCardYear").innerHTML = data[index].dated;
    document.getElementById("InfoCardCredit").innerHTML = data[index].creditline;
    // document.getElementById("Background").style.backgroundImage = urlString;
    nextImage = data[index].primaryimageurl;

    return (nextImage)
}

export default choosefromdata;