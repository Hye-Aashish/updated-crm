(function () {
    const currentScript = document.currentScript || (function () {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    })();
    const scriptSrc = currentScript.src;
    const token = new URLSearchParams(new URL(scriptSrc).search).get('token');

    if (!token) {
        console.error("Chat Widget: No token found.");
        return;
    }

    const API_BASE = new URL(scriptSrc).origin; // Dynamically get backend URL
    let socket;
    let widgetConfig = null;
    let conversationId = localStorage.getItem(`chat_conversation_${token}`);

    // Load Socket.io client script dynamically if not present
    if (typeof io === 'undefined') {
        const socketScript = document.createElement('script');
        socketScript.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
        socketScript.onload = initWidget;
        document.head.appendChild(socketScript);
    } else {
        initWidget();
    }

    async function initWidget() {
        try {
            const response = await fetch(`${API_BASE}/api/chat/widget-config/${token}`);
            if (!response.ok) throw new Error('Failed to load widget config');
            widgetConfig = await response.json();

            createWidgetUI();
            setupSocket();
        } catch (error) {
            console.error(error);
        }
    }

    function setupSocket() {
        socket = io(API_BASE);

        socket.on('connect', () => {
            console.log('Connected to chat server');
            if (conversationId) {
                socket.emit('visitor_join', { conversationId });
            }
        });

        socket.on('admin_message', (msg) => {
            addMessage(msg.message, 'admin');
            toggleChat(true); // Auto open on admin reply
        });
    }

    function createWidgetUI() {
        // Styles
        const style = document.createElement('style');
        style.innerHTML = `
            #crm-chat-widget-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            #crm-chat-button {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background-color: ${widgetConfig.primary_color};
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            #crm-chat-button:hover {
                transform: scale(1.1);
            }
            #crm-chat-button svg {
                width: 30px;
                height: 30px;
                fill: white;
            }
            #crm-chat-window {
                position: absolute;
                bottom: 80px;
                right: 0;
                width: 350px;
                height: 500px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 5px 40px rgba(0,0,0,0.16);
                display: none;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
            }
            #crm-chat-window.open {
                display: flex;
                opacity: 1;
                transform: translateY(0);
            }
            .chat-header {
                background: ${widgetConfig.primary_color};
                padding: 15px;
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .chat-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                background: #f9fafb;
            }
            .message {
                margin-bottom: 10px;
                max-width: 80%;
                padding: 10px 14px;
                border-radius: 18px;
                font-size: 14px;
                line-height: 1.4;
            }
            .message.visitor {
                background: ${widgetConfig.primary_color};
                color: white;
                margin-left: auto;
                border-bottom-right-radius: 4px;
            }
            .message.admin {
                background: #e5e7eb;
                color: #1f2937;
                margin-right: auto;
                border-bottom-left-radius: 4px;
            }
            .chat-input {
                padding: 15px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 10px;
            }
            .chat-input input {
                flex: 1;
                padding: 10px;
                border: 1px solid #e5e7eb;
                border-radius: 20px;
                outline: none;
            }
            .chat-input button {
                background: ${widgetConfig.primary_color};
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 20px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);

        // Container
        const container = document.createElement('div');
        container.id = 'crm-chat-widget-container';

        // Button
        const button = document.createElement('div');
        button.id = 'crm-chat-button';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        `;
        button.onclick = () => toggleChat();

        // Window
        const window = document.createElement('div');
        window.id = 'crm-chat-window';
        window.innerHTML = `
            <div class="chat-header">
                <span style="font-weight:bold">${widgetConfig.widget_name || 'Support'}</span>
                <span style="font-size:12px;opacity:0.8">Online</span>
                <span style="cursor:pointer" onclick="document.getElementById('crm-chat-window').classList.remove('open')">&times;</span>
            </div>
            <div class="chat-messages" id="crm-chat-messages">
                <div class="message admin">Hello! How can we help you today?</div>
            </div>
            <div class="chat-input conversation-starter">
                <input type="text" placeholder="Type a message..." id="crm-chat-input" />
                <button id="crm-chat-send">Send</button>
            </div>
        `;

        container.appendChild(window);
        container.appendChild(button);
        document.body.appendChild(container);

        // Event listeners
        document.getElementById('crm-chat-send').onclick = sendMessage;
        document.getElementById('crm-chat-input').onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage();
        };
    }

    function toggleChat(forceOpen = false) {
        const window = document.getElementById('crm-chat-window');
        if (forceOpen || !window.classList.contains('open')) {
            window.classList.add('open');
        } else {
            window.classList.remove('open');
        }
    }

    function sendMessage() {
        const input = document.getElementById('crm-chat-input');
        const message = input.value.trim();
        if (!message) return;

        addMessage(message, 'visitor');
        input.value = '';

        // Emit to socket
        // If no conversationId, create one first or handle on server "first message"
        if (!conversationId) {
            socket.emit('start_conversation', { token, message }, (response) => {
                conversationId = response.conversationId;
                localStorage.setItem(`chat_conversation_${token}`, conversationId);
            });
        } else {
            socket.emit('visitor_message', { conversationId, message });
        }
    }

    function addMessage(text, sender) {
        const messagesDiv = document.getElementById('crm-chat-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.textContent = text;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
})();
