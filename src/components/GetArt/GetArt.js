import React from 'react';
import HAMAPIKEY, {WaltersAPIKEY} from '../../APIKeys';
// import './GetArt.css';

const getart = (props) => {

    let resourceType = "medium";
    let data = {};
    // Create a request variable and assign a new XMLHttpRequest object to it.
    var request = new XMLHttpRequest();

    var apiUrl = 'http://api.thewalters.org/v1/collections/7/objects?apikey=' + WaltersAPIKEY;
    var HAMUrl = 'https://api.harvardartmuseums.org/' + resourceType + HAMAPIKEY;

    // Open a new connection, using the GET request on the URL endpoint
    request.open('GET', HAMUrl, true);

    request.onload = function () {
        var jsonData = this.response;
        data = JSON.parse(jsonData);
        // data.foreach()
        // console.log(this.response);
        request.send();
        console.log("Data included: " + data.info.totalrecordsperquery);

        return data;
    }
}

export default getart;