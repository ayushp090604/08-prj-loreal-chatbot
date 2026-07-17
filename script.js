/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendButton = document.getElementById("sendBtn");

// Use your deployed Cloudflare Worker URL if you have one.
// Otherwise, paste your own OpenAI key into secrets.js for local testing.
const workerUrl = (window.LOREAL_WORKER_URL || "").trim();
const directApiKey = (window.OPENAI_API_KEY || "").trim();
const placeholderUrl = "https://loreal-chatbot.your-subdomain.workers.dev/";

const systemPrompt = `You are the L'Oréal Beauty Assistant. Help with L'Oréal skincare, makeup, haircare, fragrance, and beauty routines. Keep answers short, friendly, and helpful. If a question is unrelated to L'Oréal products, routines, recommendations, or beauty topics, politely refuse and redirect the conversation back to beauty and L'Oréal guidance.`;

const conversation = [{ role: "system", content: systemPrompt }];
const userProfile = { name: "" };
const maxHistoryTurns = 8;

function addMessage(role, content) {
  const messageBox = document.createElement("div");
  messageBox.className = `msg ${role}`;

  const label = document.createElement("strong");
  label.textContent = role === "user" ? "You:" : "L'Oréal Assistant:";

  const text = document.createElement("span");
  text.textContent = content;

  messageBox.appendChild(label);
  messageBox.appendChild(document.createTextNode(" "));
  messageBox.appendChild(text);
  chatWindow.appendChild(messageBox);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addQuestionPreview(question) {
  const preview = document.createElement("div");
  preview.className = "reply-preview";
  preview.textContent = `You asked: ${question}`;
  chatWindow.appendChild(preview);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function updateSystemPrompt() {
  let prompt = systemPrompt;

  if (userProfile.name) {
    prompt += ` The user's name is ${userProfile.name}. Use it naturally when appropriate.`;
  }

  prompt +=
    " Keep track of earlier questions and details from this conversation.";
  conversation[0] = { role: "system", content: prompt };
}

function rememberUserDetails(message) {
  const nameMatch = message.match(/my name is ([a-zA-ZÀ-ÿ\- ]+)/i);

  if (nameMatch && !userProfile.name) {
    userProfile.name = nameMatch[1].trim();
  }

  updateSystemPrompt();
}

function trimConversationHistory() {
  const extraMessages = conversation.length - 1 - maxHistoryTurns * 2;

  if (extraMessages > 0) {
    conversation.splice(1, extraMessages);
  }
}

function setLoading(isLoading) {
  userInput.disabled = isLoading;
  sendButton.disabled = isLoading;
  userInput.placeholder = isLoading
    ? "Thinking…"
    : "Ask me about products or routines…";
}

// Show a welcome message when the page loads.
addMessage(
  "ai",
  "Hello! I can help you explore L'Oréal skincare, makeup, haircare, and fragrance recommendations. What would you like to discover today?",
);

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  addMessage("user", message);
  userInput.value = "";
  setLoading(true);

  try {
    rememberUserDetails(message);
    conversation.push({ role: "user", content: message });
    trimConversationHistory();

    let response;
    let data;

    if (workerUrl && workerUrl !== placeholderUrl) {
      response = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation,
        }),
      });
      data = await response.json();
    } else if (directApiKey) {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${directApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          messages: conversation,
          max_completion_tokens: 300,
        }),
      });
      data = await response.json();
    } else {
      throw new Error(
        "Add your Cloudflare Worker URL or OpenAI API key to secrets.js before sending a message.",
      );
    }

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        data?.error ||
        "The assistant could not respond.";
      throw new Error(errorMessage);
    }

    const reply =
      data.choices?.[0]?.message?.content ||
      "Sorry, I could not generate a response right now.";

    addQuestionPreview(message);
    addMessage("ai", reply);
    conversation.push({ role: "assistant", content: reply });
    trimConversationHistory();
  } catch (error) {
    console.error(error);
    addMessage(
      "ai",
      "Sorry, I could not reach the assistant right now. Please try again in a moment.",
    );
  } finally {
    setLoading(false);
    userInput.focus();
  }
});
