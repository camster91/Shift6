# Shift6

**Shift6** is a modern project management platform designed for agile teams. Streamline task scheduling, enhance team collaboration, and keep projects on track with intelligent automation and real-time updates.

Built with **Node.js** for high-performance server-side operations and scalability.

## Core Features

### Task Scheduling
- **Smart Task Management**: Create, assign, and prioritize tasks with customizable workflows
- **Calendar Integration**: Visual timeline and calendar views for deadline tracking
- **Automated Scheduling**: AI-powered task distribution based on team capacity and priority
- **Recurring Tasks**: Set up repeating tasks with flexible scheduling patterns
- **Dependencies**: Link tasks with dependencies to maintain logical workflow order
- **Time Tracking**: Built-in time logging and estimation tools

### Team Collaboration
- **Real-time Updates**: Live notifications and activity feeds across all team members
- **Discussion Threads**: In-context conversations on tasks and projects
- **File Sharing**: Upload and attach documents, images, and files to tasks
- **@Mentions**: Tag team members for instant notifications and accountability
- **Activity Log**: Complete audit trail of all project changes and updates
- **Team Dashboard**: Centralized view of team workload and progress

## Features

- **Project Workspaces**: Organize work into isolated projects with custom permissions
- **Custom Workflows**: Define task statuses and transitions that match your process
- **Multiple Views**: Kanban boards, list view, calendar, and timeline (Gantt)
- **Advanced Filtering**: Filter and sort tasks by assignee, status, priority, tags, and dates
- **Sprint Planning**: Built-in sprint management for agile teams
- **Reporting & Analytics**: Team velocity, burndown charts, and productivity insights
- **Role-based Permissions**: Granular access control for projects and tasks
- **Custom Fields**: Add custom attributes to tasks for domain-specific needs
- **Tags & Labels**: Organize tasks with flexible tagging system
- **Search**: Full-text search across tasks, comments, and attachments
- **Email Integration**: Create tasks from emails and receive digest notifications
- **REST API**: Full API access for integrations and automation
- **Webhooks**: Real-time event notifications for external systems
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Themes**: Full theme support with user preferences
- **Export/Import**: JSON and CSV export for backup and migration
- **Slack/Teams Integration**: Notifications and updates in your chat tools

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | PostgreSQL, Redis (caching) |
| Authentication | JWT, OAuth 2.0 |
| Real-time | Socket.io |
| Testing | Jest, Supertest |
| Documentation | Swagger/OpenAPI |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+
- Redis 6+ (optional, for caching)

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the project root:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shift6
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# External Services (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-webhook
```

### Database Setup

```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### Development

```bash
npm run dev
```

Opens development server at `http://localhost:3000`

### Build

```bash
npm run build
npm start  # Run production server
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Start production server |
| `npm run build` | Build for production |
| `npm test` | Run tests in watch mode |
| `npm run test:ci` | Run tests once (CI) |
| `npm run migrate` | Run database migrations |
| `npm run migrate:rollback` | Rollback last migration |
| `npm run seed` | Seed database with sample data |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run docs` | Generate API documentation |

## Project Structure

```
src/
├── server.js             # Application entry point
├── app.js                # Express app configuration
├── config/
│   ├── database.js       # Database connection & config
│   ├── redis.js          # Redis client setup
│   └── auth.js           # Authentication strategies
├── routes/
│   ├── api/
│   │   ├── projects.js   # Project management routes
│   │   ├── tasks.js      # Task CRUD operations
│   │   ├── users.js      # User management
│   │   ├── teams.js      # Team collaboration routes
│   │   ├── comments.js   # Comments & discussions
│   │   ├── files.js      # File upload/download
│   │   └── webhooks.js   # Webhook management
│   └── auth.js           # Authentication routes
├── controllers/
│   ├── projectController.js
│   ├── taskController.js
│   ├── userController.js
│   └── ...
├── models/
│   ├── Project.js
│   ├── Task.js
│   ├── User.js
│   ├── Team.js
│   ├── Comment.js
│   └── ...
├── middleware/
│   ├── auth.js           # JWT verification
│   ├── validation.js     # Request validation
│   ├── errorHandler.js   # Error handling
│   ├── rateLimiter.js    # Rate limiting
│   └── upload.js         # File upload handling
├── services/
│   ├── taskScheduler.js  # Task scheduling logic
│   ├── notificationService.js
│   ├── emailService.js
│   ├── searchService.js
│   └── analyticsService.js
├── utils/
│   ├── logger.js         # Winston logging
│   ├── validators.js     # Input validation schemas
│   ├── helpers.js        # Utility functions
│   └── constants.js      # App constants
├── database/
│   ├── migrations/       # Database migrations
│   └── seeds/            # Seed data
└── tests/
    ├── unit/             # Unit tests
    ├── integration/      # Integration tests
    └── fixtures/         # Test data
```

## API Documentation

Full API documentation is available at `/api-docs` when running the server.

### Key Endpoints

```
POST   /api/auth/login              # User login
POST   /api/auth/register           # User registration

GET    /api/projects                # List projects
POST   /api/projects                # Create project
GET    /api/projects/:id            # Get project details
PUT    /api/projects/:id            # Update project
DELETE /api/projects/:id            # Delete project

GET    /api/tasks                   # List tasks (with filters)
POST   /api/tasks                   # Create task
GET    /api/tasks/:id               # Get task details
PUT    /api/tasks/:id               # Update task
DELETE /api/tasks/:id               # Delete task

POST   /api/tasks/:id/comments      # Add comment to task
GET    /api/tasks/:id/comments      # Get task comments

POST   /api/tasks/:id/attachments   # Upload file to task
GET    /api/files/:id               # Download file

GET    /api/teams/:id/members       # Get team members
POST   /api/teams/:id/members       # Add team member
```

## Security

- **Authentication**: JWT-based authentication with secure token storage
- **Authorization**: Role-based access control (RBAC) for all resources
- **Password Security**: Bcrypt hashing with salt rounds
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Protection**: Parameterized queries via ORM
- **XSS Protection**: Content Security Policy headers
- **CORS**: Configurable CORS for API access
- **HTTPS**: TLS/SSL encryption in production
- **Audit Logging**: All critical actions logged for compliance

## Testing

```bash
npm test              # Run all tests in watch mode
npm run test:ci       # Single run for CI/CD
npm run test:coverage # Generate coverage report
```

Test coverage includes:
- Unit tests for all models and services
- Integration tests for API endpoints
- Authentication and authorization flows
- Task scheduling and notification logic
- File upload and validation
- Database operations and transactions

## Deployment

### Docker

```bash
# Build image
docker build -t shift6:latest .

# Run with docker-compose
docker-compose up -d
```

### Cloud Platforms

**Environment Variables Required:**
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `NODE_ENV=production`

**Build Command:** `npm run build`

**Start Command:** `npm start`

**Port:** `3000` (configurable via `PORT` env var)

### Database Migrations

Always run migrations before starting the server in production:

```bash
npm run migrate
```

## Roadmap

### Planned Features

- **Mobile Apps**: Native iOS and Android applications
- **Gantt Charts**: Advanced timeline visualization for project planning
- **Resource Management**: Team capacity planning and resource allocation
- **Budget Tracking**: Cost tracking and budget management per project
- **Advanced Reporting**: Custom report builder with export options
- **Template Library**: Pre-built project templates for common workflows
- **Automation Rules**: If-this-then-that automation for repetitive tasks
- **Two-factor Authentication**: Enhanced security with 2FA
- **SSO Integration**: SAML/OAuth SSO for enterprise customers
- **Advanced Integrations**: Jira, Asana, GitHub, GitLab, Trello sync

### Technical Improvements

- [ ] Add TypeScript for type safety
- [ ] Implement GraphQL API alongside REST
- [ ] Add horizontal scaling with load balancer
- [ ] Implement full-text search with Elasticsearch
- [ ] Add real-time collaboration (live cursors, presence)
- [ ] Implement event sourcing for audit trail
- [ ] Add CDC (Change Data Capture) for real-time sync
- [ ] Migrate to microservices architecture

## Contributing

This is private software. Access is restricted to authorized team members only.

For internal contributors:
1. Create a feature branch from `main`
2. Follow the code style guide (ESLint rules)
3. Write tests for new features
4. Submit a pull request with description
5. Ensure CI/CD pipeline passes

## License

**Private** - All rights reserved. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---

**Shift6** - Streamline your team's workflow, one task at a time.
