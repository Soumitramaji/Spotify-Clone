let currentSongIndex = 0;
let currentSong = new Audio();
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
    currFolder = folder.replace(/\/+$/, "");
    let a = await fetch(`http://127.0.0.1:3000/${folder}/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");
    songs = [];

    // Default artist
    let artist = "Unknown Artist";

    // Load artist info from info.json
    try {
        let res = await fetch(`${currFolder}/info.json`);
        if (res.ok) {
            let info = await res.json();
            if (info.artist) artist = info.artist;
        }
    } catch (e) {
        console.warn("No info.json found in", currFolder);
    }

    // Collect songs
    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.toLowerCase().endsWith(".mp3")) {
            const url = new URL(element.href);
            const fileName = decodeURIComponent(url.pathname.split("/").pop());
            songs.push(fileName);
        }
    }

    // Update UI
    let songUL = document.querySelector(".songlist ul");
    songUL.innerHTML = "";

    for (const song of songs) {
        let displayName = decodeURIComponent(song);

        // Remove slashes or backslashes
        displayName = displayName.split("/").pop().split("\\").pop();

        // Remove .mp3 for display only
        if (displayName.toLowerCase().endsWith(".mp3")) {
            displayName = displayName.slice(0, -4);
        }

        songUL.innerHTML += `
            <li data-filename="${song}">
                <img class="invert" src="music.svg" alt="">
                <div class="info">
                    <div>${displayName}</div>
                    <div>${artist}</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="play.svg" alt="">
                </div>
            </li>`;
    }

    // Attach click listeners
    Array.from(songUL.getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            const actualFilename = e.dataset.filename;
            playMusic(actualFilename);
        });
    });

    return songs;
}

const playMusic = (track, pause = false) => {
    currentSongIndex = songs.findIndex(s => s === track || decodeURIComponent(s) === track);

    // Clean up path
    track = track.split("/").pop().split("\\").pop();
    currentSong.src = `${currFolder}/${encodeURIComponent(track)}`;

    if (!pause) {
        currentSong.play();
        play.src = "pause.svg";
    }

    let displayName = decodeURIComponent(track);
    if (displayName.toLowerCase().endsWith(".mp3")) {
        displayName = displayName.slice(0, -4);
    }

    document.querySelector(".songinfo").innerHTML = displayName;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";

    // Highlight current song
    document.querySelectorAll(".songlist ul li").forEach(li => li.classList.remove("playing"));

    const songItems = document.querySelectorAll(".songlist ul li");

    // Highlight the correct one
    if (songItems[currentSongIndex]) {
        songItems[currentSongIndex].classList.add("playing");
    // Auto-scroll into view
        songItems[currentSongIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        console.warn("No matching <li> to highlight at index", currentSongIndex);
    }

};


async function displayAlbums() {
    let a = await fetch(`http://127.0.0.1:3000/songs/`)
    let response = await a.text();
    let div = document.createElement("div")
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a")
    let cardContainer = document.querySelector(".cardContainer")
    let array = Array.from(anchors)
    for (let index = 0; index < array.length; index++) {
        const anchor = array[index];

        // Decode and normalize the link
        const decodedHref = decodeURIComponent(anchor.getAttribute("href")).replace(/\\/g, "/");

        // Match only folders directly under songs
        const match = decodedHref.match(/\/songs\/([^\/]+)\//);
        if (!match) continue; // Skip if it doesn't match expected structure

        const folder = match[1];

        try {
            const res = await fetch(`http://127.0.0.1:3000/songs/${folder}/info.json`);
            const info = await res.json();

            cardContainer.innerHTML += `
            <div data-folder="${folder}" class="card">
                <div class="play">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"
                        color="#000000" fill="none">
                        <path
                            d="M18.8906 12.846C18.5371 14.189 16.8667 15.138 13.5257 17.0361C10.296 18.8709 8.6812 19.7884 7.37983 19.4196C6.8418 19.2671 6.35159 18.9776 5.95624 18.5787C5 17.6139 5 15.7426 5 12C5 8.2574 5 6.3861 5.95624 5.42132C6.35159 5.02245 6.8418 4.73288 7.37983 4.58042C8.6812 4.21165 10.296 5.12907 13.5257 6.96393C16.8667 8.86197 18.5371 9.811 18.8906 11.154C19.0365 11.7084 19.0365 12.2916 18.8906 12.846Z"
                            stroke="currentColor" fill="#000" stroke-width="1.5" stroke-linejoin="round"></path>
                    </svg>
                </div>
                <img src="/songs/${folder}/cover.jpg" alt="">
                <h2>${info.title}</h2>
                <p>${info.description}</p>
            </div>
        `;
        } catch (err) {
            console.error(`Failed to load info.json for folder ${folder}`, err);
        }
    }


    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`)
            playMusic(songs[0])
        })
    })
}

async function main() {

    // get the list of all the songs

    await getSongs("songs/arijit")
    playMusic(songs[0], true)

    // display all the albums on the page    

    await displayAlbums()

    // attach an event listener to play

    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play()
            play.src = "pause.svg"
        }
        else {
            currentSong.pause()
            play.src = "play.svg"
        }
    })

    // listen for timeupdate event

    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%"
    })

    //  Auto play next song when current ends
    
    currentSong.addEventListener("ended", () => {
        if (currentSongIndex < songs.length - 1) {
            currentSongIndex += 1;
            playMusic(songs[currentSongIndex]);
        } else {
            play.src = "play.svg"; // Reset play button
        }
    });

    // add an event listener to seekbar

    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100
    })

    // add an event listener for hamburger

    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })

    // add an event listener for close button

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })

    // add an event listener to next and previous

    next.addEventListener("click", () => {
        currentSong.pause();
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        playMusic(songs[currentSongIndex]);
    });

    previous.addEventListener("click", () => {
        currentSong.pause();
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        playMusic(songs[currentSongIndex]);
    });

    // add an event listener to volume

    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100
        if (currentSong.volume > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg")
        }
    })

    //add event listener to mute the track

    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = e.target.src.replace("volume.svg", "mute.svg")
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else {
            e.target.src = e.target.src.replace("mute.svg", "volume.svg")
            currentSong.volume = .1;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }
    })

}
main()
