import express from "express";
import { getUser, login, logout, register, updatePassword, updateProfile, uploadResume } from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", uploadResume, register);
router.post("/login", login);
router.get("/logout", isAuthenticated, logout);
router.get("/getuser", isAuthenticated, getUser);
router.put("/update/profile", uploadResume, isAuthenticated, updateProfile);
router.put("/update/password", isAuthenticated, updatePassword);

export default router