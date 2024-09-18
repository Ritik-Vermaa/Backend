import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Failed to generate tokens");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { username, email, fullname, password } = req.body;

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    //user already exists
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    // check for avatar and coverImage
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath =  req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;

    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    // upload avatar and coverImage to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Failed to upload avatar");
    }

    // create user in database
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullname,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const cretedUser = await User.findById(user._id).select("-password -refreshToken");

    if (!cretedUser) {
        throw new ApiError(500, "Failed to create user");
    }

    // send response to frontend
    return res.status(201).json(new ApiResponse(201, cretedUser, "User created successfully"));

});

const loginUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // username or email and password
    // find user in database
    // password check
    // access token and refresh token generation
    // send cookies to frontend

    const { username, email, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordMatch = await user.isPasswordCorrect(password);

    if (!isPasswordMatch) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const option = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, option)
        .cookie("accessToken", accessToken, option)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken
                },
                "User logged in successfully"
            )
        );

});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, 
        {
         $set:{
            refreshToken: undefined
         }
        },
        {
            new:true
        }
    );

    const option ={
        httpOnly:true,
        secure:true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(
        new ApiResponse(
            200, 
            {}, 
            "User logged out successfully"
        )
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
   try {
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
 
     if(!incomingRefreshToken){
         throw new ApiError(400, "unauthorized request"); 
     }
 
     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);    
 
     const user = await User.findById(decodedToken?._id);
 
     if(!user){
         throw new ApiError(404, "Invalid Refresh Token");
     }
 
     if(user?.refreshToken !== incomingRefreshToken){
         throw new ApiError(400, "Refresh token is invalid");
     }
 
     const options = {
         httpOnly:true,
         secure:true,
     }
 
     const {accessToken , newRefreshToken } = await generateAccessAndRefreshToken(user._id)
 
     return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newRefreshToken, options)
     .json(
         new ApiResponse(
             200, 
             {accessToken , refreshToken:newRefreshToken},
             "Access token refreshed successfully"
         )
     );
   } catch (error) {
     throw new ApiError(401, error?.message || "Unauthorized");
   }
    
});

export { registerUser, loginUser , logoutUser , refreshAccessToken };