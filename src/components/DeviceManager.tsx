import React, { useState } from 'react';

interface Device {
  id: string;
  name: string;
  category: string;
  tags: string[];
  favorite: boolean;
  notes: string;
  history: { date: string; change: string }[];
}

const DeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);

  const addTag = (deviceId: string, tag: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, tags: [...device.tags, tag] } : device
      )
    );
  };

  const toggleFavorite = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, favorite: !device.favorite } : device
      )
    );
  };

  const addNote = (deviceId: string, note: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, notes: note } : device
      )
    );
  };

  const addHistory = (deviceId: string, change: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? { ...device, history: [...device.history, { date: new Date().toISOString(), change }] }
          : device
      )
    );
  };

  return (
    <div>
      <h2>Gestión de Dispositivos</h2>
      <ul>
        {devices.map((device) => (
          <li key={device.id}>
            <h3>{device.name}</h3>
            <p>Categoría: {device.category}</p>
            <p>Etiquetas: {device.tags.join(', ')}</p>

            <p>Favorito: {device.favorite ? 'Sí' : 'No'}</p>
            <p>Notas: {device.notes}</p>
            <p>Historial de cambios:</p>
            <ul>
              {device.history.map((entry, index) => (
                <li key={index}>{entry.date}: {entry.change}</li>
              ))}
            </ul>
            <button onClick={() => toggleFavorite(device.id)}>Toggle Favorite</button>
            <button onClick={() => addTag(device.id, 'new-tag')}>Add Tag</button>
            <button onClick={() => addNote(device.id, 'new note')}>Add Note</button>
            <button onClick={() => addHistory(device.id, 'new change')}>Add History</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DeviceManager;
