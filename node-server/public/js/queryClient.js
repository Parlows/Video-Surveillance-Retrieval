
function querySearch() {

    const resultsDiv = document.getElementById('results');


    // Get search text
    queryText = document.getElementById('searchBar').value;

    try {

        if(!queryText) {
            throw new Error('Please introduce a term in the search bar');
        }

        // Print loading wheel
        resultsDiv.innerHTML = '';
        const wheelCont = document.createElement('div');
        wheelCont.classList.add('loader-container')
        const wheel = document.createElement('div')
        wheel.classList.add('loader');
        wheelCont.appendChild(wheel)
        resultsDiv.appendChild(wheelCont)

        // Get encoder
        let encoderName = document.getElementById('encoder').value;
        let datasetName = document.getElementById('dataset').value;
        let databaseName = document.getElementById('database').value;

        if(!encoderName) {
            throw new Error('Please select an encoder');
        } else if(!datasetName) {
            throw new Error('Please select a dataset');
        } else if(!databaseName) {
            throw new Error('Please select a database');
        }

        // Url
        url = `http://localhost:3000/query/${databaseName}?text=${queryText}&encoder=${encoderName}&dataset=${datasetName}`

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    response.json()
                        .then(err => {
                            let errorMessage = `Error sent from server: ${err.status} - \"${err.message}\"`
                            resultsDiv.innerHTML = `<p class="error-message">${errorMessage}</p>`;
                        });
                    throw new Error("Error at querying");
                }
                return response.json();
            })
            .then(data => {
                printVideos(data);
            })
            .catch(err => {
                console.log(err);
            });
    } catch(err) {
        resultsDiv.innerHTML = `<p class="error-message">${err.message}</p>`;
    }

}

function printVideos(videosJson) {

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    videosJson.results.forEach(element => {

        // Extract info
        let start_frame = element.start_frame;
        let end_frame = element.end_frame;
        let video_name = element.video;

        // Create entry division
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('entry');

        // Create video element
        const videoPlayer = document.createElement('video');
        videoPlayer.classList.add('videoPlayer');
        videoPlayer.controls = true;
        videoPlayer.muted = true;

        // Add source
        const source = document.createElement('source');
        source.src = `/video?name=${video_name}&startFrame=${start_frame}&endFrame=${end_frame}`;
        source.type = 'video/mp4';
        videoPlayer.appendChild(source);

        // Create video metadata div
        const videoInfoDiv = document.createElement('div');
        videoInfoDiv.classList.add('video-info');

        // Create camera name paragraph
        const cameraInfo = document.createElement('p');
        cameraInfo.textContent = `Video: ${video_name}`;

        // // Create date paragraph
        // const dateInfo = document.createElement('p');
        // dateInfo.textContent = `Date: ${element.sentence}`;

        // Append paragraphs to videoInfoDiv
        videoInfoDiv.appendChild(cameraInfo);
        // videoInfoDiv.appendChild(dateInfo);

        // Create the horizontal line (hr)
        const hrElement = document.createElement('hr');

        // Append video, info, and hr to the entry div
        entryDiv.appendChild(videoPlayer);
        entryDiv.appendChild(videoInfoDiv);
        entryDiv.appendChild(hrElement);

        // Append the entire entry div to the results div
        resultsDiv.appendChild(entryDiv);

    });
}
