# Real Time Chat!

Hey! Here's a modern, full-stack real-time chat application built with React, Socket.IO, Express, PostgreSQL, and Redis. Features user authentication, room-based messaging, and rate limiting.

## 🚀 Features

- **Real-time messaging** with Socket.IO
- **User authentication** with JWT tokens
- **Room-based chat** with join/leave functionality
- **Rate limiting** (10 messages/min, 5 joins/min per user)
- **Redis caching** for session management (a little)
- **PostgreSQL** for persistent message storage
- **Docker Compose** for easy deployment
- **TypeScript** throughout the stack
- **Tailwind CSS** for styling

## 🏗️ Architecture

(Remember to put Excalidraw diagram here)

### Installation

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **React Router v7** for routing
- **Socket.IO Client** for real-time communication
- **Tailwind CSS** for styling
- **Vite** for development and building

### Backend
- **Express.js** with TypeScript
- **Socket.IO** for real-time communication
- **Prisma ORM** for database operations
- **JWT** for authentication
- **bcrypt** for password hashing
- **Redis** for rate limiting and caching

### Infrastructure
- **PostgreSQL** for data persistence
- **Redis** for caching and rate limiting
- **Docker Compose** for containerization

## 📦 Prerequisites

- **Docker** and **Docker Compose**
- **Node.js 18+** (for local development)
- **Bun** (recommended package manager)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd BackendChatApp/vite-project
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DB_URL=postgresql://postgres:postgres@postgres:5432/chatapp

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
PORT=3000
NODE_ENV=production
```

### 3. Start with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🗄️ Database Setup

The application automatically creates the necessary database tables. If you need to reset the database:

```bash
# Stop containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up --build
```

## 🔧 Development

### Local Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Start backend server
bun run server:dev
```

### Database Migrations

```bash
# Generate Prisma client
bun run prisma:generate

# Create new migration
bun run prisma migrate dev --name <migration-name>

# Apply migrations
bun run prisma migrate deploy
```

## 🚀 Deployment

### EC2 Deployment

1. **Launch EC2 Instance**
   - Any OS is fine
   - Configure security groups for ports 22, 80, 443, 3000, 5173

2. **Install Docker**
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo usermod -aG docker $USER
   ```

3. **Deploy Application**
   ```bash
   git clone <your-repo-url>
   cd BackendChatApp/vite-project
   
   # Update environment variables for production
   nano .env
   
   # Start the application
   docker-compose up -d --build
   ```

4. **Set up Reverse Proxy (Optional)**
   ```bash
   # Install nginx
   sudo apt install nginx
   
   # Configure nginx to proxy requests to your app
   sudo nano /etc/nginx/sites-available/chat-app
   ```

### Environment Variables

```env
# Database (use your production database)
DB_URL=postgresql://username:password@your-db-host:5432/database_name

# Redis (use your production Redis)
REDIS_URL=redis://your-redis-host:6379

# JWT (use a strong secret)
JWT_SECRET=your-very-long-and-secure-jwt-secret-key

# Server
PORT=3000
NODE_ENV=production
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Chat
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create new room
- `GET /api/messages/:roomId` - Get room messages

### WebSocket Events
- `join` - Join a chat room
- `leave` - Leave a chat room
- `message` - Send a message
- `typing` - User typing indicator

## 🔒 Rate Limiting

The application implements rate limiting with Redis to prevent abuse:

- **Messages**: 10 per minute per user
- **Room Joins**: 5 per minute per user
- **Global IP Limit**: Additional protection

## 🐛 Troubleshooting

### Common Issues

1. **Prisma Client Not Initialized**
   ```bash
   docker exec -it chat_backend bunx prisma generate
   docker-compose restart backend
   ```

2. **Database Connection Issues**
   ```bash
   # Check if PostgreSQL is running
   docker-compose logs postgres
   
   # Verify database tables exist
   docker exec -it chat_postgres psql -U postgres -d chatapp -c "\dt"
   ```

3. **Port Already in Use**
   ```bash
   # Stop all containers
   docker-compose down
   
   # Check for processes using ports
   lsof -i :3000
   lsof -i :5173
   ```

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
docker-compose logs redis
```

## 📁 Project Structure

```
vite-project/
├── app/                    # React frontend
│   ├── components/         # React components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   └── routes/            # React Router routes
├── server/                # Express backend
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   └── services/          # Business logic
├── prisma/                # Database schema and migrations
├── docker-compose.yml     # Docker services configuration
├── Dockerfile             # Backend container definition
├── start-server.sh        # Backend startup script
└── package.json           # Dependencies and scripts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ using React, Express, Socket.IO, and Docker.
