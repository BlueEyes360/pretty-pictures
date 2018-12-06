import React, { Component } from 'react';
import axios from 'axios';
// import './GetArt.css';

class GetArt extends Component {
    state = {
        posts: []
    }


    componentDidMount () {
        axios.get("https://api.harvardartmuseums.org/object",
        {
            params: {
                apikey: "ffedfb70-eb8e-11e8-bc5b-9fe3b7da5227",
                classification: "Paintings"
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