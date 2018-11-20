// import React from 'react';
// import './GetArt.css';

const getart = (props) => {

    let WaltersAPIKEY = "r1MD47i2vpnpjRDuTMJf1nQPq4tmKH7z06I4Qdu5FuEhxuxUlTTulKU4axMzEvie";
    // Create a request variable and assign a new XMLHttpRequest object to it.
    var request = new XMLHttpRequest();


    // for(let i = 1; i <= 10; i++)
    // {
        var apiUrl = 'http://api.thewalters.org/v1/collections/7/objects?apikey=' + WaltersAPIKEY;
        // console.log(i);
        // Open a new connection, using the GET request on the URL endpoint
        request.open('GET', apiUrl, true);

        request.onload = function () {
            var jsonData = this.response;
            var data = JSON.parse(jsonData);
            var randomNumber = Math.floor(Math.random() * 100);
            console.log(randomNumber);
            // data.foreach()
            console.log("Data included: " + data.Items[0].PrimaryImage.Raw);
            // console.log(this.response);
            // console.log(data.primaryImage);
        }

        request.send();
    // }





    // request.onload = function () {
    //     // data.forEach(element => {
    //     //     console.log(element.total);
    //     // });
    // // Begin accessing JSON data here
    // }



    return this.data.Items[0].PrimaryImage.Raw;
}

export default getart;