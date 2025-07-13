# Cleaning Service Backend API

A comprehensive Node.js/Express backend API for a cleaning service application with MongoDB integration.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Booking Management**: Complete booking lifecycle management
- **Service Management**: CRUD operations for cleaning services
- **User Management**: Customer and staff user management
- **Email Notifications**: Automated email notifications for bookings
- **File Uploads**: Image upload support with Cloudinary integration
- **Rate Limiting**: API rate limiting for security
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Centralized error handling
- **Security**: Helmet, CORS, and other security middleware
- **Logging**: Request logging with Morgan
- **Database**: MongoDB with Mongoose ODM

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/cleaning-service
   JWT_SECRET=your-super-secret-jwt-key
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | User login | Public |
| POST | `/auth/logout` | User logout | Private |
| GET | `/auth/me` | Get current user | Private |
| POST | `/auth/forgot-password` | Request password reset | Public |
| PATCH | `/auth/reset-password/:token` | Reset password | Public |
| PATCH | `/auth/update-password` | Update password | Private |

### Booking Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/bookings` | Create booking | Public |
| GET | `/bookings` | Get all bookings | Admin/Staff |
| GET | `/bookings/:id` | Get booking by ID | Private |
| PATCH | `/bookings/:id` | Update booking | Admin/Staff |
| DELETE | `/bookings/:id` | Delete booking | Admin |
| GET | `/bookings/my-bookings` | Get user's bookings | Private |
| PATCH | `/bookings/:id/cancel` | Cancel booking | Private |
| PATCH | `/bookings/:id/reschedule` | Reschedule booking | Private |
| POST | `/bookings/:id/feedback` | Add feedback | Private |

### Service Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/services` | Get all services | Public |
| GET | `/services/:id` | Get service by ID | Public |
| GET | `/services/featured` | Get featured services | Public |
| GET | `/services/category/:category` | Get services by category | Public |
| POST | `/services` | Create service | Admin |
| PATCH | `/services/:id` | Update service | Admin |
| DELETE | `/services/:id` | Delete service | Admin |

### User Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/users/profile` | Get user profile | Private |
| PATCH | `/users/profile` | Update profile | Private |
| PATCH | `/users/preferences` | Update preferences | Private |
| DELETE | `/users/account` | Delete account | Private |

## 🗄️ Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  phone: String,
  password: String (hashed),
  role: ['customer', 'admin', 'staff'],
  address: Object,
  preferences: Object,
  isActive: Boolean,
  isEmailVerified: Boolean,
  timestamps: true
}
```

### Booking Model
```javascript
{
  bookingNumber: String (unique),
  customer: ObjectId (User),
  guestInfo: Object,
  serviceType: String,
  packageType: String,
  address: Object,
  scheduledDate: Date,
  scheduledTime: String,
  status: String,
  pricing: Object,
  payment: Object,
  notes: Object,
  feedback: Object,
  timestamps: true
}
```

### Service Model
```javascript
{
  name: String,
  slug: String (unique),
  category: String,
  description: Object,
  features: Array,
  pricing: Object,
  packages: Array,
  availability: Object,
  isActive: Boolean,
  timestamps: true
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password encryption
- **Rate Limiting**: Express rate limit middleware
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **Input Validation**: Express-validator for request validation
- **Account Lockout**: Protection against brute force attacks

## 📧 Email Templates

The system includes email templates for:
- Booking confirmations
- Booking reminders
- Password reset
- Email verification
- Booking status updates

## 🚦 Error Handling

Centralized error handling with:
- Custom error response class
- Mongoose error handling
- JWT error handling
- Validation error formatting
- Development vs production error responses

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 Logging

- Development: Detailed console logging
- Production: Combined format logging
- Error logging for debugging

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| NODE_ENV | Environment (development/production) | Yes |
| PORT | Server port | No (default: 5000) |
| MONGODB_URI | MongoDB connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| JWT_EXPIRE | JWT expiration time | No (default: 7d) |
| EMAIL_HOST | SMTP host | Yes |
| EMAIL_USER | SMTP username | Yes |
| EMAIL_PASS | SMTP password | Yes |
| FRONTEND_URL | Frontend application URL | Yes |

## 🚀 Deployment

### Production Setup

1. Set environment variables
2. Install dependencies: `npm ci --only=production`
3. Start application: `npm start`

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📊 Monitoring

- Health check endpoint: `/health`
- API documentation: `/api/v1/docs`
- System stats: `/api/v1/admin/dashboard`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@cleaningservice.com or create an issue in the repository.
