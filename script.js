let currentSongIndex = 0;
let currentSong = new Audio();
let songs = [];
let currFolder = "";
let albums = [];

// Utility: convert seconds → MM:SS
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");
    return `${formattedMinutes}:${formattedSeconds}`;
}

// Load the songs list for a given folder AND update the left‐library list
async function getSongs(folder) {
    currFolder = folder.replace(/\/+$/, "");
    songs = [];
    let artist = "Unknown Artist";

    // Try info.json first (if present)
    try {
        const res = await fetch(`${currFolder}/info.json`);
        if (res.ok) {
            const info = await res.json();
            if (info.artist) artist = info.artist;
            if (Array.isArray(info.songs)) {
                songs = info.songs;
            }
        }
    } catch (err) {
        console.warn("info.json not found in folder:", currFolder);
    }

    // If no songs found via info.json, try fallback: use albums manifest if available
    const matchingAlbum = albums.find(a => (`songs/${a.folder}`) === currFolder);
    if (songs.length === 0 && matchingAlbum) {
        songs = matchingAlbum.songs.slice(); // copy
        artist = matchingAlbum.artist || artist;
    }

    // Populate the HTML list
    const songUL = document.querySelector(".songlist ul");
    songUL.innerHTML = "";

    songs.forEach(songFile => {
        const displayName = decodeURIComponent(songFile.replace(/\.mp3$/i, ""));
        const li = document.createElement("li");
        li.setAttribute("data-filename", songFile);
        li.innerHTML = `
            <img class="invert" src="music.svg" alt="music icon">
            <div class="info">
                <div>${displayName}</div>
                <div>${artist}</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="play.svg" alt="play">
            </div>
        `;
        li.addEventListener("click", () => {
            playMusic(songFile);
        });
        songUL.appendChild(li);
    });

    return songs;
}

// Play a specific track from current songs
function playMusic(track, pause = false) {
    currentSongIndex = songs.findIndex(s => (s === track || decodeURIComponent(s) === track));
    if (currentSongIndex < 0) {
        currentSongIndex = 0;
    }

    // Clean up path
    const cleanTrack = track.split("/").pop().split("\\").pop();
    currentSong.src = `${currFolder}/${encodeURIComponent(cleanTrack)}`;

    if (!pause) {
        currentSong.play();
        document.getElementById("play").src = "pause.svg";
    }

    let displayName = decodeURIComponent(cleanTrack);
    if (displayName.toLowerCase().endsWith(".mp3")) {
        displayName = displayName.slice(0, -4);
    }
    document.querySelector(".songinfo").innerHTML = displayName;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";

    // Highlight current song in the list
    const songItems = document.querySelectorAll(".songlist ul li");
    songItems.forEach(li => li.classList.remove("playing"));
    if (songItems[currentSongIndex]) {
        songItems[currentSongIndex].classList.add("playing");
        songItems[currentSongIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

// Display album cards based on albums.json
async function displayAlbums() {
    try {
        const res = await fetch("albums.json");
        if (!res.ok) throw new Error("albums.json not found");
        albums = await res.json();
    } catch (err) {
        console.error("Could not load albums.json:", err);
        return;
    }

    const cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = "";

    albums.forEach(album => {
        const folder = album.folder;
        const cover = album.cover || `songs/${folder}/cover.jpg`;
        const title = album.title || folder;
        const description = album.description || "";

        const card = document.createElement("div");
        card.className = "card";
        card.setAttribute("data-folder", folder);
        card.innerHTML = `
            <div class="play">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
                    <path d="M18.8906 12.846C18.5371 14.189 16.8667 15.138 13.5257 17.0361C10.296 18.8709 8.6812 19.7884 7.37983 19.4196C6.8418 19.2671 6.35159 18.9776 5.95624 18.5787C5 17.6139 5 15.7426 5 12C5 8.2574 5 6.3861 5.95624 5.42132C6.35159 5.02245 6.8418 4.73288 7.37983 4.58042C8.6812 4.21165 10.296 5.12907 13.5257 6.96393C16.8667 8.86197 18.5371 9.811 18.8906 11.154C19.0365 11.7084 19.0365 12.2916 18.8906 12.846Z" stroke="currentColor" fill="#000" stroke-width="1.5" stroke-linejoin="round"></path>
                </svg>
            </div>
            <img src="${cover}" alt="${title} cover">
            <h2>${title}</h2>
            <p>${description}</p>
        `;
        cardContainer.appendChild(card);

        // Click listener
        card.addEventListener("click", async () => {
            const folderPath = `songs/${folder}`;
            await getSongs(folderPath);
            if (songs.length > 0) {
                playMusic(songs[0]);
            }

            // Optionally update cover image in some UI spot if you have
            const albumCoverElem = document.querySelector(".album-cover");
            if (albumCoverElem) {
                albumCoverElem.src = cover;
            }
        });
    });
}

// Main initialisation
async function main() {
    // Load default album (first one)
    await displayAlbums();
    if (albums.length > 0) {
        const firstFolder = `songs/${albums[0].folder}`;
        await getSongs(firstFolder);
        if (songs.length > 0) {
            playMusic(songs[0], true); // pass true so it loads but doesn't autoplay
        }
    }

    // Play/pause click
    document.getElementById("play").addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            document.getElementById("play").src = "pause.svg";
        } else {
            currentSong.pause();
            document.getElementById("play").src = "play.svg";
        }
    });

    // Time update
    currentSong.addEventListener("timeupdate", () => {
        const timeElem = document.querySelector(".songtime");
        timeElem.innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        const circleElem = document.querySelector(".circle");
        circleElem.style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Song ended => next
    currentSong.addEventListener("ended", () => {
        if (currentSongIndex < songs.length - 1) {
            currentSongIndex += 1;
            playMusic(songs[currentSongIndex]);
        } else {
            document.getElementById("play").src = "play.svg";
        }
    });

    // Seek bar click
    document.querySelector(".seekbar").addEventListener("click", e => {
        const width = e.currentTarget.getBoundingClientRect().width;
        const percent = (e.offsetX / width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    });

    // Hamburger (open library)
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    // Close library
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    // Next / Previous buttons
    document.getElementById("next").addEventListener("click", () => {
        currentSong.pause();
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        playMusic(songs[currentSongIndex]);
    });
    document.getElementById("previous").addEventListener("click", () => {
        currentSong.pause();
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        playMusic(songs[currentSongIndex]);
    });

    // Volume slider
    const volumeInput = document.querySelector(".range input");
    volumeInput.addEventListener("change", e => {
        currentSong.volume = parseFloat(e.target.value) / 100;
        if (currentSong.volume > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg");
        }
    });

    // Mute/unmute
    document.querySelector(".volume>img").addEventListener("click", e => {
        const img = e.target;
        if (img.src.includes("volume.svg")) {
            img.src = img.src.replace("volume.svg", "mute.svg");
            currentSong.volume = 0;
            volumeInput.value = 0;
        } else {
            img.src = img.src.replace("mute.svg", "volume.svg");
            currentSong.volume = 0.1;
            volumeInput.value = 10;
        }
    });
}

main();
