import React, { useState } from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  persistent?: boolean;
  actions?: { label: string; callback: () => void }[];
  priority?: 'low' | 'medium' | 'high';
}

const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [...prev, notification].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority || 'low'] - priorityOrder[a.priority || 'low']);
    }));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  return (
    <div>
      {notifications.map((notif) => (
        <div key={notif.id} className={`notification ${notif.type}`}>
          <p>{notif.message}</p>
          {notif.actions && notif.actions.map((action, index) => (
            <button key={index} onClick={action.callback}>{action.label}</button>
          ))}
          {!notif.persistent && <button onClick={() => removeNotification(notif.id)}>Dismiss</button>}
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
