import React, { Component } from 'react';
import axios from 'axios';

class ProcessImages extends Component {
    state = {
        data: 0,
        count: 0,
    }

    OutputDataHandler = () => {
        let beginningCount = this.state.count;
        for( let i = 1; i <= 10; i++)
        {
            let singleImageData = this.props.data.records[i];
            // console.log(singleImageData);
            if(singleImageData.hasOwnProperty("title")
            && singleImageData.hasOwnProperty("provenance")
            && singleImageData.hasOwnProperty("dated")
            && singleImageData.hasOwnProperty("creditline")
            && (singleImageData.hasOwnProperty("baseimageurl")
            || singleImageData.hasOwnProperty("primaryimageurl")))
            {
                this.PostImageToServer(singleImageData, (beginningCount + i));
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
            console.log("GSC");
            console.log(response);
            this.OutputDataHandler();
        })
        .catch(function (error) {
            console.log(error);
        });
    }

    IncrementServerCount = () => {
        axios.put("https://noble-maxim-217223.firebaseio.com/count.json", this.state.count)
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
            <div>

            </div>
        )

    }
}

export default ProcessImages;