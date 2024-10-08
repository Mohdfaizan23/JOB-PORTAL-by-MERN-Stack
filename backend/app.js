import express from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connection } from "./database/connection.js";
import userRouter from "./Routes/userRouter.js"
import jobRouter from "./Routes/jobRouter.js"
import applicationRouter from "./Routes/applicationRouter.js"
import { newsLetterCron } from "./automation/newsLetterCron.js";

const app = express();
config({path:"./config/.env"})

app.use(cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }))


app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);

newsLetterCron();
connection();

export default app;