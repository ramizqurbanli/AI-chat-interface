const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const backendUrl = 'http://127.0.0.1:8000/chat';

// Format content with proper escaping and support
// Format content with code blocks and LaTeX
function formatContent(content) {
  try {
      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      
      // Temporary storage
      const codeBlocks = [];
      const latexBlocks = [];
      
      // Preserve code blocks
      const withCodePreserved = text.replace(/```([\s\S]*?)```/g, (match, code) => {
          codeBlocks.push(code.trim());
          return `\x1BCODE${codeBlocks.length - 1}\x1B`;
      });

      // Preserve LaTeX
      const withLatexPreserved = withCodePreserved.replace(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g, (match) => {
          latexBlocks.push(match);
          return `\x1BLATEX${latexBlocks.length - 1}\x1B`;
      });

      // Escape HTML
      const escaped = withLatexPreserved
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

      // Markdown formatting for bold, italic, and bold-italic
      const withMarkdownFormatting = escaped
          // Bold: **text** or __text__
          .replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')
          // Italic: *text* or _text_
          .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>')
          // Bold-Italic: ***text*** or ___text___ or **_text_** or __*text*__
          .replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>')
          .replace(/(\*\*_|__\*)(.*?)(_\*\*|\*__)/g, '<strong><em>$2</em></strong>');

      // Restore code blocks
      const withCodeRestored = withMarkdownFormatting.replace(/\x1BCODE(\d+)\x1B/g, (_, index) => {
          const code = codeBlocks[index];
          return `<pre><code>${code}</code></pre>`;
      });

      // Restore LaTeX
      const withLatexRestored = withCodeRestored.replace(/\x1BLATEX(\d+)\x1B/g, (_, index) => {
          const latex = latexBlocks[index];
          return latex.startsWith('$$') 
              ? `<div class="math-display">${latex.slice(2, -2)}</div>`
              : `<span class="math-inline">${latex.slice(1, -1)}</span>`;
      });

      return withLatexRestored;
  } catch (error) {
      console.error('Content formatting error:', error);
      return `<div class="error">Formatting error: ${error.message}</div>`;
  }
}

// Append message with copy buttons
function appendMessage(content, isUser = false) {
  const messageDiv = document.createElement('div');
  const currentTime = new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
  });

  messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  try {
      if (!isUser) {
          contentDiv.innerHTML = formatContent(content);
          renderMath(contentDiv);
          hljs.highlightAll();

          // Add copy buttons to code blocks
          contentDiv.querySelectorAll('pre').forEach(pre => {
              const code = pre.querySelector('code');
              if (!code) return;
              
              const button = document.createElement('button');
              button.className = 'copy-button';
              button.innerHTML = `
                  <svg width="14" height="14" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2 2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1z"/>
                  </svg>
              `;
              
              button.addEventListener('click', () => {
                  navigator.clipboard.writeText(code.textContent).then(() => {
                      button.classList.add('copied');
                      setTimeout(() => button.classList.remove('copied'), 2000);
                  }).catch(err => console.error('Copy failed:', err));
              });

              pre.style.position = 'relative';
              pre.appendChild(button);
          });
      } else {
          contentDiv.textContent = content;
      }
  } catch (error) {
      console.error('Message rendering error:', error);
      contentDiv.innerHTML = `<div class="error">
          <p>⚠️ Display error</p>
          <pre>${content}</pre>
      </div>`;
  }

  const timeSpan = document.createElement('span');
  timeSpan.className = 'time';
  timeSpan.textContent = currentTime;

  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(timeSpan);
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}
// KaTeX rendering with error recovery
function renderMath(container) {
    container.querySelectorAll('.math-display, .math-inline').forEach(elem => {
        try {
            katex.render(elem.textContent, elem, {
                throwOnError: false,
                displayMode: elem.classList.contains('math-display'),
                strict: false
            });
        } catch (e) {
            elem.innerHTML = elem.textContent;
            elem.classList.add('math-error');
        }
    });
}

// Robust API communication
async function sendMessage(message) {
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ message }),
        });

        const data = await response.json().catch(() => ({
            error: 'Invalid JSON response'
        }));

        const responseContent = typeof data?.response === 'string' 
            ? data.response 
            : JSON.stringify(data, null, 2);

        appendMessage(responseContent, false);
    } catch (error) {
        console.error('API Error:', error);
        appendMessage(`Error: ${error.message}`, false);
    }
}
// Event listeners with debouncing
let isSending = false;

sendBtn.addEventListener('click', async () => {
    if (isSending) return; // Prevent multiple clicks while sending
    isSending = true; // Set flag to indicate sending is in progress
    
    const message = chatInput.value.trim();
    if (!message) {
        isSending = false; // Reset the flag if the message is empty
        return;
    }

    chatInput.value = ''; // Clear the input field
    appendMessage(message, true); // Append the user's message to the chat
    
    try {
        await sendMessage(message); // Send the message
    } catch (error) {
        console.error('Send Error:', error);
        appendMessage('Failed to send message', false); // Show error message in chat
    } finally {
        isSending = false; // Reset the flag after sending (success or failure)
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent default behavior (e.g., newline)
        sendBtn.click(); // Trigger the send button click
    }
});
// Initialize chat
window.addEventListener('DOMContentLoaded', () => {
    appendMessage('Hello! How can I assist you today?', false);
});