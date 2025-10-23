const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loading = document.getElementById('loading');
const imageInput = document.getElementById('imageInput');
const csvFileInput = document.getElementById('csvFileInput');
const csvURL = document.getElementById('csvURL');

let currentImage = null;
let currentCSV = null;

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      currentImage = reader.result;
      appendImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }
});

csvFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      currentCSV = btoa(reader.result);
      appendMessage('user', `📊 Uploaded CSV: ${file.name}`);
    };
    reader.readAsBinaryString(file);
  }
});

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message && !currentImage && !currentCSV && !csvURL.value) return;

  appendMessage('user', message || 'Ask about uploaded file...');
  userInput.value = '';
  loading.style.display = 'block';

  const formData = new FormData();
  formData.append('message', message);
  if (currentImage) {
    const blob = await fetch(currentImage).then(r => r.blob());
    formData.append('image', blob, 'upload.png');
  }
  if (currentCSV) formData.append('csvFile', currentCSV);
  if (csvURL.value) formData.append('csvURL', csvURL.value);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    appendMessage('assistant', data.reply);
    if (data.image) appendImagePreview(data.image);
    if (data.csvSummary) renderCSVSummary(data.csvSummary);
  } catch (err) {
    appendMessage('assistant', `Error: ${err.message}`);
  } finally {
    loading.style.display = 'none';
    currentImage = null;
    currentCSV = null;
    csvURL.value = '';
    imageInput.value = '';
    csvFileInput.value = '';
  }
}

function appendMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `<div>${marked.parse(content)}</div><div class="timestamp">${new Date().toLocaleTimeString()}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendImagePreview(src) {
  const img = document.createElement('img');
  img.src = src;
  img.style.maxHeight = '200px';
  const lastUserMsg = document.querySelector('.message.user:last-child');
  if (lastUserMsg) {
    lastUserMsg.appendChild(img);
  }
}

function renderCSVSummary(summary) {
  let html = `<p><strong>CSV Summary:</strong> ${summary.totalRows} rows, ${summary.headers.length} columns</p>`;
  if (summary.stats && Object.keys(summary.stats).length > 0) {
    html += `<table><tr><th>Column</th><th>Min</th><th>Max</th><th>Mean</th><th>Missing</th></tr>`;
    Object.entries(summary.stats).forEach(([col, s]) => {
      html += `<tr><td>${col}</td><td>${s.min.toFixed(2)}</td><td>${s.max.toFixed(2)}</td><td>${s.mean.toFixed(2)}</td><td>${s.missing}</td></tr>`;
    });
    html += `</table>`;
  }
  if (summary.missingByCol[0].missing > 0) {
    html += `<p><strong>Most missing:</strong> ${summary.missingByCol[0].column} (${summary.missingByCol[0].missing})</p>`;
  }
  appendMessage('assistant', html);
}

// Load marked.js for markdown
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
document.head.appendChild(script);