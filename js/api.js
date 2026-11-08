// API local: SQLite é acessado SOMENTE pelo backend Node.js.
export async function api(path, { method = 'GET', data } = {}) {
    const response = await fetch(`/api${path}`, {
        method,
        headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
        body: data === undefined ? undefined : JSON.stringify(data),
        cache: 'no-store'
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Falha HTTP ${response.status}`);
    return payload;
}
