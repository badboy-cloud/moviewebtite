const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB successfully!');
        console.log('📊 Database:', client.db().databaseName);
        return client.db();
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.static('.')); // Serve static HTML/CSS/JS files

// API Routes

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const db = client.db();
        const { fullname, email, password } = req.body;
        
        // Validate password length
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
        }
        
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }
        
        // Insert new user (Note: In production, hash the password!)
        const result = await db.collection('users').insertOne({
            fullname,
            email,
            password, // In production, use bcrypt to hash this
            createdAt: new Date()
        });
        
        res.json({ success: true, message: 'Registration successful', userId: result.insertedId });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const db = client.db();
        const { email, password } = req.body;
        
        // Find user
        const user = await db.collection('users').findOne({ email, password });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        res.json({ success: true, message: 'Login successful', user: { fullname: user.fullname, email: user.email } });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Get all movies
app.get('/api/movies', async (req, res) => {
    try {
        const db = client.db();
        const movies = await db.collection('movies').find({}).toArray();
        res.json(movies);
    } catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

// Get movie by ID
app.get('/api/movies/:id', async (req, res) => {
    try {
        const db = client.db();
        const { ObjectId } = require('mongodb');
        const movie = await db.collection('movies').findOne({ _id: new ObjectId(req.params.id) });
        
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        
        res.json(movie);
    } catch (error) {
        console.error('Error fetching movie:', error);
        res.status(500).json({ error: 'Failed to fetch movie' });
    }
});

// Add new movie
app.post('/api/movies', async (req, res) => {
    try {
        const db = client.db();
        const result = await db.collection('movies').insertOne(req.body);
        res.status(201).json({ 
            message: 'Movie added successfully', 
            movieId: result.insertedId 
        });
    } catch (error) {
        console.error('Error adding movie:', error);
        res.status(500).json({ error: 'Failed to add movie' });
    }
});

// Get movies by genre
app.get('/api/movies/genre/:genre', async (req, res) => {
    try {
        const db = client.db();
        const movies = await db.collection('movies')
            .find({ genre: req.params.genre })
            .toArray();
        res.json(movies);
    } catch (error) {
        console.error('Error fetching movies by genre:', error);
        res.status(500).json({ error: 'Failed to fetch movies by genre' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await client.db().admin().ping();
        res.json({ status: 'ok', message: 'MongoDB connection is healthy' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'MongoDB connection failed' });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await client.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
