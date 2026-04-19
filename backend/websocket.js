// WebSocket server for real-time notifications
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> WebSocket connection
    this.setup();
  }

  setup() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket connection');

      // Extract token from query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      let userId = null;

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.userId || decoded.id;
          this.clients.set(userId, ws);
          console.log(`✅ Authenticated WebSocket connection for user ${userId}`);
        } catch (err) {
          console.log('❌ Invalid WebSocket token');
          ws.close(1008, 'Invalid token');
          return;
        }
      } else {
        // Allow anonymous connections for public notifications
        const anonymousId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.clients.set(anonymousId, ws);
        userId = anonymousId;
        console.log(`🔓 Anonymous WebSocket connection ${anonymousId}`);
      }

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to SewaKhoj real-time notifications',
        timestamp: new Date().toISOString()
      }));

      // Handle messages from client
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(message, userId, ws);
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.clients.delete(userId);
        console.log(`🔌 WebSocket disconnected: ${userId}`);
      });

      // Handle errors
      ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err);
        this.clients.delete(userId);
      });
    });

    // Broadcast system status every minute
    setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        connectedClients: this.clients.size
      });
    }, 60000);
  }

  handleMessage(message, userId, ws) {
    console.log(`📨 Message from ${userId}:`, message.type);

    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'subscribe':
        // Subscribe to specific channels
        const channels = message.channels || [];
        ws.subscribedChannels = channels;
        ws.send(JSON.stringify({
          type: 'subscribed',
          channels,
          timestamp: new Date().toISOString()
        }));
        break;

      case 'booking_status':
        // Forward booking status updates to relevant workers
        if (message.workerId) {
          this.sendToUser(message.workerId, {
            type: 'booking_update',
            bookingId: message.bookingId,
            status: message.status,
            message: message.message,
            timestamp: new Date().toISOString()
          });
        }
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  // Send message to specific user
  sendToUser(userId, data) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  // Broadcast to all connected clients
  broadcast(data) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  // Send notification to all workers of a specific service
  notifyServiceWorkers(service, data) {
    // In a real implementation, you would query the database for workers in this service
    // For now, broadcast to all clients with a service filter
    this.broadcast({
      ...data,
      targetService: service
    });
  }

  // Send new booking notification
  sendNewBookingNotification(booking, assignedWorkerId) {
    const notification = {
      type: 'new_booking',
      bookingId: booking._id,
      customerName: booking.full_name,
      service: booking.service,
      preferredDate: booking.preferred_date,
      preferredTime: booking.preferred_time,
      message: `New booking request for ${booking.service}`,
      timestamp: new Date().toISOString()
    };

    // Send to specific worker if assigned
    if (assignedWorkerId) {
      this.sendToUser(assignedWorkerId, notification);
    } else {
      // Broadcast to all workers of that service
      this.notifyServiceWorkers(booking.service, notification);
    }

    // Also notify admin
    this.sendToUser('admin', notification);
  }

  // Send payment confirmation
  sendPaymentConfirmation(bookingId, amount, customerId) {
    const notification = {
      type: 'payment_confirmed',
      bookingId,
      amount,
      message: `Payment of Rs. ${amount} confirmed`,
      timestamp: new Date().toISOString()
    };

    // Notify customer
    this.sendToUser(customerId, notification);

    // Notify admin
    this.sendToUser('admin', notification);
  }

  // Get connection stats
  getStats() {
    return {
      connectedClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.keys()).filter(k => !k.startsWith('anonymous_')).length,
      anonymousClients: Array.from(this.clients.keys()).filter(k => k.startsWith('anonymous_')).length
    };
  }
}

module.exports = WebSocketServer;