const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const swaggerOptions = require('./swagger.json');
const app = express();
const db = require('./models');

// Swagger
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API Routes
const authRouter = require('./routes/authRoutes');
const profileRouter = require('./routes/profileRoutes');
const foodItemsRouter = require('./routes/foodItemsRoutes');
const foodCategoriesRouter = require('./routes/foodCategoriesRoutes');
const nearbyRestaurantRouter = require('./routes/nearbyRestaurantRoutes');
const resetPasswordRouter = require('./routes/resetPasswordRoutes');

const walletRouter = require('./routes/walletRoutes');
const transactionRouter = require('./routes/transactionRoutes');
const { handleStripeWebhook } = require('./controllers/walletController');
const { protect } = require('./middlewares/authorization');

const orderRouter = require('./routes/orderRoutes');

const PORT = process.env.PORT || 3000;


// Handle Stripe Webhook
app.use('/api/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Configure CORS
const allowedOrigins = [
  process.env.FRONTEND_PROD_URL,
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('render.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes

// Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/fooditems', foodItemsRouter);
app.use('/api/foodCategories', foodCategoriesRouter);
app.use('/api/nearbyrestaurants', nearbyRestaurantRouter);
app.use('/api/resetpassword', resetPasswordRouter);
app.use('/api/wallets', protect, walletRouter);
app.use('/api/transactions', protect, transactionRouter);
app.use('/api/order', orderRouter);

// Sync database
db.sequelize.sync().then(() => {
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Welcome to Hungry Hippo API. To see the documentation, go to http://localhost:3000/api/docs . To see it on the deployed server, go to https://hungryhippo.onrender.com/api/docs',
    });
  });

  // Start the server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to sync database:', err);
});
