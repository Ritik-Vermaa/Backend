import { asyncHandler } from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { username, email, fullname, password } = req.body;

    if(
        [fullname , email , username , password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required");
    }

    //user already exists
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if(existedUser){
        throw new ApiError(409, "User already exists");
    }

    // check for avatar and coverImage
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath ){
        throw new ApiError(400, "Avatar is required");
    }

    // upload avatar and coverImage to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
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

    if(!cretedUser){
        throw new ApiError(500, "Failed to create user");
    }

    // send response to frontend
    return res.status(201).json(new ApiResponse(201, cretedUser, "User created successfully"));

});

export { registerUser };