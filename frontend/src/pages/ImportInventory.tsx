import { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../components/AuthProvider';

const ImportInventory = () => {
  const { token } = useAuth();
  const [payload, setPayload] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(payload);
      const result = await apiFetch(
        '/api/import-inventory',
        {
          method: 'POST',
          body: JSON.stringify({ inventory: parsed })
        },
        token
      );
      setMessage(`Imported ${result.imported} holdings.`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setPayload(text);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Import inventory</h1>
          <p>Paste or upload your Steam inventory JSON to create holdings.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card stack">
        <label className="file-input">
          Upload JSON file
          <input type="file" accept="application/json" onChange={handleFile} />
        </label>
        <textarea
          rows={10}
          placeholder="Paste inventory JSON here"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
        <button className="btn primary" type="submit">
          Import
        </button>
      </form>
    </div>
  );
};

export default ImportInventory;
