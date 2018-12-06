import React, { Component } from 'react';
import axios from 'axios';
// import './GetArt.css';

class GetArt extends Component {
    state = {
        posts: []
    }


    componentDidMount () {
        axios.get("https://api.harvardartmuseums.org/image",
        {
            params: {
                apikey: "ffedfb70-eb8e-11e8-bc5b-9fe3b7da5227"
            }
        })
        .then(response => {
            this.setState({posts: response.data});
            console.log(response);
        })
        .catch(function (error) {
            console.log(error);
        });
    }

    render () {
        return (
            <div>

            </div>
        )
    }
}

export default GetArt;

    // let data = {};
    // // Create a request variable and assign a new XMLHttpRequest object to it.
    // var request = new XMLHttpRequest();

    // var apiUrl = 'http://api.thewalters.org/v1/collections/7/objects?apikey=' + WaltersAPIKEY;

    // // Open a new connection, using the GET request on the URL endpoint
    // request.open('GET', HAMUrl, true);

    // request.onload = function () {
    //     var jsonData = this.response;
    //     data = JSON.parse(jsonData);
    //     // data.foreach()
    //     // console.log(this.response);
    //     request.send();
    //     console.log("Data included: " + data.info.totalrecordsperquery);

    //     return data;
    // }
