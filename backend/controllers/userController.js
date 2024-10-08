import {
    catchAsyncErrors
} from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import {
    User
} from "../models/userSchema.js";
import {
    v2 as cloundinary
} from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { sendToken } from "../utils/jwtToken.js";


const storage = new CloudinaryStorage({
    cloudinary: cloundinary,
    params: {
        folder: 'Job_Seekers_Resume',
        resource_type: 'auto',
        public_id: (req, file) => file.originalname.split('.')[0],
    },
});

const upload = multer({ storage: storage });

export const register = catchAsyncErrors(async (req, res, next) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            password,
            role,
            firstNiche,
            secondNiche,
            thirdNiche,
            coverLetter,
        } = req.body;

        if (!name || !email || !phone || !address || !password || !role) {
            return next(new ErrorHandler("All fileds are required.", 400));
        }
        if (role === "Job Seeker" && (!firstNiche || !secondNiche || !thirdNiche)) {
            return next(
                new ErrorHandler("Please provide your preferred job niches.", 400)
            );
        }
        const existingUser = await User.findOne({email});
        if (existingUser) {
            return next(new ErrorHandler("Email is already registered.", 400));
        }
        const userData = {
            name,
            email,
            phone,
            address,
            password,
            role,
            niches:{
                firstNiche,
                secondNiche,
                thirdNiche,
            },
            coverLetter,
        };
        if (req.file) {  // Multer places the uploaded file in req.file
            try {
                userData.resume = {
                    public_id: req.file.filename,
                    url: req.file.path,
                };
            } catch (error) {
                return next(new ErrorHandler("Failed to upload resume.", 500));
            }
        }

        const user = await User.create(userData);
        sendToken(user, 201, res, "User Registered.")

    } catch (error) {
        next(error);
    }
});

// Route to handle file upload with multer middleware
export const uploadResume = upload.single('resume');

export const login = catchAsyncErrors(async(req, res, next) => {
    const { role, email, password } = req.body;
    if (!role || !email || !password) {
        return next(new ErrorHandler("Email, Password and role are required.", 400));
    };
    const user = await User.findOne({ email }).select("+password");
    if(!user){
        return next(new ErrorHandler("Invalid email or password", 400))
    };
    const isPasswordMatched = await user.comparePassword(password);
    if(!isPasswordMatched){
        return next(new ErrorHandler("Invalid email or password.", 400))
    }
    if(user.role !== role){
        return next(new ErrorHandler("Invalid user role.", 400))
    }
    sendToken(user, 201, res, "User loggged in successfully.")
});
export const logout = catchAsyncErrors(async(req, res, next) => {
    res.status(200).cookie("token", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
    }).json({
        success: true,
        message: "Logged out successfully."
    });
});

export const getUser = catchAsyncErrors(async(req, res, next) => {
    const user = req.user;
    res.status(200).json({
        success: true,
        user,
    });
});
export const updateProfile = catchAsyncErrors(async(req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        coverLetter: req.body.coverLetter,
        niches:{
            firstNiche: req.body.firstNiche,
            secondNiche: req.body.secondNiche,
            thirdNiche: req.body.thirdNiche,
        }
    }
    const { firstNiche, secondNiche, thirdNiche } = newUserData.niches;

  if (
    req.user.role === "Job Seeker" &&
    (!firstNiche || !secondNiche || !thirdNiche)
  ) {
    return next(
      new ErrorHandler("Please provide your all preferred job niches.", 400)
    );
  }
  try {
    const newUserData = { ...req.body };

    if (req.file) {  // Multer stores the uploaded file in req.file
        // Check if the user already has a resume and delete the old one from Cloudinary
        const currentResumeId = req.user.resume?.public_id;
        if (currentResumeId) {
            await cloundinary.uploader.destroy(currentResumeId);
        }

        // Since the file is already uploaded to Cloudinary by Multer, we just use the data
        newUserData.resume = {
            public_id: req.file.filename,
            url: req.file.path,
        };
    }

    // Update the user in the database
    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    // Send the response
    res.status(200).json({
        success: true,
        user,
        message: "Profile updated.",
    });
} catch (error) {
    next(error);
}
});
export const updatePassword = catchAsyncErrors(async(req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");
    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
    if(!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect", 400));
    }
    if(req.body.newPassword !== req.body.confirmPassword){
        return next(new ErrorHandler("New password and confirm password do not match.", 400));
    }
    user.password = req.body.newPassword;
    await user.save();
    sendToken(user, 200, res, "Password updated successfully")
})
