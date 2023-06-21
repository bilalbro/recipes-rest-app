const API_URL = `http://${location.hostname}:3001`;

export async function getRequest(path) {
    const result = await fetch(API_URL + path);
    return await result.json();
}

export async function postRequest(path, body) {
    try {
        return await (await fetch(
            API_URL + path,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: typeof body === 'object' ? JSON.stringify(body) : body
            }
        )).json();
    }
    catch (e) {}
}

export async function putRequest(path, body) {
    await fetch(
        API_URL + path,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }
    );
}

export async function deleteRequest(path) {
    await fetch(
        API_URL + path,
        {
            method: 'DELETE'
        }
    );
}