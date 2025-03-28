import dotenv from "dotenv";
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path: './env'
});

const PORT = 8050;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✅ Server is running on port: ${PORT}`);
        });
    })
    .catch((err) => {
        console.log("❌ MONGO DB CONNECTION FAILED!!!", err);
    });
