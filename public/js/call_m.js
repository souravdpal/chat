// Hina Voice Assistant Frontend JS (Working with /msghome API)

alert("This is a demo of the AI Assistant. Note that this is a limited demo and may make mistakes.");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
localStorage.getItem("user")
localStorage.getItem("name")

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    console.log("SpeechRecognition API is supported.");
} else {
    console.error("SpeechRecognition API is not supported in this browser.");
}

function typeMessage(message) {
    const element = document.getElementById("aiMessage");
    if (!element) return console.error("AI Message element not found.");
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

function speakText(text) {
    if (text.trim() === "**" && text.trim()==="*" && text.replace({user} , localStorage.getItem('name'))) return;
    const userName = localStorage.getItem("user") || "User";
    const processedText = text.replace(/\{\{user\}\}/gi, userName);

    const synth = window.speechSynthesis;
    let voices = synth.getVoices();

    const speakWithVoice = () => {
        let voice = voices.find(v => v.lang.startsWith("en") &&
            ["female", "woman", "her", "zira", "susan", "emma", "linda", "samantha"].some(keyword => v.name.toLowerCase().includes(keyword)));
        if (!voice) voice = voices.find(v => v.lang.startsWith("en"));

        const utterance = new SpeechSynthesisUtterance(processedText);
        utterance.lang = "en-US";
        if (voice) utterance.voice = voice;
        utterance.rate = 1;
        utterance.pitch = 1.1;
        utterance.volume = 1;
        synth.speak(utterance);
    };

    if (!voices.length) {
        synth.onvoiceschanged = () => {
            voices = synth.getVoices();
            speakWithVoice();
        };
    } else {
        speakWithVoice();
    }
}

function toggleTheme() {
    const root = document.documentElement;
    const newTheme = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    console.log(`Theme switched to ${newTheme}`);
}

const savedTheme = localStorage.getItem("theme");
if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

document.addEventListener("DOMContentLoaded", () => {
    const micBtn = document.getElementById("micBtn");
    const status = document.getElementById("status");
    const spinner = document.getElementById("spinner");
    const wave = document.getElementById("wave");
    const aiContainer = document.getElementById("aiContainer");
    const themeToggleBtn = document.getElementById("themeToggle");

    if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);
    if (!micBtn || !status || !spinner || !wave || !aiContainer) return;
    if (!recognition) {
        micBtn.disabled = true;
        micBtn.title = "Speech Recognition not supported";
        return;
    }

    let listening = false;
    micBtn.addEventListener("click", () => {
        if (listening) return recognition.stop();
        listening = true;
        micBtn.classList.add("active");
        status.textContent = "Listening...";
        spinner.style.display = "inline-block";
        wave.style.display = "block";
        recognition.start();
    });

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        const name = localStorage.getItem("name");
        const user = localStorage.getItem("user");
        console.log("Speech recognized:", transcript);

        try {
            const response = await fetch("/msghome?" + new URLSearchParams({ msg: transcript, name, user }), {
                method: "GET"
            });

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
        typeMessage(`Error: ${event.error}`);
        speakText("An error occurred.");
        listening = false;
        micBtn.classList.remove("active");
        status.textContent = "Idle";
        spinner.style.display = "none";
        wave.style.display = "none";
    };

    document.addEventListener("mousemove", (e) => {
        const rect = aiContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        aiContainer.style.transform = `perspective(1000px) rotateX(${(y / rect.height) * 10}deg) rotateY(${-(x / rect.width) * 10}deg)`;
    });

    document.addEventListener("mouseleave", () => {
        aiContainer.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    });
});