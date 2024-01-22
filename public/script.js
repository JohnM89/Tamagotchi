$(document).ready(function() {
    const $tamagotchiImg = $("#tamagotchi");
    const frames = ["../Mikey Frames/Mikey Frame 1.svg", "../Mikey Frames/Mikey Frame 2.svg", "../Mikey Frames/Mikey Frame 3.svg", "../Mikey Frames/Mikey Frame 4.svg", "../Mikey Frames/Mikey Frame 5.svg", "../Mikey Frames/Mikey Frame 6.svg"];
    let frameIndex = 5;
    let repeatCount = 0;
    let animationInterval;
    let animationEnabled = true;
    let buttonNames = {
        feedHealthy: "Feed Healthy",
        feedEmpty: "Feed Empty",
        feedReveal: "Feed Reveal",
        feedBad: "Feed Bad"
    };
    let originalButtonNames = {
        feedHealthy: $('#feedButtonHealthy').text(),
        feedEmpty: $('#feedButtonEmpty').text(),
        feedReveal: $('#feedButtonReveal').text(),
        feedBad: $('#feedButtonBad').text()
    };

    function updateButtonImages() {
        $.get('/getImageUrls', function(data) {
            $('#feedButtonHealthy').html('<img src="' + data.healthy + '" alt="Feed Healthy">');
            $('#feedButtonEmpty').html('<img src="' + data.empty + '" alt="Feed Empty">');
            $('#feedButtonBad').html('<img src="' + data.bad + '" alt="Feed Bad">');
            $('#feedButtonReveal').html('<img src="' + data.reveal + '" alt="Feed Reveal">');
        });
    }

    // Call to update button images
    updateButtonImages();

function shuffleButtonsAndNames() {
    const buttonContainer = $("#buttonContainer");
    const buttons = buttonContainer.children();
    const names = Object.values(buttonNames);

    // Shuffle the order of buttons
    for (let i = buttons.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        buttonContainer.append(buttons[j]);
    }

    // // Shuffle the names (button text)
    // for (let i = names.length - 1; i > 0; i--) {
    //     const j = Math.floor(Math.random() * (i + 1));
    //     [names[i], names[j]] = [names[j], names[i]];
    // }

    // // Update button text with shuffled names
    // $('#feedButtonHealthy').text(names[0]);
    // $('#feedButtonEmpty').text(names[1]);
    // $('#feedButtonBad').text(names[2]);
    // $('#feedButtonReveal').text(names[3]);
    
}


    function startAnimation() {
        if (!animationEnabled) return;

        $tamagotchiImg.attr('src', frames[frameIndex]);

        animationInterval = setInterval(function() {
            if (frameIndex < 3) {
                $tamagotchiImg.attr('src', frames[frameIndex++]);
            } else {
                if (repeatCount < 12) {
                    $tamagotchiImg.attr('src', frames[3 + (repeatCount % 3)]);
                    repeatCount++;
                } else {
                    stopAnimation();
                    $tamagotchiImg.attr('src', frames[0]);
                    return;
                }
            }

            if (frameIndex === frames.length) {
                frameIndex = 0;
            }
        }, repeatCount === 0 ? 200 : 133);
        animationEnabled = false;
    }

    function stopAnimation() {
        clearInterval(animationInterval);
        animationEnabled = true;
        frameIndex = 5;
        repeatCount = 0;
    }

function postFeedAction(feedType) {
    $.post('/' + feedType, function(data) {
        // Destructure the response data
        const { message, foodLevel, size, mood } = data;

        // Log each property separately
        console.log('Message:', message);
        if (foodLevel !== undefined) {
            console.log('Food Level:', foodLevel);
        }
        if (size !== undefined) {
            console.log('Size:', size);
        }
        console.log('Mood:', mood);

        // Other actions
        fetchStatus();
        startAnimation();
        updateTamagotchiMood(mood);
    }, 'json');
}



    const feedHealthy = function() {
        shuffleButtonsAndNames();
        postFeedAction('feedHealthy');
        // resetHoverEffect();
    };

    const feedEmpty = function() {
        const shuffledNames = shuffleButtonsAndNames();
        postFeedAction('feedEmpty');
        // resetHoverEffect();
    };

const feedReveal = function() {
    // Store original names
  // Close any existing tooltips
    $('.tooltip').remove();

    let originalNames = {
        feedHealthy: $('#feedButtonHealthy .button-label').text(),
        feedEmpty: $('#feedButtonEmpty .button-label').text(),
        feedReveal: $('#feedButtonReveal .button-label').text(),
        feedBad: $('#feedButtonBad .button-label').text()
    };

    // Create and show tooltips
    $('.button').each(function() {
        const tooltipText = $(this).attr('data-title');
        const $tooltip = $('<span class="tooltip" style="display: none;">' + tooltipText + '</span>');
        $(this).append($tooltip);
        $tooltip.fadeIn();
    });

    // Log the presence of tooltips
    console.log('Tooltips added');

    // After a delay, hide and remove tooltips
    setTimeout(() => {
        $('.tooltip').fadeOut(function() {
            $(this).remove();
        });

        // Log the removal of tooltips
        console.log('Tooltips removed');
    }, 5000); // 5 seconds delay

    postFeedAction('feedReveal');
};





    const feedBad = function() {
        const shuffledNames = shuffleButtonsAndNames();
        postFeedAction('feedBad');
        // resetHoverEffect();
    };

    function updateTamagotchiMood(mood) {
        if (mood >= 0.6) {
            $tamagotchiImg.removeClass('spinning upside-down').addClass('normal');
        } else if (mood >= 0.3) {
            $tamagotchiImg.removeClass('normal upside-down').addClass('spinning');
        } else {
            $tamagotchiImg.removeClass('normal spinning').addClass('upside-down');
        }
    }

    // const resetHoverEffect = () => {
    //     $('#buttonContainer').removeClass('reveal-names-on-hover');
    // };

    $(document).on('keydown', function(event) {
        if (event.key === 'f' || event.key === 'F') {
            feedHealthy();
        }
    });

    $('#feedButtonHealthy').on('click', feedHealthy);
    $('#feedButtonEmpty').on('click', feedEmpty);
    $('#feedButtonReveal').on('click', feedReveal);
    $('#feedButtonBad').on('click', feedBad);


    function updateTamagotchiSize(foodLevel) {
        const newSize = 100 + foodLevel * 10;
        $tamagotchiImg.css({
            'width': newSize + 'px',
            'height': newSize + 'px'
        });
    }

    function fetchStatus() {
        $.get('/status', function(data) {
            $('#foodLevel').text(data.foodLevel);
            updateTamagotchiSize(data.foodLevel);
        }, 'json');
    }

    fetchStatus();
});