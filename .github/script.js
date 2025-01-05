alert(
  "          بەخێربێن\nبەهیوای سوود وەرگرتن\nئەم ماڵپەرە لەژێرچاککردنە \nدروستکراوە لە لایەن \n          ئەندازیار\n رامان عمر حسن کۆیی"
);
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");

// API setup
const API_KEY = "YOUR_API_KEY_HERE";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null,
  },
};

// Create message element with dynamic classes and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Generate bot response using API
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: userData.message },
            ...(userData.file.data ? [{ inline_data: userData.file }] : []),
          ],
        },
      ],
    }),
  };

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    const apiResponseText = data.candidates[0].content.parts[0].text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .trim();
    messageElement.innerText = apiResponseText;
  } catch (error) {
    console.error(error);
    messageElement.innerText = error.message;
    messageElement.style.color = "#ff0000";
  } finally {
    userData.file = {};
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
};

// Handle outgoing user messages
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value = "";
  fileUploadWrapper.classList.remove("file-uploaded");

  const messageContent = `<div class="message-text"></div>
  ${
    userData.file.data
      ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />`
      : ""
  }`;
  const outgoingMessageDiv = createMessageElement(
    messageContent,
    "user-message"
  );
  outgoingMessageDiv.querySelector(".message-text").textContent =
    userData.message;
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  setTimeout(() => {
    const incomingMessageDiv = createMessageElement(
      `</svg><div class="message-text"><div class="thinking-indicator">
      <div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`,
      "bot-message",
      "thinking"
    );
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(incomingMessageDiv);
  }, 600);
};

// Handle Enter key press for sending message
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.value.trim()) {
    handleOutgoingMessage(e);
  }
});

// Handle file input change and preview selected file
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  if (file.type === "image/heic" || file.type === "image/heif") {
    const convertedData = await convertHeicToJpeg(file);
    if (convertedData) {
      userData.file = {
        data: convertedData.base64String,
        mime_type: "image/jpeg",
      };
      fileUploadWrapper.querySelector(
        "img"
      ).src = `data:image/jpeg;base64,${convertedData.base64String}`;
    } else {
      console.error("Failed to convert HEIC image.");
      return;
    }
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result.split(",")[1];
      fileUploadWrapper.querySelector("img").src = e.target.result;
      fileUploadWrapper.classList.add("file-uploaded");

      userData.file = {
        data: base64String,
        mime_type: file.type,
      };
      fileInput.value = "";
    };
    reader.readAsDataURL(file);
  }
});

// Convert HEIC format to JPEG base64 (uses heic2any library)
async function convertHeicToJpeg(heicFile) {
  try {
    const blob = await heic2any({ blob: heicFile, toType: "image/jpeg" });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ base64String: reader.result.split(",")[1] });
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting HEIC image:", error);
    return null;
  }
}

// Cancel file upload
fileCancelButton.addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-uploaded");
});

// Initializing emoji picker
const picker = new EmojiMart.Picker({
  theme: "auto",
  searchPosition: "google",
  skinTonePosition: "preview",
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if (e.target.id === "emoji-picker") {
      document.body.classList.toggle("show-emoji-picker");
    } else {
      document.body.classList.remove("show-emoji-picker");
    }
  },
});

document.querySelector(".chat-form").appendChild(picker);
sendMessageButton.addEventListener("click", handleOutgoingMessage);
document
  .querySelector("#file-upload")
  .addEventListener("click", () => fileInput.click());
