import React, { useState } from 'react';
import { Box, Alert, Button } from '@mui/material';

interface Notification {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  action?: () => void;
  actionText?: string;
}

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  return (
    <Box className="notification-container">
      {notifications.map((notification) => (
        <Alert
          severity={notification.type}
          action={
            <Button color="inherit" size="small" onClick={notification.action}>
              {notification.actionText}
            </Button>
          }
        >
          {notification.message}
        </Alert>
      ))}
    </Box>
  );
};

export default NotificationSystem;
