const choosefromdata = (index, data) => {
    let nextImage = "";

        document.getElementById("InfoCardName").innerHTML = data[index].title;
        document.getElementById("InfoCardArtist").innerHTML = data[index].provenance;
        document.getElementById("InfoCardYear").innerHTML = data[index].dated;
        document.getElementById("InfoCardCredit").innerHTML = data[index].creditline;
        nextImage = data[index].primaryimageurl;

    return (nextImage)
}

export default choosefromdata;