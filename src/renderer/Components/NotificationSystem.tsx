import React, { useState } from 'react';
import { Box, Alert, Button } from '@mui/material';

interface Notification {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  action?: () => void;
  actionText?: string;
}

interface NotificationConfig {
  priority: 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'connectivity';
  autoHide?: boolean;
  duration?: number;
  actions?: Array<{
    label: string;
    handler: () => void;
  }>;
}

const priorityLevel = {
  high: 1,
  medium: 2,
  low: 3,
};

const useNotificationState = () => {
  const [notificationQueue, setNotificationQueue] = useState<
    Array<Notification & NotificationConfig>
  >([]);

  const addNotification = (notification: Notification & NotificationConfig) => {
    setNotificationQueue(prev => [...prev, notification].sort((a, b) =>
      priorityLevel[a.priority] - priorityLevel[b.priority]
    ));
  };

  const removeNotification = (index: number) => {
    setNotificationQueue(prev => prev.filter((_, i) => i !== index));
  };

  return { notificationQueue, addNotification, removeNotification };
};

const NotificationSystem: React.FC = () => {
  const { notificationQueue, addNotification, removeNotification } = useNotificationState();

  return (
    <Box className="notification-container">
      {notificationQueue.map((notification, index) => (
        <Alert
          key={index}
          severity={notification.type}
          className={`notification-${notification.priority}`}
          onClose={() => removeNotification(index)}
        >
          {notification.message}
          {notification.actions?.map((action, actionIndex) => (
            <Button
              key={actionIndex}
              onClick={action.handler}
              size="small"
              color="inherit"
            >
              {action.label}
            </Button>
          ))}
        </Alert>
      ))}
    </Box>
  );
};

export default NotificationSystem;
