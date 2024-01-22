const express = require('express');
const fs = require('fs');
const path = require('path');
const brain = require('brain.js');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const getData = () => {
  let data = fs.readFileSync('data.json');
  return JSON.parse(data);
};

const saveData = (data) => {
  fs.writeFileSync('data.json', JSON.stringify(data));
};

// Initialize and train the neural network
const network = new brain.NeuralNetwork();
const trainingData = [
  { input: { healthy: 1, empty: 0, reveal: 0, bad: 0 }, output: { mood: 0.8 } },
  { input: { healthy: 0, empty: 0, reveal: 0, bad: 0 }, output: { mood: 0.0 } },
  { input: { healthy: 0, empty: 0, reveal: 1, bad: 0 }, output: { mood: 0.5 } },
  { input: { healthy: 0, empty: 0, reveal: 0, bad: 1 }, output: { mood: 0.2 } },
];
network.train(trainingData);

// Function to append a log entry to the data log file
const appendToDataLog = (logEntry, dataLogFilePath) => {
    let dataLog = [];
    try {
        dataLog = JSON.parse(fs.readFileSync(dataLogFilePath));
    } catch (error) {
        // File doesn't exist or is empty
    }
    dataLog.push(logEntry);
    fs.writeFileSync(dataLogFilePath, JSON.stringify(dataLog, null, 2));
};

// Function to retrieve all logged data
const getAllDataLogEntries = (dataLogFilePath) => {
    try {
        return JSON.parse(fs.readFileSync(dataLogFilePath));
    } catch (error) {
        return [];
    }
};

// Function to get image URLs from a folder
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

// Function to randomly select an image from an array
function getRandomImage(imageArray) {
  const randomIndex = Math.floor(Math.random() * imageArray.length);
  return imageArray[randomIndex];
}


// Example arrays of image URLs
// const healthyImages = ["http://example.com/healthy1.jpg", "http://example.com/healthy2.jpg", /* ... */];
// const emptyImages = ["http://example.com/empty1.jpg", "http://example.com/empty2.jpg", /* ... */];
// const badImages = ["http://example.com/bad1.jpg", "http://example.com/bad2.jpg", /* ... */];
// const revealImages = ["/", "http://example.com/reveal2.jpg", /* ... */];

// Function to randomly select an image from an array
function getRandomImage(imageArray) {
  const randomIndex = Math.floor(Math.random() * imageArray.length);
  return imageArray[randomIndex];
}


// Endpoint to get random image URLs for each button type
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



// Retrieve all logged data
app.get('/getAllLoggedData', (req, res) => {
    const loggedData = getAllDataLogEntries('dataFeedLog.json');
    res.json(loggedData);
});

// Endpoint to get Tamagotchi status
app.get('/status', (req, res) => {
  const data = getData();
  res.json(data);
});

// Function to predict mood
const predictMood = (input) => {
  return network.run(input);
};


function postFeedAction(feedType) {
    $.post('/feed', { feedType: feedType }, function(data) {
        console.log(data);
        fetchStatus();
        startAnimation();
        updateTamagotchiMood(data.mood);
    }, 'json');
}

// Express route to get a random image from a specific category

// app.get('/getRandomImage/:category', (req, res) => {
//     const category = req.params.category;

//     // Logic to select and return a random image URL from the specified category
//     let randomImageUrl = getRandomImageUrlForCategory(category);

//     // Send the image URL as a response
//     res.json({ imageUrl: randomImageUrl });
// });



// Endpoint to feed healthy
app.post('/feedHealthy', (req, res) => {
    let data = getData();
    data.foodLevel = (data.foodLevel || 0) + 5;
    data.size = (data.size || 0) + 1;

    let input = { healthy: 1, empty: 0, reveal: 0, bad: 0 };
    data.mood = predictMood(input).mood;

    saveData(data);

    // Append a log entry for this action
    const logEntry = {
        action: 'feedHealthy',
        response: 'Tamagotchi is happy and well-fed!',
        moodChange: data.mood - (data.mood - 1),
        timestamp: new Date().toISOString(),
    };
    appendToDataLog(logEntry, 'dataFeedLog.json');

    // Define response messages based on mood
    let responseMessages = {
        highMood: "Tamagotchi is happy and well-fed!",
        mediumMood: "Tamagotchi is feeling okay after the meal.",
        lowMood: "Tamagotchi is not very happy with that food."
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


// Endpoint to feed empty
app.post('/feedEmpty', (req, res) => {
    let data = getData();

    // Check if the Tamagotchi has any food level left
    if (data.foodLevel > 0) {
        // Decrement food level by 1
        data.foodLevel -= 1;

        // Input for mood prediction is constant for this feed type
        data.mood = predictMood({ healthy: 0, empty: 1, reveal: 0, bad: 0 }).mood;

        // Log the interaction
        const logEntry = {
            action: 'feedEmpty',
            response: 'Tamagotchi is fed empty.',
            moodChange: data.mood - predictMood({ healthy: 0, empty: 1, reveal: 0, bad: 0 }).mood // Calculate mood change
        };
        appendToDataLog(logEntry, 'dataFeedLog.json');

        saveData(data);

        res.json({ message: 'Tamagotchi has been fed empty!', foodLevel: data.foodLevel, mood: data.mood });
    } else {
        // If food level is already at 0, send a success response with no further action
        res.json({ message: 'Tamagotchi has no food left!', foodLevel: data.foodLevel, mood: data.mood });
    }
});


// Endpoint to feed reveal
app.post('/feedReveal', (req, res) => {
    let data = getData();
    data.size = (data.size || 0);

    let input = { healthy: 0, empty: 0, reveal: 1, bad: 0 };
    data.mood = predictMood(input).mood;

    // Log the interaction
    const logEntry = {
        action: 'feedReveal',
        response: 'Tamagotchi is fed with a reveal.',
        moodChange: data.mood - predictMood(input).mood // Calculate mood change
    };
    appendToDataLog(logEntry, 'dataFeedLog.json');

    saveData(data);

    res.json({ message: 'Tamagotchi has been fed with a reveal!', size: data.size, mood: data.mood });
});



// Endpoint to feed bad
app.post('/feedBad', (req, res) => {
    let data = getData();

    // Update food level and size
    data.foodLevel = Math.max(0, (data.foodLevel || 0) - 10);
    data.size = Math.max(0, (data.size || 0) - 10); // Ensuring size doesn't go negative

    // Input for mood prediction is constant for this feed type
    let moodPrediction = predictMood({ healthy: 0, empty: 0, reveal: 0, bad: 1 });

    // Generate a response message based on the mood prediction
    let responseMessage = '';
    if (moodPrediction.mood >= 0.8) {
        responseMessage = 'Tamagotchi is upset after a bad meal!';
    } else if (moodPrediction.mood >= 0.6) {
        responseMessage = 'Tamagotchi is not happy about the bad meal.';
    } else if (moodPrediction.mood >= 0.4) {
        responseMessage = 'Tamagotchi is disappointed with the bad meal.';
    } else {
        responseMessage = 'Tamagotchi is very unhappy after a bad meal.';
    }

    data.mood = moodPrediction.mood;

    // Log the interaction
    const logEntry = {
        action: 'feedBad',
        response: responseMessage,
        moodChange: data.mood - moodPrediction.mood // Calculate mood change
    };
    appendToDataLog(logEntry, 'dataFeedLog.json');

    saveData(data);

    res.json({ message: responseMessage, foodLevel: data.foodLevel, size: data.size, mood: data.mood });
});







app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});