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

async function cleanupOldEntries() {
    console.log("in cleanup1");
    const cutoff = new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString();
    console.log("in cleanup2");    
    console.log("clean up 2-2");
    const old = await apiFetch(
        `/entries?select=entryid,entrytype,entrydescr,entrydate,entrylocx,entrylocy,numofrep,reportstatus&entrydate=lt.${cutoff}`
        `/entries?select=entrytype,entrydescr,entrydate,entrylocx,entrylocy,numofrep,reportstatus&entrydate=lt.${cutoff}`
    );
    console.log("in cleanup3");    

    if (!old || old.length === 0) return;
    console.log("in cleanup4-2");     
    const res = await apiFetch('/oldentries', {
    const cleaned = old.map(({ entryid, ...rest }) => rest);
    console.log("clean up 3-2");
    await apiFetch('/oldentries', {
        method: 'POST',
        body: JSON.stringify(old)
        body: JSON.stringify(cleaned)
    });
    
    console.log("insert result:", res);
    console.log("in cleanup5");    
    console.log("clean up 4-2");
    await apiFetch(`/entries?entrydate=lt.${cutoff}`, {
        method: 'DELETE'
    });
    console.log("in cleanup6");    
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
    console.log("now going into cleanup");
    cleanupOldEntries().catch(() => {}); 
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
        window.location.href = `add.html?entrylocx=${x}&entrylocy=${y}`;
    });
}

async function loadMapEntries() {
    try {
        setStatus('Loading...', false, 'status');
        const path = '/entries?select=entryid,entrytype,entrylocx,entrylocy&or=(numofrep.lte.5,reportstatus.eq.1)';
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
        marker.href = `detail.html?id=${encodeURIComponent(entry.entryid)}`;
        marker.textContent = entry.entrytype;
        marker.style.left = `${Math.max(0, Math.min(100, entry.entrylocx))}%`;
        marker.style.top = `${Math.max(0, Math.min(100, 100 - entry.entrylocy))}%`;
        marker.title = `${entry.entrytype} (#${entry.entryid})`;
        overlay.appendChild(marker);
    });
}

function initAddPage() {
    const x = getQueryParam('entrylocx');
    const y = getQueryParam('entrylocy');
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
        const type = document.getElementById('entrytype').value;
        const descr = document.getElementById('entrydescr').value.trim();
        if (descr.length < 5) {
            setStatus('Description needs at least 5 characters.', true);
            return;
        }

        setStatus('Saving...', false);
        const body = JSON.stringify([{
            entrytype: type,
            entrydescr: descr,
            entrydate: new Date().toISOString(),
            entrylocx: Number(x),
            entrylocy: Number(y),
            numofrep: 0,
            reportstatus: 0
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
        const path = `/entries?select=entryid,entrytype,entrydescr,entrydate,numofrep&entryid=eq.${encodeURIComponent(id)}`;
        const data = await apiFetch(path);
        const entry = data[0];
        if (!entry) {
            container.innerHTML = '<p class="error">Not found.</p>';
            return;
        }

        container.innerHTML = `
            <div><strong>Type:</strong> ${entry.entrytype}</div>
            <div><strong>Description:</strong> ${entry.entrydescr}</div>
            <div><strong>Date:</strong> ${formatDate(entry.entrydate)}</div>
            <div><strong>Reports:</strong> ${entry.numofrep ?? 0}</div>
        `;

        actions.innerHTML = `<button id="report-button">Report</button>`;
        document.getElementById('report-button').addEventListener('click', function() {
            reportEntry(entry.entryid, entry.numofrep || 0);
        });
        clearStatus();
    } catch (error) {
        setStatus(`Error: ${error.message}`, true);
    }
}

async function reportEntry(entryid, currentReports) {
    try {
        setStatus('Reporting...', false);
        const body = JSON.stringify({ numofrep: currentReports + 1 });
        await apiFetch(`/entries?entryid=eq.${encodeURIComponent(entryid)}`, { method: 'PATCH', body });
        setStatus('Got it. Redirecting...', false);
        setTimeout(() => window.location.href = 'index.html', 1200);
    } catch (error) {
        setStatus(`Error: ${error.message}`, true);
    }
}

async function initListPage() {
    await Promise.all([loadCurrentEntries(), loadoldentries()]);
}

async function loadCurrentEntries() {
    const tableBody = document.querySelector('#current-table tbody');
    const statusElement = 'current-status';
    try {
        setStatus('Loading...', false, statusElement);
        const path = '/entries?select=entryid,entrytype,entrydescr,entrydate,entrylocx,entrylocy,numofrep,reportstatus&order=entryid.asc';
        const entries = await apiFetch(path);
        renderRows(tableBody, entries || []);
        clearStatus(statusElement);
    } catch (error) {
        setStatus(`Error: ${error.message}`, true, statusElement);
    }
}

async function loadoldentries() {
    const tableBody = document.querySelector('#old-table tbody');
    const statusElement = 'old-status';
    try {
        setStatus('Loading...', false, statusElement);
        const path = '/oldentries?select=oldentryid,entrytype,entrydescr,entrydate,entrylocx,entrylocy,numofrep,reportstatus&order=oldentryid.asc';
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
            <td>${isOld ? row.oldentryid : row.entryid}</td>
            <td>${row.entrytype}</td>
            <td>${row.entrydescr}</td>
            <td>${formatDate(row.entrydate)}</td>
            <td>${row.entrylocx}</td>
            <td>${row.entrylocy}</td>
            <td>${row.numofrep ?? 0}</td>
        `;
        body.appendChild(tr);
    });
}
