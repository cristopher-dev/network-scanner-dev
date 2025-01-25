import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Device {
  name: string;
  status: string;
}

const LiveMonitor: React.FC = () => {
  const [data, setData] = useState<Array<{ time: string; latency: number }>>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Device[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulación de datos en tiempo real
      const newData = { time: new Date().toLocaleTimeString(), latency: Math.random() * 100 };
      setData((prev) => [...prev, newData].slice(-20));

      // Monitoreo de dispositivos
      const newDevices: any[] | ((prevState: Device[]) => Device[]) = [
        /* lógica para obtener dispositivos activos */
      ];
      setDevices(newDevices);

      // Alertas automáticas
      const newAlerts = newDevices.filter((device) => device.status === 'offline');
      setAlerts(newAlerts);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Monitoreo en Tiempo Real</h2>
      <LineChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="latency" stroke="#8884d8" />
      </LineChart>
      <div>
        <h3>Dispositivos Activos</h3>
        <ul>
          {devices.map((device, index) => (
            <li key={index}>
              {device.name} - {device.status}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Alertas</h3>
        <ul>
          {alerts.map((alert, index) => (
            <li key={index}>{alert.name} está offline</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LiveMonitor;
