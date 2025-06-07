alert("This is a demo of the AI Assistant. Note that this is a limited demo and may make mistakes.");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
localStorage.setItem("user", "Alice");
// Initialize SpeechRecognition if supported
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    console.log("SpeechRecognition API is supported.");
} else {
    console.error("SpeechRecognition API is not supported in this browser.");
}

// Typing effect
function typeMessage(message) {
    const element = document.getElementById("aiMessage");
    if (!element) {
        console.error("AI Message element not found.");
        return;
    }
    element.textContent = "";
    let i = 0;
    const speed = 25;
    function type() {
        if (i < message.length) {
            element.textContent += message.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Text-to-speech with improved voice selection
function speakText(text) {
    // Skip speaking if text contains only "**"
    if (text.trim() === "**") return;

    // Replace {{user}} with real name from localStorage
    let userName = localStorage.getItem("user") || "User";
    const processedText = text.replace(/{{user}}/gi, userName).replace(/\{+\s*user\s*\}+/gi, userName);

    const synth = window.speechSynthesis;
    let voices = synth.getVoices();

    // Function to speak with selected voice
    const speakWithVoice = () => {
        // Try to find a female English voice
        let voice = voices.find(v =>
            v.lang.startsWith("en") &&
            (v.name.toLowerCase().includes("female") ||
             v.name.toLowerCase().includes("woman") ||
             v.name.toLowerCase().includes("her") ||
             v.name.toLowerCase().includes("zira") ||
             v.name.toLowerCase().includes("susan") ||
             v.name.toLowerCase().includes("emma") ||
             v.name.toLowerCase().includes("linda") ||
             v.name.toLowerCase().includes("samantha"))
        );
        // Fallback to any English voice
        if (!voice) {
            voice = voices.find(v => v.lang.startsWith("en"));
        }

        const utterance = new SpeechSynthesisUtterance(processedText);
        utterance.lang = "en-US";
        if (voice) {
            utterance.voice = voice;
            console.log("Selected voice:", voice.name);
        } else {
            console.warn("No English voice found. Using default voice.");
        }
        utterance.rate = 1;
        utterance.pitch = 1.1;
        utterance.volume = 1;
        synth.speak(utterance);
    };

    // If voices are not loaded yet, wait for them
    if (!voices.length) {
        console.log("Voices not loaded yet, waiting...");
        synth.onvoiceschanged = () => {
            voices = synth.getVoices();
            speakWithVoice();
        };
    } else {
        speakWithVoice();
    }
}

// Theme toggle
function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    console.log(`Theme switched to ${newTheme}`);
}

// Load saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    console.log(`Loaded saved theme: ${savedTheme}`);
}

// Main initialization
document.addEventListener("DOMContentLoaded", () => {
    // UI elements
    const micBtn = document.getElementById("micBtn");
    const status = document.getElementById("status");
    const spinner = document.getElementById("spinner");
    const wave = document.getElementById("wave");
    const aiContainer = document.getElementById("aiContainer");

    // Check for missing elements
    if (!micBtn || !status || !spinner || !wave || !aiContainer) {
        console.error("One or more UI elements are missing:", {
            micBtn: !!micBtn,
            status: !!status,
            spinner: !!spinner,
            wave: !!wave,
            aiContainer: !!aiContainer
        });
        return;
    }

    // Handle SpeechRecognition not supported
    if (!recognition) {
        micBtn.disabled = true;
        micBtn.style.opacity = "0.5";
        micBtn.title = "Speech Recognition not supported";
        status.textContent = "Speech Recognition not supported in this browser.";
        console.warn("SpeechRecognition not available, UI updated.");
        return;
    }

    // Theme toggle button
    const themeToggleBtn = document.getElementById("themeToggle");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", toggleTheme);
    } else {
        console.warn("Theme toggle button not found.");
    }

    // Microphone button functionality
    let listening = false;
    micBtn.addEventListener("click", () => {
        if (listening) {
            recognition.stop();
            return;
        }

        listening = true;
        micBtn.classList.add("active");
        status.textContent = "Listening...";
        spinner.style.display = "inline-block";
        wave.style.display = "block";
        console.log("Starting speech recognition...");

        try {
            recognition.start();
        } catch (error) {
            console.error("Error starting recognition:", error);
            status.textContent = "Error starting recognition.";
            listening = false;
            micBtn.classList.remove("active");
            spinner.style.display = "none";
            wave.style.display = "none";
        }
    });

    // Speech recognition events
    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Speech recognized:", transcript);

        try {
            const response = await fetch("/msg", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ msg: transcript }),
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const data = await response.json();
            const reply = data.reply || "Sorry, I didn't understand.";
            console.log("Server reply:", reply);

            typeMessage(reply);
            speakText(reply);
        } catch (error) {
            console.error("Fetch error:", error.message);
            typeMessage("An error occurred while contacting the server.");
            speakText("An error occurred.");
        } finally {
            listening = false;
            micBtn.classList.remove("active");
            status.textContent = "Idle";
            spinner.style.display = "none";
            wave.style.display = "none";
        }
    };

    recognition.onend = () => {
        console.log("Speech recognition ended.");
        listening = false;
        micBtn.classList.remove("active");
        status.textContent = "Idle";
        spinner.style.display = "none";
        wave.style.display = "none";
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "network") {
            typeMessage("Network error: Please check your internet connection.");
            speakText("Network error. Please check your internet connection.");
            status.textContent = "Retrying...";
            setTimeout(() => {
                if (micBtn && !listening) micBtn.click();
            }, 3000);
        } else {
            typeMessage(`Error: ${event.error}`);
            speakText("An error occurred.");
            listening = false;
            micBtn.classList.remove("active");
            status.textContent = "Idle";
            spinner.style.display = "none";
            wave.style.display = "none";
        }
    };

    // 3D Tilt Effect
    document.addEventListener("mousemove", (e) => {
        const rect = aiContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const tiltX = (y / rect.height) * 10;
        const tiltY = -(x / rect.width) * 10;
        aiContainer.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });

    document.addEventListener("mouseleave", () => {
        aiContainer.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    });
});