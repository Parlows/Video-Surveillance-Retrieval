const express = require('express');

// File system
const fs = require('fs');

// Paths
const path = require('path');

// ffmpeg
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobe = require('@ffprobe-installer/ffprobe');

// Set the path for ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobe.path);  // Set ffprobe path

// Videos directory (inside the container)
const videoDirectory = '/videos'

const app = express.Router();

// Gets video frame rate
const getVideoFrameRate = (videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                const frameRate = eval(metadata.streams[0].r_frame_rate); // Extract frame rate
                resolve(frameRate);
            }
        });
    });
};

// Gets video duration in frames
const getVideoLength = (videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                const videoLength = eval(metadata.streams[0].duration_ts); // Extract video length
                resolve(videoLength);
            }
        });
    });
};

app.get('/', async (req, res) => {

    const { name, startFrame, endFrame } = req.query;

    const videoPath = path.join(videoDirectory, (name.endsWith('.mp4'))? name : name+'.mp4');

    // Check if video exists
    if (!fs.existsSync(videoPath)) {
        return res.status(404).send('Video not found');
    }

    const startFrameNumber = parseInt(startFrame);
    let endFrameNumber = parseInt(endFrame);

    if (isNaN(startFrameNumber) || isNaN(endFrameNumber) || startFrameNumber >= endFrameNumber) {
        return res.status(400).send('Invalid startFrame or endFrame parameters');
    }

    const videoLength = await getVideoLength(videoPath);

    endFrameNumber = (endFrameNumber > videoLength) ? videoLength : endFrameNumber

    try {
        // Get the video frame rate
        const frameRate = await getVideoFrameRate(videoPath);

        // Convert frame numbers to time (seconds)
        const startSeconds = startFrameNumber / frameRate;
        const endSeconds = endFrameNumber / frameRate;

        // Use ffmpeg to trim and stream the video
        ffmpeg(videoPath)
            .setStartTime(startSeconds)
            .setDuration(endSeconds - startSeconds)
            .outputOptions('-movflags', 'frag_keyframe+empty_moov') // For better streaming support
            .toFormat('mp4')
            .on('error', (err) => {
                console.error('Error processing video:', err);
                res.status(500).send('Error processing video');
            })
            .pipe(res, { end: true });

    } catch (err) {
        console.error('Error getting video frame rate:', err);
        res.status(500).send('Error processing video frame rate');
    }
});

module.exports = app;
