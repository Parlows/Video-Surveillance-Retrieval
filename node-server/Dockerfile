FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json
#COPY package.json ./

# Install the dependencies
RUN npm install express
RUN npm install fs path dotenv
RUN npm install fluent-ffmpeg ffmpeg-static
RUN npm install @ffprobe-installer/ffprobe


# Copy the app
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD [ "node", "app.js" ]