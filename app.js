// ===== State Management =====
const state = {
    playbooks: [],
    currentAnalysis: null,
    transcription: ''
};

// ===== Navigation =====
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update active view
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(`${viewName}-view`).classList.add('active');
        });
    });
}

// ===== Playbook Management =====
function initPlaybookUpload() {
    const uploadInput = document.getElementById('playbook-upload');
    const uploadZone = document.querySelector('.upload-zone');

    // Click to upload
    uploadInput.addEventListener('change', handlePlaybookFiles);

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--primary-500)';
        uploadZone.style.background = 'rgba(99, 102, 241, 0.05)';
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';

        const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        if (files.length > 0) {
            handlePlaybookFiles({ target: { files } });
        }
    });
}

function handlePlaybookFiles(event) {
    const files = Array.from(event.target.files);

    files.forEach(file => {
        if (file.type === 'application/pdf') {
            const playbook = {
                id: Date.now() + Math.random(),
                name: file.name,
                size: formatFileSize(file.size),
                file: file,
                uploadedAt: new Date()
            };

            state.playbooks.push(playbook);
            addPlaybookToUI(playbook);
        }
    });

    // Reset input
    event.target.value = '';
}

function addPlaybookToUI(playbook) {
    const list = document.getElementById('playbooks-list');

    const item = document.createElement('div');
    item.className = 'playbook-item';
    item.dataset.id = playbook.id;

    item.innerHTML = `
        <div class="playbook-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
            </svg>
        </div>
        <div class="playbook-info">
            <div class="playbook-name">${playbook.name}</div>
            <div class="playbook-size">${playbook.size}</div>
        </div>
        <button class="playbook-delete" onclick="deletePlaybook(${playbook.id})">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
        </button>
    `;

    list.appendChild(item);
}

function deletePlaybook(id) {
    state.playbooks = state.playbooks.filter(p => p.id !== id);
    const item = document.querySelector(`.playbook-item[data-id="${id}"]`);
    if (item) {
        item.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => item.remove(), 300);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===== Transcription Analysis =====
function initTranscriptionAnalysis() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const transcriptionInput = document.getElementById('transcription-input');
    const fileUpload = document.getElementById('file-upload');

    analyzeBtn.addEventListener('click', () => {
        const text = transcriptionInput.value.trim();

        if (!text) {
            alert('Por favor, insira a transcrição da reunião.');
            return;
        }

        if (state.playbooks.length === 0) {
            alert('Por favor, faça upload de pelo menos um playbook antes de analisar.');
            return;
        }

        analyzeTranscription(text);
    });

    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                transcriptionInput.value = event.target.result;
            };
            reader.readAsText(file);
        }
    });
}

async function analyzeTranscription(text) {
    const analyzeBtn = document.getElementById('analyze-btn');
    const originalHTML = analyzeBtn.innerHTML;

    // Show loading state
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<div class="loading"></div> Analisando com IA...';

    try {
        // Extract text from playbooks
        const playbookContents = await extractPlaybookTexts();

        // Call Gemini API
        const analysis = await analyzeWithGemini(text, playbookContents);
        state.currentAnalysis = analysis;

        // Update UI
        renderDashboard(analysis);

        // Switch to dashboard view
        document.querySelector('[data-view="dashboard"]').click();
    } catch (error) {
        console.error('Erro na análise:', error);
        alert('Erro ao analisar a reunião: ' + error.message);
    } finally {
        // Reset button
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalHTML;
    }
}

async function extractPlaybookTexts() {
    const contents = [];

    for (const playbook of state.playbooks) {
        try {
            // For PDFs, we'll extract a summary/metadata
            // In a real implementation, you'd use a PDF parsing library
            // For now, we'll just use the filename as context
            contents.push({
                name: playbook.name,
                content: `Playbook: ${playbook.name}`
            });
        } catch (error) {
            console.error(`Erro ao processar ${playbook.name}:`, error);
        }
    }

    return contents;
}

async function analyzeWithGemini(transcription, playbooks) {
    const API_KEY = 'AIzaSyC987HTopzfXyzf0v948gAOB8lBlP_9_jc';
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

    // Build context from playbooks
    const playbookContext = playbooks.map(p => p.name).join(', ');

    // Create structured prompt
    const prompt = `Você é um especialista em análise de reuniões de vendas e consultoria. Analise a seguinte transcrição de reunião com base nas melhores práticas de vendas e nos playbooks disponíveis.

PLAYBOOKS DISPONÍVEIS: ${playbookContext}

TRANSCRIÇÃO DA REUNIÃO:
${transcription}

Por favor, forneça uma análise estruturada em formato JSON com a seguinte estrutura EXATA:

{
  "meetingType": "tipo da reunião (ex: Vendas, Consultoria, Suporte, Onboarding)",
  "objective": "objetivo principal da reunião em uma frase",
  "duration": "duração estimada",
  "metrics": {
    "Conhecimento Técnico": <número de 0-100>,
    "Rapport": <número de 0-100>,
    "Estratégia em Marketplaces": <número de 0-100>,
    "Comunicação Clara": <número de 0-100>,
    "Resolução de Problemas": <número de 0-100>
  },
  "feedback": [
    {
      "category": "nome da categoria",
      "issue": "descrição do problema identificado",
      "suggestion": "sugestão específica de melhoria com referência ao playbook",
      "timestamp": "momento aproximado (ex: 00:15:30)",
      "severity": "warning ou critical"
    }
  ]
}

IMPORTANTE:
- Avalie cada métrica de 0 a 100 baseado na performance observada
- Identifique 3-5 pontos de melhoria específicos
- Para cada ponto, forneça uma sugestão acionável
- Mencione qual playbook seria relevante para cada sugestão
- Use "warning" para problemas moderados e "critical" para problemas graves
- Retorne APENAS o JSON, sem texto adicional antes ou depois`;

    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        }
    };

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract the generated text
    const generatedText = data.candidates[0].content.parts[0].text;

    // Parse JSON from the response
    let analysis;
    try {
        // Remove markdown code blocks if present
        const jsonText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysis = JSON.parse(jsonText);
    } catch (error) {
        console.error('Erro ao parsear JSON:', error);
        console.log('Resposta recebida:', generatedText);
        throw new Error('Erro ao processar resposta da IA. Por favor, tente novamente.');
    }

    // Calculate overall score
    const metricsValues = Object.values(analysis.metrics);
    analysis.overallScore = Math.round(metricsValues.reduce((a, b) => a + b, 0) / metricsValues.length);
    analysis.analyzedAt = new Date();

    return analysis;
}


// ===== Dashboard Rendering =====
function renderDashboard(analysis) {
    // Update meeting info
    document.getElementById('meeting-info').textContent =
        `${analysis.meetingType} • ${analysis.objective} • Score: ${analysis.overallScore}/100`;

    // Render chart
    renderChart(analysis.metrics);

    // Render feedback
    renderFeedback(analysis.feedback);
}

function renderChart(metrics) {
    const canvas = document.getElementById('performance-chart');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart data
    const labels = Object.keys(metrics);
    const values = Object.values(metrics);
    const maxValue = 100;

    // Colors
    const colors = [
        { fill: 'rgba(99, 102, 241, 0.2)', stroke: 'rgba(99, 102, 241, 1)' },
        { fill: 'rgba(139, 92, 246, 0.2)', stroke: 'rgba(139, 92, 246, 1)' },
        { fill: 'rgba(16, 185, 129, 0.2)', stroke: 'rgba(16, 185, 129, 1)' },
        { fill: 'rgba(245, 158, 11, 0.2)', stroke: 'rgba(245, 158, 11, 1)' },
        { fill: 'rgba(239, 68, 68, 0.2)', stroke: 'rgba(239, 68, 68, 1)' }
    ];

    // Calculate positions
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / labels.length;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        // Draw Y-axis labels
        ctx.fillStyle = '#6b6b85';
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText((100 - i * 20).toString(), padding - 10, y + 4);
    }

    // Draw area chart
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);

    values.forEach((value, index) => {
        const x = padding + barWidth * index + barWidth / 2;
        const y = padding + chartHeight - (value / maxValue) * chartHeight;

        if (index === 0) {
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.lineTo(padding + chartWidth, height - padding);
    ctx.closePath();

    // Fill area with gradient
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    values.forEach((value, index) => {
        const x = padding + barWidth * index + barWidth / 2;
        const y = padding + chartHeight - (value / maxValue) * chartHeight;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw points
    values.forEach((value, index) => {
        const x = padding + barWidth * index + barWidth / 2;
        const y = padding + chartHeight - (value / maxValue) * chartHeight;

        // Outer circle
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#6366f1';
        ctx.fill();

        // Inner circle
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#1e1e30';
        ctx.fill();
    });

    // Draw X-axis labels
    ctx.fillStyle = '#a0a0b8';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        const x = padding + barWidth * index + barWidth / 2;
        const words = label.split(' ');
        words.forEach((word, wordIndex) => {
            ctx.fillText(word, x, height - padding + 20 + wordIndex * 15);
        });
    });

    // Update legend
    updateLegend(metrics, colors);
}

function updateLegend(metrics, colors) {
    const legend = document.getElementById('chart-legend');
    legend.innerHTML = '';

    Object.entries(metrics).forEach(([label, value], index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const color = colors[index % colors.length];

        item.innerHTML = `
            <div class="legend-color" style="background: ${color.stroke}"></div>
            <span class="legend-label">${label}:</span>
            <span class="legend-value">${value}/100</span>
        `;

        legend.appendChild(item);
    });
}

function renderFeedback(feedbackItems) {
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = '';

    if (feedbackItems.length === 0) {
        feedbackList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                <p>Excelente! Nenhum ponto crítico de melhoria identificado.</p>
            </div>
        `;
        return;
    }

    feedbackItems.forEach(item => {
        const feedbackItem = document.createElement('div');
        feedbackItem.className = `feedback-item ${item.severity}`;

        feedbackItem.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-timestamp">${item.timestamp}</span>
                <span class="feedback-category">${item.category}</span>
            </div>
            <div class="feedback-issue">${item.issue}</div>
            <div class="feedback-suggestion">💡 ${item.suggestion}</div>
        `;

        feedbackList.appendChild(feedbackItem);
    });
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPlaybookUpload();
    initTranscriptionAnalysis();

    console.log('Meeting Analysis Dashboard initialized ✨');
});

// Make deletePlaybook available globally
window.deletePlaybook = deletePlaybook;
