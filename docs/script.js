const SUPABASE_URL = "https://thcaddvxtnhpumqhyxsu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_N2d3qVdYaUYU6ajEdSSTog_rAB0DKgH";
const API_BASE = `${SUPABASE_URL}/rest/v1`;

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "return=minimal"
    };
}

async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: getHeaders(),
        ...options
    });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
        throw new Error(body?.message || `${response.status} ${response.statusText}`);
    }
    return body;
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function setStatus(message, isError = false, elementId = 'status') {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.textContent = message;
    target.className = isError ? 'status error' : 'status success';
}

function clearStatus(elementId = 'status') {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.textContent = '';
    target.className = 'status';
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function initIndexPage() {
    const map = document.getElementById('map');
    const overlay = document.getElementById('marker-layer');

    loadMapEntries();

    map.addEventListener('click', function(event) {
        if (event.target.classList.contains('marker')) {
            return;
        }
        const rect = map.getBoundingClientRect();
        const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(100 - ((event.clientY - rect.top) / rect.height) * 100);
        window.location.href = `add.html?entryLocX=${x}&entryLocY=${y}`;
    });
}

async function loadMapEntries() {
    try {
        setStatus('Loading...', false, 'status');
        const path = '/entries?select=entryID,entryType,entryLocX,entryLocY&or=(numOfRep.lte.5,reportStatus.eq.1)';
        const entries = await apiFetch(path);
        renderMapEntries(entries || []);
        clearStatus('status');
    } catch (error) {
        setStatus(`Error: ${error.message}`, true, 'status');
    }
}

function renderMapEntries(entries) {
    const overlay = document.getElementById('marker-layer');
    if (!overlay) return;
    overlay.innerHTML = '';
    entries.forEach(entry => {
        const marker = document.createElement('a');
        marker.className = 'marker';
        marker.href = `detail.html?id=${encodeURIComponent(entry.entryID)}`;
        marker.textContent = entry.entryType;
        marker.style.left = `${Math.max(0, Math.min(100, entry.entryLocX))}%`;
        marker.style.top = `${Math.max(0, Math.min(100, 100 - entry.entryLocY))}%`;
        marker.title = `${entry.entryType} (#${entry.entryID})`;
        overlay.appendChild(marker);
    });
}

function initAddPage() {
    const x = getQueryParam('entryLocX');
    const y = getQueryParam('entryLocY');
    const coords = document.getElementById('coords');
    const submitButton = document.getElementById('submit-button');

    if (!x || !y) {
        coords.textContent = 'Please select a location on the map first.';
        submitButton.disabled = true;
        return;
    }

    coords.textContent = `Selected location: X=${x}, Y=${y}`;
    const form = document.getElementById('add-form');
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        await submitNewEntry(x, y);
    });
}

async function submitNewEntry(x, y) {
    try {
        const type = document.getElementById('entryType').value;
        const descr = document.getElementById('entryDescr').value.trim();
        if (descr.length < 5) {
            setStatus('Description needs at least 5 characters.', true);
            return;
        }

        setStatus('Saving...', false);
        const body = JSON.stringify([{
            entryType: type,
            entryDescr: descr,
            entryDate: new Date().toISOString(),
            entryLocX: Number(x),
            entryLocY: Number(y),
            numOfRep: 0,
            reportStatus: 0
        }]);
        await apiFetch('/entries', { method: 'POST', body });
        window.location.href = 'index.html';
    } catch (error) {
        setStatus(`Error: ${error.message}`, true);
    }
}

async function initDetailPage() {
    const id = getQueryParam('id');
    const container = document.getElementById('entry-detail');
    const actions = document.getElementById('detail-actions');
    if (!id) {
        container.innerHTML = '<p class="error">No ID.</p>';
        return;
    }

    try {
        setStatus('Loading...', false);
        const path = `/entries?select=entryID,entryType,entryDescr,entryDate,numOfRep&entryID=eq.${encodeURIComponent(id)}`;
        const data = await apiFetch(path);
        const entry = data[0];
        if (!entry) {
            container.innerHTML = '<p class="error">Not found.</p>';
            return;
        }

        container.innerHTML = `
            <div><strong>Type:</strong> ${entry.entryType}</div>
            <div><strong>Description:</strong> ${entry.entryDescr}</div>
            <div><strong>Date:</strong> ${formatDate(entry.entryDate)}</div>
            <div><strong>Reports:</strong> ${entry.numOfRep ?? 0}</div>
        `;

        actions.innerHTML = `<button id="report-button">Report</button>`;
        document.getElementById('report-button').addEventListener('click', function() {
            reportEntry(entry.entryID, entry.numOfRep || 0);
        });
        clearStatus();
    } catch (error) {
        setStatus(`Error: ${error.message}`, true);
    }
}

async function reportEntry(entryId, currentReports) {
    try {
        setStatus('Reporting...', false);
        const body = JSON.stringify({ numOfRep: currentReports + 1 });
        await apiFetch(`/entries?entryID=eq.${encodeURIComponent(entryId)}`, { method: 'PATCH', body });
        setStatus('Got it. Redirecting...', false);
        setTimeout(() => window.location.href = 'index.html', 1200);
    } catch (error) {
        setStatus(`Error: ${error.message}`, true);
    }
}

async function initListPage() {
    await Promise.all([loadCurrentEntries(), loadOldEntries()]);
}

async function loadCurrentEntries() {
    const tableBody = document.querySelector('#current-table tbody');
    const statusElement = 'current-status';
    try {
        setStatus('Loading...', false, statusElement);
        const path = '/entries?select=entryID,entryType,entryDescr,entryDate,entryLocX,entryLocY,numOfRep,reportStatus&order=entryID.asc';
        const entries = await apiFetch(path);
        renderRows(tableBody, entries || []);
        clearStatus(statusElement);
    } catch (error) {
        setStatus(`Error: ${error.message}`, true, statusElement);
    }
}

async function loadOldEntries() {
    const tableBody = document.querySelector('#old-table tbody');
    const statusElement = 'old-status';
    try {
        setStatus('Loading...', false, statusElement);
        const path = '/oldEntries?select=oldEntryID,entryType,entryDescr,entryDate,entryLocX,entryLocY,numOfRep,reportStatus&order=oldEntryID.asc';
        const entries = await apiFetch(path);
        renderRows(tableBody, entries || [], true);
        clearStatus(statusElement);
    } catch (error) {
        setStatus(`Error: ${error.message}`, true, statusElement);
    }
}

function renderRows(body, rows, isOld = false) {
    body.innerHTML = '';
    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="7">No entries found.</td></tr>`;
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${isOld ? row.oldEntryID : row.entryID}</td>
            <td>${row.entryType}</td>
            <td>${row.entryDescr}</td>
            <td>${formatDate(row.entryDate)}</td>
            <td>${row.entryLocX}</td>
            <td>${row.entryLocY}</td>
            <td>${row.numOfRep ?? 0}</td>
        `;
        body.appendChild(tr);
    });
}
