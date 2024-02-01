const express = require('express');
const fs = require('fs');
const path = require('path');
const brain = require('brain.js');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// // Mikey backend Game Logic & CRUD Start

// function to read and parse game data from a JSON file
const getData = () => {
  let data = fs.readFileSync('data.json');
  return JSON.parse(data);
};

// function to write data to a JSON file
const saveData = (data) => {
  fs.writeFileSync('data.json', JSON.stringify(data));
};

// initialize and train the neural network
const network = new brain.NeuralNetwork();
const trainingData = [
  { input: { healthy: 1, empty: 0, reveal: 0, bad: 0 }, output: { mood: 0.8 } },
  { input: { healthy: 0, empty: 0, reveal: 0, bad: 0 }, output: { mood: 0.0 } },
  { input: { healthy: 0, empty: 0, reveal: 1, bad: 0 }, output: { mood: 0.5 } },
  { input: { healthy: 0, empty: 0, reveal: 0, bad: 1 }, output: { mood: 0.2 } },
];

// load network state if exists, else train with initial data
if (fs.existsSync('networkState.json')) {
    loadNetworkState();
} else {
    network.train(trainingData);
}
// log entry to the data log file
const appendToDataLog = (logEntry, dataLogFilePath) => {
  let dataLog = [];
  try {
      dataLog = JSON.parse(fs.readFileSync(dataLogFilePath));
  } catch (error) {
      // if file doesn't exist or is empty
  }
  dataLog.push(logEntry);
  fs.writeFileSync(dataLogFilePath, JSON.stringify(dataLog, null, 2));
};


const retrainNetwork = () => {
    const loggedData = JSON.parse(fs.readFileSync('dataFeedLog.json'));
    // convert logged data to the format suitable for training
    const formattedData = loggedData.map(entry => {
        return {
            input: entry.input, 
            output: entry.output // should be the observed mood after feeding
        };
    });

    network.train(formattedData, {
        iterations: 1000, // adjust as needed
        errorThresh: 0.005, //same
    });
};

// retrain the network every 24 hours
setInterval(() => {
    retrainNetwork();
    saveNetworkState();
}, 24 * 60 * 60 * 1000); // 24 hours in milliseconds


// function to get image URLs from a folder
function getImageUrlsFromFolder(folderName) {
  const directoryPath = path.join(__dirname, 'public', 'images', folderName);
  try {
    const imageFiles = fs.readdirSync(directoryPath);
    return imageFiles.map(file => `/images/${folderName}/${file}`);
  } catch (error) {
    console.error("Error reading directory:", error);
    return [];
  }
}

const saveNetworkState = () => {
    const networkState = JSON.stringify(network.toJSON());
    fs.writeFileSync('networkState.json', networkState);
};

const loadNetworkState = () => {
    const networkState = JSON.parse(fs.readFileSync('networkState.json'));
    network.fromJSON(networkState);
};

if (fs.existsSync('networkState.json')) {
    loadNetworkState();
} else {
    // utilizing the existing trainingData for initial training
    network.train(trainingData);
}



// function to randomly select an image from an array
function getRandomImage(imageArray) {
  const randomIndex = Math.floor(Math.random() * imageArray.length);
  return imageArray[randomIndex];
}

// endpoint to feed healthy
app.post('/feedHealthy', (req, res) => {
    let data = getData();
    data.foodLevel = (data.foodLevel || 0) + 5;
    data.size = (data.size || 0) + 1;

    let input = { healthy: 1, empty: 0, reveal: 0, bad: 0 };
    data.mood = predictMood(input).mood;

    saveData(data);

    const logEntry = {
        action: 'feedHealthy',
        response: 'Mikey is happy and well-fed!',
        moodChange: data.mood - (data.mood - 1),
        timestamp: new Date().toISOString(),
    };
    appendToDataLog(logEntry, 'dataFeedLog.json');

    let responseMessages = {
        highMood: "Mikey is happy and well-fed!",
        mediumMood: "Mikey is feeling okay after the meal.",
        lowMood: "Mikey is not very happy with that food."
    };

    let responseMessage = '';

    if (data.mood >= 0.6) {
        responseMessage = responseMessages.highMood;
    } else if (data.mood >= 0.3) {
        responseMessage = responseMessages.mediumMood;
    } else {
        responseMessage = responseMessages.lowMood;
    }

    res.json({ message: responseMessage, foodLevel: data.foodLevel, size: data.size, mood: data.mood });
});


// endpoint to feed empty
app.post('/feedEmpty', (req, res) => {
    let data = getData();

    // check if the Mikey has any food level left
    if (data.foodLevel > 0) {
        // Decrement food level by 1
        data.foodLevel -= 1;

        // input mood prediction is constant for this feed type
        data.mood = predictMood({ healthy: 0, empty: 1, reveal: 0, bad: 0 }).mood;

        const logEntry = {
            action: 'feedEmpty',
            response: 'Mikey is fed empty.',
            moodChange: data.mood - predictMood({ healthy: 0, empty: 1, reveal: 0, bad: 0 }).mood // Calculate mood change
        };
        appendToDataLog(logEntry, 'dataFeedLog.json');

        saveData(data);

        res.json({ message: 'Mikey has been fed empty!', foodLevel: data.foodLevel, mood: data.mood });
    } else {
        // if food level is already at 0, send a success response with no further action
        res.json({ message: 'Mikey has no food left!', foodLevel: data.foodLevel, mood: data.mood });
    }
});


// endpoint to feed reveal
app.post('/feedReveal', (req, res) => {
    let data = getData();
    data.size = (data.size || 0);

    let input = { healthy: 0, empty: 0, reveal: 1, bad: 0 };
    data.mood = predictMood(input).mood;

    const logEntry = {
        action: 'feedReveal',
        response: 'Mikey is fed with a reveal.',
        moodChange: data.mood - predictMood(input).mood // calculate mood change
    };
    appendToDataLog(logEntry, 'dataFeedLog.json');

    saveData(data);

    res.json({ message: 'Mikey has been fed with a reveal!', size: data.size, mood: data.mood });
});



// endpoint to feed bad
app.post('/feedBad', (req, res) => {
    let data = getData();

    // update food level and size
    data.foodLevel = Math.max(0, (data.foodLevel || 0) - 10);
    data.size = Math.max(0, (data.size || 0) - 10); // Ensuring size doesn't go negative

    // input mood prediction is constant for this feed type
    let moodPrediction = predictMood({ healthy: 0, empty: 0, reveal: 0, bad: 1 });

    // generate a response message based on the mood prediction
    let responseMessage = '';
    if (moodPrediction.mood >= 0.8) {
        responseMessage = 'Mikey is upset after a bad meal!';
    } else if (moodPrediction.mood >= 0.6) {
        responseMessage = 'Mikey is not happy about the bad meal.';
    } else if (moodPrediction.mood >= 0.4) {
        responseMessage = 'Mikey is disappointed with the bad meal.';
    } else {
        responseMessage = 'Mikey is very unhappy after a bad meal.';
    }

    data.mood = moodPrediction.mood;

    const logEntry = {
        action: 'feedBad',
        response: responseMessage,
        moodChange: data.mood - moodPrediction.mood
    };
    appendToDataLog(logEntry, 'dataFeedLog.json');

    saveData(data);

    res.json({ message: responseMessage, foodLevel: data.foodLevel, size: data.size, mood: data.mood });
});

// express middleware for serving static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// get random image URLs for each button type
app.get('/getImageUrls', (req, res) => {
  const healthyImages = getImageUrlsFromFolder('HealthyFood');
  const emptyImages = getImageUrlsFromFolder('EmptyFood');
  const badImages = getImageUrlsFromFolder('BadFood');
  const revealImages = getImageUrlsFromFolder('RevealFood');

  res.json({
    healthy: getRandomImage(healthyImages),
    empty: getRandomImage(emptyImages),
    bad: getRandomImage(badImages),
    reveal: getRandomImage(revealImages)
  });
});


// get Mikey's status
app.get('/status', (req, res) => {
  const data = getData();
  res.json(data);
});

// predict mood
const predictMood = (input) => {
  return network.run(input);
};


// // Mikey backend Game Logic & CRUD End








app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
