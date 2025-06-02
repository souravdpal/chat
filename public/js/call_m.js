alert("This is a demo of the AI Assistant. For full functionality, so it can make mistakes.");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
} else {
    console.error("SpeechRecognition API is not supported in this browser.");
    // Fallback UI update
    document.addEventListener("DOMContentLoaded", () => {
        const status = document.getElementById("status");
        if (status) {
            status.textContent = "Speech Recognition not supported in this browser.";
        }
        const micBtn = document.getElementById("micBtn");
        if (micBtn) {
            micBtn.disabled = true;
            micBtn.style.opacity = "0.5";
            micBtn.title = "Speech Recognition not supported";
        }
    });
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

// Text-to-speech
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
}

// Theme toggle
function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
}

// Load saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
}

// UI elements
// Enhanced speakText: fluent, natural female voice, skip "**", replace {{user}} with real name
function speakText(text) {
    // Skip speaking if text contains only "**"
    if (text.trim() === "**") return;

    // Replace {{user}} with real name from localStorage
    let userName = localStorage.getItem("user") || "User";
    const processedText = text.replace(/{{user}}/gi, userName).replace(/\{+\s*user\s*\}+/gi, userName);

    // Find a natural female English voice
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    // If voices are not loaded yet, wait and retry
    if (!voices.length) {
        synth.onvoiceschanged = () => speakText(processedText);
        return;
    }
    // Try to find a female English voice
    let voice = voices.find(v =>
        v.lang.startsWith("en") &&
        (v.name.toLowerCase().includes("female") ||
         v.name.toLowerCase().includes("woman") ||
         v.name.toLowerCase().includes("her") ||
         v.name.toLowerCase().includes("zira") || // common female voice
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
    if (voice) utterance.voice = voice;
    utterance.rate = 1; // Normal speed
    utterance.pitch = 1.1; // Slightly higher for natural female
    utterance.volume = 1;
    synth.speak(utterance);
}
document.addEventListener("DOMContentLoaded", () => {
    const micBtn = document.getElementById("micBtn");
    const status = document.getElementById("status");
    const spinner = document.getElementById("spinner");
    const wave = document.getElementById("wave");
    let listening = false;

    if (!micBtn || !status || !spinner || !wave) {
        console.error("One or more UI elements are missing.");
        return;
    }

    // Disable mic button if recognition is not available
    if (!recognition) {
        micBtn.disabled = true;
        micBtn.style.opacity = "0.5";
        micBtn.title = "Speech Recognition not supported";
        if (status) {
            status.textContent = "Speech Recognition not supported in this browser.";
        }
        return;
    }

    // Microphone button click
    if (recognition) {
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

        // On speech result
        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;

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

                typeMessage(reply);
                speakText(reply);
            } catch (error) {
                console.error("Fetch error:", error);
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
                setTimeout(() => micBtn.click(), 3000); // Retry after 3 seconds
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
    }
});

// 3D Tilt Effect
document.addEventListener("DOMContentLoaded", () => {
    const aiContainer = document.getElementById("aiContainer");
    if (!aiContainer) {
        console.error("AI Container element not found.");
        return;
    }

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