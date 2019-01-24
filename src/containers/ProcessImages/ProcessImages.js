import React, { Component } from 'react';
import axios from 'axios';

class ProcessImages extends Component {
    state = {
        data: 0,
        count: 0,
    }

    OutputDataHandler = () => {
        let beginningCount = this.state.count;
        let addedImages = 0;
        for( let i = 1; i <= 10; i++)
        {
            let singleImageData = this.props.data.records[i];
            // console.log(singleImageData);
            if((singleImageData.hasOwnProperty("title") && singleImageData.title !== null)
            && (singleImageData.hasOwnProperty("provenance") && singleImageData.provenance !== null)
            && (singleImageData.hasOwnProperty("dated") && singleImageData.dated !== null)
            && (singleImageData.hasOwnProperty("creditline") && singleImageData.creditline !== null)
            && ((singleImageData.hasOwnProperty("baseimageurl") && singleImageData.baseimageurl !== null)
            || (singleImageData.hasOwnProperty("primaryimageurl") && singleImageData.primaryimageurl !== null)))
            {
                this.PostImageToServer(singleImageData, (beginningCount + addedImages++));
            }
        }
    }

    PostImageToServer = (imageData, currentCount) => {
        axios.put("https://noble-maxim-217223.firebaseio.com/good_images/" + currentCount + ".json", imageData)
        .then(response => {
            let newCount = this.state.count + 1;
            this.setState({count: newCount});
            this.IncrementServerCount();
            // console.log("PITS");
            // console.log(response);
        })
        .catch(function (error) {
            console.log(error);
        });

    }

    GetServerCount = () => {
        axios.get("https://noble-maxim-217223.firebaseio.com/count.json")
        .then(response => {
            this.setState({count: response.data});
            // console.log("GSC");
            // console.log(response);
            this.OutputDataHandler();
        })
        .catch(function (error) {
            console.log(error);
        });
    }

    IncrementServerCount = () => {
        let currentCount = this.state.count;
        axios.put("https://noble-maxim-217223.firebaseio.com/count.json", currentCount)
        .then(response => {
            // console.log("ISC");
            // console.log(response);
        })
        .catch(function (error) {
            console.log(error);
        });

    }


    componentDidMount() {
        this.GetServerCount();
    }

    render() {

        return (
            <></>
        )

    }
}

export default ProcessImages;