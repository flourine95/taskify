# Taskify - Personal Task Management Application

Taskify is a modern, intuitive task management application built with Next.js and Redis Upstash, designed to help individuals organize and track their tasks efficiently.

## 🚀 Features

- **Task Management**
  - Create, update, and delete tasks
  - Organize tasks by status (Todo, In Progress, Done)
  - Drag-and-drop task reordering
  - Real-time updates

- **Modern UI/UX**
  - Clean and intuitive interface
  - Responsive design
  - Dark/Light mode support
  - Smooth animations

## 🛠️ Tech Stack

- **Frontend**
  - Next.js 14 (App Router)
  - TypeScript
  - Tailwind CSS
  - Shadcn UI Components
  - React DnD for drag-and-drop

- **Backend**
  - Next.js API Routes
  - Redis Upstash for data storage
  - TypeScript

## 📦 Project Structure

```
web/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── public/             # Static assets
├── styles/             # Global styles
└── types/              # TypeScript type definitions
```

## 🚀 Getting Started

1. **Prerequisites**
   - Node.js 18+ 
   - pnpm package manager
   - Redis Upstash account

2. **Installation**
   ```bash
   # Clone the repository
   git clone https://github.com/flourine95/taskify.git
   cd taskify

   # Install dependencies
   cd web
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the web directory with:
   ```
   UPSTASH_REDIS_REST_URL=your_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_redis_token
   ```

4. **Development**
   ```bash
   pnpm dev
   ```
   The application will be available at `http://localhost:3000`

## 🔧 Key Components

### Task Management
- `TaskCard`: Individual task component with drag-and-drop support
- `TaskList`: Container for tasks in each status column
- `TaskBoard`: Main board component managing task organization

### State Management
- Custom hooks for task operations
- Redis Upstash integration for persistent storage
- Real-time updates using optimistic UI

## 🎨 UI Components

The application uses Shadcn UI components for a consistent and modern look:
- Cards for task display
- Buttons for actions
- Input fields for task creation/editing
- Dropdown menus for task status
- Toast notifications for feedback

## 🔐 Data Flow

1. **Task Creation**
   - User input → Form validation → API call → Redis storage → UI update

2. **Task Update**
   - Status change → API call → Redis update → UI refresh

3. **Task Deletion**
   - Delete action → API call → Redis removal → UI update

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by Trello's task management system
- Built with modern web technologies
- Special thanks to the Next.js and Redis Upstash communities
