// Ensure the script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- Firebase Initialization ---
    const firebaseConfig = {
        apiKey: "AIzaSyCfgJraRkyM_tPqdiqbqioEl9g7H9P8N5Y",
        authDomain: "popix-c0d04.firebaseapp.com",
        databaseURL: "https://popix-c0d04-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "popix-c0d04",
        storageBucket: "popix-c0d04.appspot.com",
        messagingSenderId: "833211468812",
        appId: "1:833211468812:web:80a6e7951d0cb1bf327229",
        measurementId: "G-EYZV9SF6SW"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    firebase.analytics();
    const database = firebase.database();

    // --- Volume Settings (0.0 to 1.0) ---
    const INTRO_VOLUME = 0.6; // 60%
    const LEVEL_VOLUME = 0.4; // 40%
    const SOUND_VOLUME = 1.0; // 100% for sound effects
    const FINAL_VOLUME = 0.5; // Volume for final music

    // Flags to track if sounds and music are enabled
    let soundsEnabled = true;
    let musicEnabled = true;

    // --- Canvas and Context ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Load the PopixTitle image
    const popixTitleImage = new Image();
    popixTitleImage.src = 'images/PopixTitle.jpg';

    // --- UI Elements ---
    const startGameButton = document.getElementById('startGameButton');
    const rulesButton = document.getElementById('rulesButton');
    const nextLevelButton = document.getElementById('nextLevelButton');
    const tryAgainButton = document.getElementById('tryAgainButton');
    const resetGameButton = document.getElementById('resetGameButton');
    const resetScoresButton = document.getElementById('resetScoresButton');
    const nameForm = document.getElementById('nameForm');
    const playerNameInput = document.getElementById('playerName');
    const leaderboardBody = document.getElementById('leaderboardBody');
    const leaderboardLevelDisplay = document.getElementById('leaderboardLevel');
    const clickCountDisplay = document.getElementById('clickCount');
    const timeElapsedDisplay = document.getElementById('timeElapsed');
    const comboMultiplierDisplay = document.getElementById('comboMultiplierDisplay');
    const circlesRemainingDisplay = document.getElementById('circlesRemaining');
    const currentLevelDisplay = document.getElementById('currentLevel');
    const liveScoreDisplay = document.getElementById('liveScore');
    const buttonOverlay = document.getElementById('buttonOverlay');
    const overlayButtons = document.getElementById('overlayButtons');
    const endLevelScoreDiv = document.getElementById('endLevelScore');
    const nameFormMessage = document.getElementById('nameFormMessage');
    const overlayButtonsMessage = document.getElementById('overlayButtonsMessage');
    const soundToggleButton = document.getElementById('soundToggleButton');
    const musicToggleButton = document.getElementById('musicToggleButton');
    const confirmationDialog = document.getElementById('confirmationDialog');
    const confirmYesButton = document.getElementById('confirmYesButton');
    const confirmNoButton = document.getElementById('confirmNoButton');
    const rulesModal = document.getElementById('rulesModal');
    const closeRulesButton = document.getElementById('closeRulesButton');
    const prevPageButton = document.getElementById('prevPageButton');
    const nextPageButton = document.getElementById('nextPageButton');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');

    // --- Sound effects ---
    const collisionSound = new Audio('sounds/collision.mp3');
    collisionSound.volume = SOUND_VOLUME;

    const clickSound = new Audio('sounds/click.mp3');
    clickSound.volume = SOUND_VOLUME;

    const missSound = new Audio('sounds/miss.mp3');
    missSound.volume = SOUND_VOLUME;

    // Background Music
    let introMusic = new Audio('sounds/intro.mp3');
    introMusic.loop = true;
    introMusic.volume = INTRO_VOLUME;

    let levelMusic = new Audio();
    levelMusic.loop = true;
    levelMusic.volume = LEVEL_VOLUME;

    // Final Scoreboard Music
    let finalMusic = new Audio('sounds/final.mp3');
    finalMusic.loop = true;
    finalMusic.volume = FINAL_VOLUME;

    // --- Game Variables ---
    let circles = [];
    let particles = [];
    let clickCount = 0;
    let comboMultiplier = 1;
    let level = 1;
    let animationId = null;
    let timerInterval = null;
    let scoreInterval = null; // Interval for score decrement
    let startTime = 0;
    let timeElapsed = 0;
    const speedIncreaseFactor = 1.1;
    const startingDiameter = 200;
    const minDiameter = 25;
    let leaderboard = [];
    let gameStarted = false;
    let score = 0;
    const maxLevel = 10;

    // Track the number of missed clicks during the level
    let missedClicks = 0;

    // Pagination variables
    const entriesPerPage = 10;
    let currentPage = 1;
    let totalPages = 1;

    // For tracking the time between pops
    let lastPopTime = null;

    // Cheat code variables
    let cheatCode = 'woos';
    let cheatCodePosition = 0;

    // Game state variable
    let gameState = 'idle'; // Possible states: 'idle', 'playing', 'endLevel', 'endGame'

    // --- Helper Functions ---

    /**
     * Shows a DOM element by setting its display style to 'block' or 'flex'.
     * @param {HTMLElement} element - The DOM element to show.
     * @param {string} displayStyle - Optional. The display style to apply ('block', 'flex', etc.). Defaults to 'flex'.
     */
    function showElement(element, displayStyle = 'flex') {
        if (element) {
            element.style.display = displayStyle;
        }
    }

    /**
     * Hides a DOM element by setting its display style to 'none'.
     * @param {HTMLElement} element - The DOM element to hide.
     */
    function hideElement(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    // --- Class Definitions ---

    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 5 + 2;
            this.dx = (Math.random() - 0.5) * 4;
            this.dy = (Math.random() - 0.5) * 4;
            this.alpha = 1;
        }

        update() {
            this.x += this.dx;
            this.y += this.dy;
            this.alpha -= 0.02;
            this.size *= 0.95;
        }

        draw() {
            ctx.fillStyle = `rgba(255, 215, 0, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class Circle {
        constructor(x, y, dx, dy, diameter) {
            this.x = x;
            this.y = y;
            this.dx = dx;
            this.dy = dy;
            this.diameter = diameter;
            this.radius = diameter / 2;
            this.color = 'black';
            this.colorTimer = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }

        update() {
            this.x += this.dx;
            this.y += this.dy;

            const epsilon = 0.1;

            // Check collision with walls
            if (this.x + this.radius > canvas.width) {
                this.x = canvas.width - this.radius - epsilon;
                this.dx *= -0.98;
            }
            if (this.x - this.radius < 0) {
                this.x = this.radius + epsilon;
                this.dx *= -0.98;
            }
            if (this.y + this.radius > canvas.height) {
                this.y = canvas.height - this.radius - epsilon;
                this.dy *= -0.98;
            }
            if (this.y - this.radius < 0) {
                this.y = this.radius + epsilon;
                this.dy *= -0.98;
            }

            // Handle color reset
            if (this.colorTimer > 0) {
                this.colorTimer--;
                if (this.colorTimer === 0) {
                    this.color = 'black';
                }
            }

            this.draw();
        }

        isClicked(mx, my) {
            const distance = Math.hypot(mx - this.x, my - this.y);
            return distance < this.radius;
        }

        subdivide(circlesArray, speedIncreaseFactor, minDiameter) {
            if (this.radius * 2 >= minDiameter) {
                const newDiameter = this.diameter / 2;
                const newSpeed = Math.hypot(this.dx, this.dy) * speedIncreaseFactor;

                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = angle1 + Math.PI / 2;

                circlesArray.push(new Circle(this.x, this.y, newSpeed * Math.cos(angle1), newSpeed * Math.sin(angle1), newDiameter));
                circlesArray.push(new Circle(this.x, this.y, newSpeed * Math.cos(angle2), newSpeed * Math.sin(angle2), newDiameter));
            }
        }

        collide() {
            if (soundsEnabled) {
                collisionSound.play().catch(error => {
                    console.error('Error playing collision sound:', error);
                });
            }
            this.color = 'red';
            this.colorTimer = 10;
        }
    }

    // --- Function Definitions ---

    function drawInitialScreen() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 0.5; // Set opacity to 50%
        ctx.drawImage(popixTitleImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0; // Reset opacity
    }

    function startGame() {
        console.log(`Starting game at Level ${level}.`);
        gameState = 'playing';
        gameStarted = true;
        circles = [];
        particles = [];
        clickCount = 0;
        comboMultiplier = 1;
        score = 0;
        startTime = performance.now();
        timeElapsed = 0;
        missedClicks = 0; // Reset missedClicks counter
        lastPopTime = null; // Reset last pop time
        updateUI();
        loadLeaderboard().then(updateLeaderboard).catch(error => {
            console.error('Error loading leaderboard during game start:', error);
        });

        hideElement(buttonOverlay);
        hideElement(overlayButtons);
        hideElement(nameForm); // Hide name form after initial entry
        nameFormMessage.textContent = ''; // Clear previous messages

        // Hide Start Game and Rules buttons once the game has begun
        hideElement(startGameButton);
        hideElement(rulesButton);

        // Clear the canvas and hide the title image
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        setLevelMusic();

        // Create initial circles
        for (let i = 0; i < level; i++) {
            const x = Math.random() * (canvas.width - startingDiameter - 2 * minDiameter) + startingDiameter / 2 + minDiameter;
            const y = Math.random() * (canvas.height - startingDiameter - 2 * minDiameter) + startingDiameter / 2 + minDiameter;
            const dx = (Math.random() - 0.5) * 4;
            const dy = (Math.random() - 0.5) * 4;
            circles.push(new Circle(x, y, dx, dy, startingDiameter));
        }

        console.log(`Created ${circles.length} circle(s).`);
        circlesRemainingDisplay.textContent = circles.length;

        timerInterval = setInterval(() => {
            updateTime();
        }, 100); // Updates every 0.1 seconds

        // Start score decrement interval
        scoreInterval = setInterval(() => {
            decrementScore();
        }, 2000); // Every 2 seconds

        animate();
    }

    function setLevelMusic() {
        // Pause any existing level music
        levelMusic.pause();
        levelMusic.currentTime = 0;

        // Set the music source based on the current level
        const levelNumber = String(level).padStart(2, '0'); // e.g., '01', '02', etc.
        const musicSrc = `sounds/musiclvl${levelNumber}.mp3`;
        levelMusic.src = musicSrc;

        if (musicEnabled) {
            // Play the level music
            levelMusic.play().then(() => {
                console.log(`Playing music for Level ${level}: ${musicSrc}`);
            }).catch(error => {
                console.error(`Error playing level ${level} music (${musicSrc}):`, error);
            });
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        particles = particles.filter(p => p.alpha > 0);

        // Update and draw circles
        circles.forEach(circle => {
            circle.update();
        });

        // Update circles remaining
        circlesRemainingDisplay.textContent = circles.length;

        // Handle collisions
        handleCollisions();

        if (circles.length === 0) {
            console.log('All circles cleared. Ending level.');
            endLevel();
        } else {
            animationId = requestAnimationFrame(animate);
        }
    }

    function handleCollisions() {
        for (let i = 0; i < circles.length; i++) {
            for (let j = i + 1; j < circles.length; j++) {
                const c1 = circles[i];
                const c2 = circles[j];
                if (detectCollision(c1, c2)) {
                    resolveCollision(c1, c2);
                    c1.collide();
                    c2.collide();
                }
            }
        }
    }

    function detectCollision(circle1, circle2) {
        const dx = circle2.x - circle1.x;
        const dy = circle2.y - circle1.y;
        const distance = Math.hypot(dx, dy);
        return distance < (circle1.radius + circle2.radius);
    }

    function resolveCollision(circle1, circle2) {
        const dx = circle2.x - circle1.x;
        const dy = circle2.y - circle1.y;
        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
            circle1.x += Math.random() * 0.01;
            circle1.y += Math.random() * 0.01;
            return;
        }

        const overlap = (circle1.radius + circle2.radius) - distance;
        const correctionRatio = overlap / distance / 2;
        const correctionX = dx * correctionRatio;
        const correctionY = dy * correctionRatio;

        circle1.x -= correctionX;
        circle1.y -= correctionY;
        circle2.x += correctionX;
        circle2.y += correctionY;

        const normalX = dx / distance;
        const normalY = dy / distance;

        const tangentX = -normalY;
        const tangentY = normalX;

        const dpTan1 = circle1.dx * tangentX + circle1.dy * tangentY;
        const dpTan2 = circle2.dx * tangentX + circle2.dy * tangentY;

        const dpNorm1 = circle1.dx * normalX + circle1.dy * normalY;
        const dpNorm2 = circle2.dx * normalX + circle2.dy * normalY;

        const m1 = dpNorm2;
        const m2 = dpNorm1;

        circle1.dx = tangentX * dpTan1 + normalX * m1;
        circle1.dy = tangentY * dpTan1 + normalY * m1;
        circle2.dx = tangentX * dpTan2 + normalX * m2;
        circle2.dy = tangentY * dpTan2 + normalY * m2;
    }

    function updateTime() {
        // Calculate the difference in seconds with two decimal points
        timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);

        // Update the display with 's' appended
        timeElapsedDisplay.textContent = `${timeElapsed}s`;
    }

    function decrementScore() {
        score = Math.max(0, Math.floor(score * 0.98)); // Decrease by 2% and remove decimals
        liveScoreDisplay.textContent = score;
    }

    function updateUI() {
        clickCountDisplay.textContent = clickCount;
        currentLevelDisplay.textContent = level;
        circlesRemainingDisplay.textContent = circles.length;
        comboMultiplierDisplay.textContent = comboMultiplier.toFixed(2);
        liveScoreDisplay.textContent = score;
        // If you have a live display for missedClicks during the game, update it here
        // Example:
        // missedClicksDisplay.textContent = missedClicks;
    }

    function handleCanvasClick(event) {
        if (!gameStarted) {
            console.log('Game not started yet. Click ignored.');
            return; // Prevent clicks when game isn't started
        }
        clickCount++;
        updateUI();
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        let hit = false;

        for (let i = circles.length - 1; i >= 0; i--) {
            const circle = circles[i];
            if (circle.isClicked(mouseX, mouseY)) {
                hit = true;
                if (soundsEnabled) {
                    clickSound.play().catch(error => {
                        console.error('Error playing click sound:', error);
                    });
                }

                createParticleEffect(circle.x, circle.y);

                // Calculate time difference between pops
                const currentTime = performance.now();
                let timeDiff = lastPopTime ? (currentTime - lastPopTime) / 1000 : 0;
                lastPopTime = currentTime;

                // Determine multiplier increase based on time difference
                let multiplierIncrease;
                if (timeDiff <= 0.5) {
                    multiplierIncrease = 0.05;
                } else if (timeDiff >= 2) {
                    multiplierIncrease = 0.01;
                } else {
                    // Linear interpolation between 0.05 and 0.01
                    multiplierIncrease = 0.05 - ((timeDiff - 0.5) / (1.5)) * (0.04);
                }

                comboMultiplier += multiplierIncrease;

                updateUI();

                if (circle.radius === minDiameter / 2) {
                    circles.splice(i, 1);
                } else {
                    circle.subdivide(circles, speedIncreaseFactor, minDiameter);
                    circles.splice(i, 1);
                }

                // Update score
                score += 100 * comboMultiplier;
                score = Math.floor(score); // Remove decimal points
                liveScoreDisplay.textContent = score;

                break;
            }
        }

        if (!hit) {
            if (soundsEnabled) {
                missSound.play().catch(error => {
                    console.error('Error playing miss sound:', error);
                });
            }
            comboMultiplier = Math.max(1, comboMultiplier - 0.1);
            missedClicks += 1; // Increment missed clicks count
            updateUI();
        }
    }

    function createParticleEffect(x, y) {
        for (let i = 0; i < 10; i++) {
            const particle = new Particle(x, y);
            particles.push(particle);
        }
    }

    async function endLevel() {
        console.log('Ending level.');
        gameState = 'endLevel';
        cancelAnimationFrame(animationId);
        clearInterval(timerInterval);
        clearInterval(scoreInterval);

        timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        timeElapsedDisplay.textContent = `${timeElapsed}s`;
        levelMusic.pause();
        levelMusic.currentTime = 0;

        // Draw the initial screen with the title image
        drawInitialScreen();

        try {
            await loadLeaderboard(); // Ensure leaderboard is loaded before calculating rank
            const rank = calculateRank(score);

            // Populate endLevelScoreDiv with stats
            endLevelScoreDiv.innerHTML = `
                <p>Your Score: <strong>${score}</strong></p>
                <p>Clicks: <strong>${clickCount}</strong></p>
                <p>Missed Clicks: <strong>${missedClicks}</strong></p>
                <p>Time Elapsed: <strong>${timeElapsed} seconds</strong></p>
                <p>Your Rank: <strong>${rank}</strong></p>
            `;

            // Show the overlay and name form
            showElement(buttonOverlay, 'flex');
            showElement(endLevelScoreDiv, 'block');
            showElement(nameForm, 'flex');
            hideElement(overlayButtons);
            nameFormMessage.textContent = ''; // Clear previous messages

            // Hide Start Game and Rules buttons once the game has begun
            hideElement(startGameButton);
            hideElement(rulesButton);

            console.log(`Level ${level} ended. Ready for score submission.`);
        } catch (error) {
            console.error('Error during endLevel:', error);
            displayMessage('Error ending level. Please try again.', 'error', 'overlayButtonsMessage');
        }
    }

    function calculateRank(currentScore) {
        // Filter leaderboard entries for the current level
        const currentLevelEntries = leaderboard.filter(entry => Number(entry.level) === level);

        // Sort entries by score in descending order
        currentLevelEntries.sort((a, b) => Number(b.score) - Number(a.score));

        // Determine the rank
        let rank = 1;
        for (let entry of currentLevelEntries) {
            if (currentScore < Number(entry.score)) {
                rank++;
            } else {
                break;
            }
        }

        return rank;
    }

    function submitScore(event) {
    event.preventDefault();
    console.log(`submitScore called: current level = ${level}, maxLevel = ${maxLevel}`);

    const playerNameInputValue = playerNameInput.value.trim();

    // Additional validation: Allow only letters, numbers, and spaces
    const nameRegex = /^[A-Za-z0-9 ]+$/;
    if (!nameRegex.test(playerNameInputValue)) {
        displayMessage('Name can only contain letters, numbers, and spaces.', 'error', 'nameFormMessage');
        console.warn('Score submission failed: Invalid characters in player name.');
        return;
    }

    if (!playerNameInputValue) {
        displayMessage('Please enter your name before submitting your score.', 'error', 'nameFormMessage');
        console.warn('Score submission failed: Player name is empty.');
        return;
    }

    // Standardize and limit the player name
    let playerName = standardizeName(playerNameInputValue);
    if (playerName.length > 20) {
        playerName = playerName.substring(0, 20);
    }
    console.log(`Player name entered: ${playerName}`);

    // Create the new leaderboard entry
    const newEntry = {
        name: playerName,
        level: level,
        score: score,
        clicks: clickCount,
        time: timeElapsed,
        missedClicks: missedClicks // Updated field
    };

    // Write the new score to Firebase
    const leaderboardRef = database.ref('leaderboard');
    const newScoreRef = leaderboardRef.push();
    newScoreRef.set(newEntry)
        .then(() => {
            displayMessage('Your score has been added to the leaderboard!', 'success', 'overlayButtonsMessage');
            console.log(`Added new leaderboard entry for ${playerName} at Level ${level}.`);
            
            // After successful submission
            if (level === maxLevel) {
                console.log('Max level reached. Proceeding to endGame.');
                loadLeaderboard().then(() => {
                    console.log('Leaderboard reloaded after submitting max level score.');
                    setTimeout(() => {
                        endGame();
                    }, 2000);
                }).catch(error => {
                    console.error('Error loading leaderboard after submitting score:', error);
                    displayMessage('Error loading leaderboard after submitting score.', 'error', 'overlayButtonsMessage');
                });
            } else {
                // Proceed to next level or try again
                hideElement(nameForm);
                showElement(overlayButtons, 'flex');
                displayMessage('', '', 'nameFormMessage'); // Clear previous messages
            }
        })
        .catch((error) => {
            console.error('Error writing new score to Firebase:', error);
            displayMessage('Error submitting your score. Please try again.', 'error', 'overlayButtonsMessage');
        });
}


    function getTopScoresPerLevel() {
    const topScores = [];
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
        const entriesForLevel = leaderboard.filter(entry => Number(entry.level) === lvl);
        if (entriesForLevel.length > 0) {
            // Sort entries for this level by score descending
            entriesForLevel.sort((a, b) => Number(b.score) - Number(a.score));
            // Get the top entry
            topScores.push(entriesForLevel[0]);
        } else {
            // No entries for this level
            topScores.push({
                level: lvl,
                name: 'N/A',
                score: 'N/A',
                clicks: 'N/A',
                time: 'N/A',
                missedClicks: 'N/A'
            });
        }
    }
    return topScores;
}

    function endGame() {
    console.log('Game completed all levels.');
    gameState = 'endGame';

    // Ensure level is set to maxLevel
    level = maxLevel;
    currentLevelDisplay.textContent = level;
    leaderboardLevelDisplay.textContent = level;

    // Show the overlay
    showElement(buttonOverlay, 'flex');

    // Hide existing elements
    hideElement(endLevelScoreDiv);
    hideElement(nameForm);
    hideElement(overlayButtons);

    // Hide Start Game and Rules buttons
    hideElement(startGameButton);
    hideElement(rulesButton);

    // Create or show the final scoreboard container
    let finalScoreboard = document.getElementById('finalScoreboard');
    if (!finalScoreboard) {
        finalScoreboard = document.createElement('div');
        finalScoreboard.id = 'finalScoreboard';
        finalScoreboard.style.width = '100%';

        const summaryTitle = document.createElement('h2');
        summaryTitle.textContent = 'Top Scores Per Level';
        summaryTitle.style.textAlign = 'center';
        finalScoreboard.appendChild(summaryTitle);

        const summaryMessage = document.createElement('p');
        summaryMessage.textContent = 'Congratulations on completing all 10 levels! Here are the top scores for each level:';
        finalScoreboard.appendChild(summaryMessage);

        // Create a table container to allow content to flow
        const tableContainer = document.createElement('div');
        tableContainer.style.width = '100%'; // Ensure it takes up full width

        const summaryTable = document.createElement('table');
        summaryTable.style.width = '100%';
        summaryTable.style.borderCollapse = 'collapse';
        summaryTable.style.marginBottom = '20px';
        summaryTable.style.tableLayout = 'auto'; // Allow columns to adjust

        // Add CSS class if using external styles
        summaryTable.classList.add('summary-table');

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Level', 'Name', 'Score', 'Clicks', 'Time (s)', 'Missed Clicks'].forEach((text) => {
            const th = document.createElement('th');
            th.textContent = text;
            // Style the header cells
            th.style.border = '1px solid #ccc';
            th.style.padding = '6px 8px';
            th.style.backgroundColor = '#f2f2f2';
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        summaryTable.appendChild(thead);

        const tbody = document.createElement('tbody');

        // **Define topScores here by calling getTopScoresPerLevel()**
        const topScores = getTopScoresPerLevel();

        topScores.forEach(entry => {
            const row = document.createElement('tr');

            const levelCell = document.createElement('td');
            levelCell.textContent = entry.level;
            levelCell.style.border = '1px solid #ccc';
            levelCell.style.padding = '6px 8px';
            row.appendChild(levelCell);

            const nameCell = document.createElement('td');
            nameCell.textContent = entry.name;
            nameCell.style.border = '1px solid #ccc';
            nameCell.style.padding = '6px 8px';
            row.appendChild(nameCell);

            const scoreCell = document.createElement('td');
            scoreCell.textContent = entry.score;
            scoreCell.style.border = '1px solid #ccc';
            scoreCell.style.padding = '6px 8px';
            row.appendChild(scoreCell);

            const clicksCell = document.createElement('td');
            clicksCell.textContent = entry.clicks;
            clicksCell.style.border = '1px solid #ccc';
            clicksCell.style.padding = '6px 8px';
            row.appendChild(clicksCell);

            const timeCell = document.createElement('td');
            timeCell.textContent = entry.time;
            timeCell.style.border = '1px solid #ccc';
            timeCell.style.padding = '6px 8px';
            row.appendChild(timeCell);

            const missedClicksCell = document.createElement('td');
            missedClicksCell.textContent = entry.missedClicks;
            missedClicksCell.style.border = '1px solid #ccc';
            missedClicksCell.style.padding = '6px 8px';
            row.appendChild(missedClicksCell);

            tbody.appendChild(row);
        });

        summaryTable.appendChild(tbody);

        // Append the table to the container and then to the finalScoreboard
        tableContainer.appendChild(summaryTable);
        finalScoreboard.appendChild(tableContainer);

        // Reset Game Button
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset Game';
        resetButton.id = 'finalResetButton';
        resetButton.style.padding = '10px 20px';
        resetButton.style.fontSize = '16px';
        resetButton.style.backgroundColor = '#4CAF50';
        resetButton.style.color = 'white';
        resetButton.style.border = 'none';
        resetButton.style.borderRadius = '5px';
        resetButton.style.cursor = 'pointer';
        resetButton.style.transition = 'background-color 0.3s ease';
        resetButton.addEventListener('click', resetGame);
        resetButton.addEventListener('mouseover', () => {
            resetButton.style.backgroundColor = '#45a049';
        });
        resetButton.addEventListener('mouseout', () => {
            resetButton.style.backgroundColor = '#4CAF50';
        });

        finalScoreboard.appendChild(resetButton);

        // Append the finalScoreboard to overlayContent
        const overlayContent = buttonOverlay.querySelector('#overlayContent');
        overlayContent.appendChild(finalScoreboard);
    } else {
        // If it already exists, just show it
        showElement(finalScoreboard, 'block');
    }

    // Draw the initial screen with the title image
    drawInitialScreen();

    // Play final music
    if (musicEnabled) {
        finalMusic.play().then(() => {
            console.log('Playing final scoreboard music.');
        }).catch(error => {
            console.error('Error playing final music:', error);
        });
    }
}

    function getTopScoresPerLevel() {
        const topScores = [];
        for (let lvl = 1; lvl <= maxLevel; lvl++) {
            const entriesForLevel = leaderboard.filter(entry => Number(entry.level) === lvl);
            if (entriesForLevel.length > 0) {
                // Sort entries for this level by score descending
                entriesForLevel.sort((a, b) => Number(b.score) - Number(a.score));
                // Get the top entry
                topScores.push(entriesForLevel[0]);
            } else {
                // No entries for this level
                topScores.push({
                    level: lvl,
                    name: 'N/A',
                    score: 'N/A',
                    clicks: 'N/A',
                    time: 'N/A',
                    missedClicks: 'N/A'
                });
            }
        }
        return topScores;
    }

    // Load leaderboard from Firebase
    function loadLeaderboard() {
        return new Promise((resolve, reject) => {
            console.log('Loading leaderboard data from Firebase.');
            const leaderboardRef = database.ref('leaderboard');

            leaderboardRef.once('value')
                .then((snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        // Convert the data from an object to an array
                        leaderboard = Object.values(data);
                        console.log('Leaderboard data loaded:', leaderboard);
                    } else {
                        leaderboard = [];
                        console.log('No leaderboard data available.');
                    }
                    if (typeof resolve === 'function') resolve();
                })
                .catch((error) => {
                    console.error('Error loading leaderboard:', error);
                    if (typeof reject === 'function') reject(error);
                });
        });
    }

    function updateLeaderboard() {
        console.log('Updating leaderboard display.');
        leaderboardBody.innerHTML = '';
        leaderboardLevelDisplay.textContent = level;

        // Filter entries for the current level
        const currentLevelEntries = leaderboard.filter(entry => Number(entry.level) === level);

        // Sort entries by score descending
        currentLevelEntries.sort((a, b) => Number(b.score) - Number(a.score));

        // Calculate pagination
        totalPages = Math.ceil(currentLevelEntries.length / entriesPerPage) || 1;
        currentPage = Math.min(currentPage, totalPages); // Adjust current page if necessary
        currentPageSpan.textContent = currentPage;
        totalPagesSpan.textContent = totalPages;

        // Determine the entries for the current page
        const startIndex = (currentPage - 1) * entriesPerPage;
        const endIndex = startIndex + entriesPerPage;
        const entriesToDisplay = currentLevelEntries.slice(startIndex, endIndex);

        if (entriesToDisplay.length === 0) {
            const row = document.createElement('tr');
            const noDataCell = document.createElement('td');
            noDataCell.colSpan = 6; // Updated colspan to match new table structure
            noDataCell.textContent = 'No entries yet for this level.';
            noDataCell.style.textAlign = 'center';
            row.appendChild(noDataCell);
            leaderboardBody.appendChild(row);
        } else {
            entriesToDisplay.forEach((entry, index) => {
                const row = document.createElement('tr');

                const rankCell = document.createElement('td');
                rankCell.textContent = startIndex + index + 1;

                const nameCell = document.createElement('td');
                nameCell.textContent = entry.name;

                const timeCell = document.createElement('td');
                timeCell.textContent = `${entry.time}s`;

                const clicksCell = document.createElement('td');
                clicksCell.textContent = entry.clicks;

                const missedClicksCell = document.createElement('td');
                missedClicksCell.textContent = entry.missedClicks;

                const scoreCell = document.createElement('td');
                scoreCell.textContent = entry.score;

                row.appendChild(rankCell);
                row.appendChild(nameCell);
                row.appendChild(timeCell);
                row.appendChild(clicksCell);
                row.appendChild(missedClicksCell);
                row.appendChild(scoreCell);

                leaderboardBody.appendChild(row);
            });
        }

        // Update pagination buttons
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;

        console.log(`Leaderboard updated. Level ${level} has ${currentLevelEntries.length} entries.`);
    }

    function changePage(newPage) {
        console.log(`Changing to page ${newPage}.`);
        if (newPage < 1 || newPage > totalPages) return;
        currentPage = newPage;
        updateLeaderboard();
    }

    // Reference to the Skip Button
    const skipButton = document.getElementById('skipButton');

    // Event Listener for the Skip Button
    skipButton.addEventListener('click', handleSkip);

    // Function to Handle Skipping Name Entry
    function handleSkip() {
        console.log('Skip button clicked. Proceeding without submitting score.');

        // Hide the name form
        hideElement(nameForm);

        // Clear any previous messages
        displayMessage('', '', 'nameFormMessage');

        // Show overlay buttons (Next Level or Try Again)
        showElement(overlayButtons, 'flex');
    }

    // Reset Scores Function with Password Protection
    function resetScores() {
        const enteredPassword = prompt('Please enter the password to reset the scores:');
        if (enteredPassword === null) {
            // User pressed cancel
            console.log('Reset scores action cancelled by user.');
            return;
        }

        if (enteredPassword === 'ban00bles') {
            // Password is correct
            console.log('Password correct. Resetting scores.');
            // Proceed to reset the scores in Firebase
            database.ref('leaderboard').remove()
                .then(() => {
                    alert('All scores have been reset.');
                    console.log('All scores have been reset in the database.');
                    // Reload the leaderboard to reflect changes
                    loadLeaderboard().then(updateLeaderboard).catch(error => {
                        console.error('Error loading leaderboard after resetting scores:', error);
                        displayMessage('Error loading leaderboard after resetting scores.', 'error', 'overlayButtonsMessage');
                    });
                })
                .catch((error) => {
                    alert('Error resetting scores.');
                    console.error('Error resetting scores:', error);
                });
        } else {
            // Password is incorrect
            alert('Incorrect password. Scores have not been reset.');
            console.warn('Incorrect password entered for resetting scores.');
        }
    }

    function resetGame() {
    console.log('Resetting the game.');

    // Update game state
    gameState = 'idle';

    // Hide confirmation dialog if visible
    hideElement(confirmationDialog);

    // Reset game variables
    level = 1;
    currentLevelDisplay.textContent = level;
    leaderboardLevelDisplay.textContent = level;
    console.log(`Level after reset: ${level}`);
    circles = [];
    particles = [];
    clickCount = 0;
    comboMultiplier = 1;
    score = 0;
    missedClicks = 0;
    currentPage = 1;
    gameStarted = false; // Reset gameStarted flag
    cheatCodePosition = 0; // Reset cheat code position

    // Clear timers and intervals
    if (animationId) cancelAnimationFrame(animationId);
    if (timerInterval) clearInterval(timerInterval);
    if (scoreInterval) clearInterval(scoreInterval);

    // Hide overlays and forms
    hideElement(buttonOverlay);
    hideElement(nameForm);
    hideElement(overlayButtons);

    // Hide the finalScoreboard if it exists
    const finalScoreboard = document.getElementById('finalScoreboard');
    if (finalScoreboard) {
        hideElement(finalScoreboard);
    }

    // Show Start Game and Rules buttons
    showElement(startGameButton, 'block');
    showElement(rulesButton, 'block');

    // Reset overlay content
    endLevelScoreDiv.innerHTML = '';
    nameForm.reset();
    nameFormMessage.textContent = '';
    overlayButtonsMessage.textContent = '';

    // Pause and reset music
    levelMusic.pause();
    levelMusic.currentTime = 0;
    finalMusic.pause();
    finalMusic.currentTime = 0;

    // Reload leaderboard
    loadLeaderboard().then(updateLeaderboard).catch(error => {
        console.error('Error loading leaderboard during game reset:', error);
    });

    // Draw the initial screen with the title image
    drawInitialScreen();

    console.log(`Game reset: level set to ${level}`);
}
    function showConfirmationDialog() {
        console.log('Showing confirmation dialog.');
        showElement(confirmationDialog, 'flex');
    }

    // --- Helper Functions ---

    function standardizeName(name) {
        const trimmedName = name.trim();
        if (trimmedName.length === 0) return '';
        return trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase();
    }

    function displayMessage(message, type, targetId) {
        const messageDiv = document.getElementById(targetId);
        if (messageDiv) {
            messageDiv.textContent = message;
            if (type === 'success') {
                messageDiv.style.color = 'green';
            } else if (type === 'error') {
                messageDiv.style.color = 'red';
            } else if (type === 'info') {
                messageDiv.style.color = 'blue';
            } else {
                messageDiv.style.color = '#333';
            }
        }
    }

    function startNextLevel() {
    if (level < maxLevel) {
        console.log(`Starting next level from Level ${level}.`);
        level++;
        currentLevelDisplay.textContent = level;
        leaderboardLevelDisplay.textContent = level;
        currentPage = 1;
        startGame();

        console.log(`Next level started: level is now ${level}`);
    } else {
        console.log('Max level reached. Proceeding to endGame.');
        endGame();
    }
}

    function tryAgain() {
        console.log(`Trying again on Level ${level}.`);
        // Restart the current level
        startGame();
    }

    // Cheat code handling
    function handleKeyPress(event) {
        if (level === 1 && gameStarted) {
            const key = event.key.toLowerCase();
            if (key === cheatCode[cheatCodePosition]) {
                cheatCodePosition++;
                if (cheatCodePosition === cheatCode.length) {
                    // Cheat code entered successfully
                    console.log('Cheat code entered: Level skip activated.');
                    cheatCodePosition = 0;
                    skipToLevel9End();
                }
            } else {
                cheatCodePosition = 0; // Reset if the sequence breaks
            }
        }
    }

    function skipToLevel9End() {
        // Stop the current level
        cancelAnimationFrame(animationId);
        clearInterval(timerInterval);
        clearInterval(scoreInterval);

        level = 9;
        currentLevelDisplay.textContent = level;
        leaderboardLevelDisplay.textContent = level;
        timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        timeElapsedDisplay.textContent = `${timeElapsed}s`;

        levelMusic.pause();
        levelMusic.currentTime = 0;

        // Draw the initial screen with the title image
        drawInitialScreen();

        // Simulate end of level
        console.log(`Level ${level} skipped to end via cheat code.`);
        showElement(buttonOverlay, 'flex');
        showElement(overlayButtons, 'flex');
        hideElement(nameForm); // Hide name form
        endLevelScoreDiv.innerHTML = `
            <p>Your Score: <strong>${score}</strong></p>
            <p>Clicks: <strong>${clickCount}</strong></p>
            <p>Missed Clicks: <strong>${missedClicks}</strong></p>
            <p>Time Elapsed: <strong>${timeElapsed} seconds</strong></p>
        `;
    }

    // --- Event Listener Assignments ---

    startGameButton.addEventListener('click', () => {
        console.log('Start Game button clicked.');
        startGame();
    });

    rulesButton.addEventListener('click', () => {
        console.log('Rules button clicked.');
        rulesModal.style.display = 'flex';
        if (musicEnabled) {
            introMusic.play().catch(error => {
                console.error('Error playing intro music:', error);
            });
        }
    });

    closeRulesButton.addEventListener('click', () => {
        console.log('Close Rules button clicked.');
        rulesModal.style.display = 'none';
        introMusic.pause(); // Stop the intro music
        introMusic.currentTime = 0; // Reset music
    });

    nextLevelButton.addEventListener('click', startNextLevel);
    tryAgainButton.addEventListener('click', tryAgain);
    resetGameButton.addEventListener('click', showConfirmationDialog);
    resetScoresButton.addEventListener('click', resetScores);
    confirmYesButton.addEventListener('click', () => {
        console.log('Confirm Yes button clicked.');
        hideElement(confirmationDialog);
        resetGame();
    });
    confirmNoButton.addEventListener('click', () => {
        console.log('Confirm No button clicked.');
        hideElement(confirmationDialog);
    });
    canvas.addEventListener('pointerdown', handleCanvasClick);
    nameForm.addEventListener('submit', submitScore);
    prevPageButton.addEventListener('click', () => changePage(currentPage - 1));
    nextPageButton.addEventListener('click', () => changePage(currentPage + 1));

    // Sound Toggle Button Event Listener
    soundToggleButton.addEventListener('click', () => {
        soundsEnabled = !soundsEnabled;
        if (soundsEnabled) {
            // Turn sounds back on
            soundToggleButton.textContent = 'Sound On';
            collisionSound.volume = SOUND_VOLUME;
            clickSound.volume = SOUND_VOLUME;
            missSound.volume = SOUND_VOLUME;
        } else {
            // Mute sounds
            soundToggleButton.textContent = 'Sound Off';
            collisionSound.volume = 0.0;
            clickSound.volume = 0.0;
            missSound.volume = 0.0;
        }
    });

    // Music Toggle Button Event Listener
    musicToggleButton.addEventListener('click', () => {
        musicEnabled = !musicEnabled;
        if (musicEnabled) {
            // Turn music back on
            musicToggleButton.textContent = 'Music On';
            introMusic.volume = INTRO_VOLUME;
            levelMusic.volume = LEVEL_VOLUME;

            // Resume playing music if appropriate
            if (gameState === 'playing' && levelMusic.paused) {
                levelMusic.play().catch(error => {
                    console.error('Error playing level music:', error);
                });
            } else if (gameState !== 'playing' && introMusic.paused && rulesModal.style.display === 'flex') {
                introMusic.play().catch(error => {
                    console.error('Error playing intro music:', error);
                });
            }
        } else {
            // Mute music
            musicToggleButton.textContent = 'Music Off';
            introMusic.pause();
            levelMusic.pause();
        }
    });

    // Keydown event listener for cheat code
    document.addEventListener('keydown', handleKeyPress);

    // Show the start and rules buttons initially
    showElement(startGameButton, 'block');
    showElement(rulesButton, 'block');

    // Load leaderboard on initial page load
    window.addEventListener('load', () => {
        console.log('Page loaded. Initializing game.');
        loadLeaderboard().then(updateLeaderboard).catch(error => {
            console.error('Error loading leaderboard on page load:', error);
        });
        drawInitialScreen();
    });

});
