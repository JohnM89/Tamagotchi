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

// Endpoint to feed healthy
app.post('/feedHealthy', (req, res) => {
    let data = getData();
    data.foodLevel = (data.foodLevel || 0) + 1;
    data.size = (data.size || 0) + 1;

    let input = { healthy: 1, empty: 0, reveal: 0, bad: 0 };
    data.mood = predictMood(input).mood;

    saveData(data);
    
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

        saveData(data);

        // Define response messages based on mood
        let responseMessages = {
            highMood: "Tamagotchi is feeling satisfied!",
            mediumMood: "Tamagotchi is content after the meal.",
            lowMood: "Tamagotchi didn't like that food much."
        };

        let responseMessage = '';

        if (data.mood >= 0.6) {
            responseMessage = responseMessages.highMood;
        } else if (data.mood >= 0.3) {
            responseMessage = responseMessages.mediumMood;
        } else {
            responseMessage = responseMessages.lowMood;
        }

        res.json({ message: responseMessage, foodLevel: data.foodLevel, mood: data.mood });
    } else {
        res.json({ message: 'Tamagotchi has no food left!', foodLevel: data.foodLevel, mood: data.mood });
    }
});

// Endpoint to feed reveal
app.post('/feedReveal', (req, res) => {
    let data = getData();
    data.size = (data.size || 0);

    let input = { healthy: 0, empty: 0, reveal: 1, bad: 0 };
    data.mood = predictMood(input).mood;

    saveData(data);
    
    // Define response messages based on mood
    let responseMessages = {
        highMood: "Tamagotchi enjoyed the surprise!",
        mediumMood: "Tamagotchi is curious after the reveal.",
        lowMood: "Tamagotchi didn't react much to the reveal."
    };

    let responseMessage = '';

    if (data.mood >= 0.6) {
        responseMessage = responseMessages.highMood;
    } else if (data.mood >= 0.3) {
        responseMessage = responseMessages.mediumMood;
    } else {
        responseMessage = responseMessages.lowMood;
    }

    res.json({ message: responseMessage, size: data.size, mood: data.mood });
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

    saveData(data);

    res.json({ message: responseMessage, foodLevel: data.foodLevel, size: data.size, mood: data.mood });
});






app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
